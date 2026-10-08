import 'server-only'
import { randomBytes, randomInt } from 'node:crypto'
import type {
  AthleteCredential,
  AthleteIdentity,
  IdentityProfileType,
} from '@/lib/athlete-identity'
import { adminAuth, adminDb } from './firebase-admin'

// Canonical records and indexes live below a server-only document, outside the
// permissive legacy collection rules. Never trust IDs written on user profiles.
const registry = () => adminDb.collection('athleteIdentityRegistry').doc('v1')
const identityRef = (type: IdentityProfileType, id: string) =>
  registry().collection('profiles').doc(`${type}_${id}`)
const profileRef = (type: IdentityProfileType, id: string) =>
  adminDb.collection(type === 'user' ? 'users' : 'additionalProfiles').doc(id)

export async function ensureAthleteIdentity(
  profileType: IdentityProfileType,
  profileId: string
): Promise<AthleteIdentity> {
  if (!profileId || profileId.includes('/') || !['user', 'additional'].includes(profileType))
    throw new Error('INVALID_IDENTITY_PROFILE')
  const ref = identityRef(profileType, profileId)
  for (let attempt = 0; attempt < 100; attempt++) {
    const numericId = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const qrToken = randomBytes(32).toString('hex')
    const result = await adminDb.runTransaction(async (tx) => {
      const current = await tx.get(ref)
      if (current.exists) return current.data() as AthleteIdentity
      const source = await tx.get(profileRef(profileType, profileId))
      if (!source.exists) throw new Error('IDENTITY_PROFILE_NOT_FOUND')
      const numberRef = registry().collection('numbers').doc(numericId)
      const tokenRef = registry().collection('tokens').doc(qrToken)
      const [number, token] = await Promise.all([tx.get(numberRef), tx.get(tokenRef)])
      if (number.exists || token.exists) return null
      const identity: AthleteIdentity = {
        profileId,
        profileType,
        numericId,
        qrToken,
        createdAt: Date.now(),
      }
      tx.create(ref, identity)
      tx.create(numberRef, { profileId, profileType })
      tx.create(tokenRef, { profileId, profileType })
      return identity
    })
    if (result) return result
  }
  throw new Error('IDENTITY_ID_ALLOCATION_FAILED')
}

export async function findAthleteIdentity(input: {
  numericId?: string
  qrToken?: string
}): Promise<AthleteIdentity | null> {
  const key = input.qrToken || input.numericId || ''
  if (input.qrToken ? !/^[a-f0-9]{64}$/.test(key) : !/^\d{6}$/.test(key)) return null
  const index = await registry()
    .collection(input.qrToken ? 'tokens' : 'numbers')
    .doc(key)
    .get()
  if (!index.exists) return null
  const pointer = index.data()
  if (!pointer || !['user', 'additional'].includes(pointer.profileType)) return null
  const identity = await identityRef(pointer.profileType, pointer.profileId).get()
  if (!identity.exists) return null
  const record = identity.data() as AthleteIdentity
  return (input.qrToken ? record.qrToken : record.numericId) === key ? record : null
}

export async function getIdentityProfile(
  identity: AthleteIdentity
): Promise<AthleteCredential | null> {
  const profile = await profileRef(identity.profileType, identity.profileId).get()
  if (!profile.exists) return null
  const data = profile.data() || {}
  return {
    ...identity,
    name:
      [data.nickname, data.displayName, data.name, data.profile?.name]
        .find((value) => typeof value === 'string' && value.trim())
        ?.trim() || 'Atleta',
    ...(typeof data.photoURL === 'string' ? { photoURL: data.photoURL } : {}),
    ...(typeof data.birthDate === 'string' ? { birthDate: data.birthDate } : {}),
    ...(typeof data.gender === 'string' ? { gender: data.gender } : {}),
  }
}

export async function ownsIdentityProfile(
  ownerId: string,
  profileType: IdentityProfileType,
  profileId: string
) {
  if (!profileId || profileId.includes('/')) return false
  const profile = await profileRef(profileType, profileId).get()
  return (
    profile.exists &&
    (profileType === 'user' ? ownerId === profileId : profile.data()?.ownerId === ownerId)
  )
}

export async function rotateAthleteCredential(
  ownerId: string,
  profileType: IdentityProfileType,
  profileId: string
) {
  if (!(await ownsIdentityProfile(ownerId, profileType, profileId))) return null
  await ensureAthleteIdentity(profileType, profileId)
  const ref = identityRef(profileType, profileId)
  const qrToken = randomBytes(32).toString('hex')
  return adminDb.runTransaction(async (tx) => {
    const [current, profile, newToken] = await Promise.all([
      tx.get(ref),
      tx.get(profileRef(profileType, profileId)),
      tx.get(registry().collection('tokens').doc(qrToken)),
    ])
    if (
      !profile.exists ||
      (profileType === 'additional' && profile.data()?.ownerId !== ownerId) ||
      newToken.exists
    )
      return null
    const identity = current.data() as AthleteIdentity
    const updated = { ...identity, qrToken, rotatedAt: Date.now() }
    tx.delete(registry().collection('tokens').doc(identity.qrToken))
    tx.create(registry().collection('tokens').doc(qrToken), { profileId, profileType })
    tx.set(ref, updated)
    return updated
  })
}

export async function listOwnedCredentials(ownerId: string) {
  // A Google session can reach this endpoint before its client profile write.
  // Create only the caller's own missing profile, with trusted Auth metadata.
  const ownerRef = profileRef('user', ownerId)
  if (!(await ownerRef.get()).exists) {
    const account = await adminAuth.getUser(ownerId)
    await adminDb.runTransaction(async (tx) => {
      if ((await tx.get(ownerRef)).exists) return
      tx.create(ownerRef, {
        id: ownerId,
        displayName: account.displayName || 'Atleta',
        email: account.email || '',
        photoURL: account.photoURL || '',
        roles: { athlete: true, coach: false, admin: false },
        createdAt: Date.now(),
      })
    })
  }
  const profiles = await adminDb
    .collection('additionalProfiles')
    .where('ownerId', '==', ownerId)
    .get()
  const identities = await Promise.all([
    ensureAthleteIdentity('user', ownerId),
    ...profiles.docs.map((doc) => ensureAthleteIdentity('additional', doc.id)),
  ])
  const credentials = await Promise.all(identities.map(getIdentityProfile))
  return credentials.filter((credential): credential is AthleteCredential => credential !== null)
}
