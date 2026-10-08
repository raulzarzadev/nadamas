import 'server-only'
import type { AdditionalProfile } from '@/lib/additional-profile'
import { ensureAthleteIdentity } from './athlete-identities'
import { adminDb } from './firebase-admin'

export async function listAdditionalProfiles(ownerId: string) {
  const snapshot = await adminDb
    .collection('additionalProfiles')
    .where('ownerId', '==', ownerId)
    .get()
  return snapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as AdditionalProfile)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getAdditionalProfile(ownerId: string, id: string) {
  if (!id || id.includes('/')) return null
  const snapshot = await adminDb.collection('additionalProfiles').doc(id).get()
  if (!snapshot.exists || snapshot.data()?.ownerId !== ownerId) return null
  return { ...snapshot.data(), id: snapshot.id } as AdditionalProfile
}

export async function createAdditionalProfile(
  ownerId: string,
  values: Pick<AdditionalProfile, 'name' | 'birthDate' | 'gender'>
) {
  const ref = adminDb.collection('additionalProfiles').doc()
  const now = Date.now()
  const profile: AdditionalProfile = {
    ...values,
    id: ref.id,
    ownerId,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(profile)
  await ensureAthleteIdentity('additional', ref.id)
  return profile
}

export async function updateAdditionalProfile(
  ownerId: string,
  id: string,
  values: Pick<AdditionalProfile, 'name' | 'birthDate' | 'gender'>
) {
  if (!id || id.includes('/')) return null
  const ref = adminDb.collection('additionalProfiles').doc(id)
  const snapshot = await ref.get()
  if (!snapshot.exists || snapshot.data()?.ownerId !== ownerId) return null
  const updatedAt = Date.now()
  await ref.update({ ...values, updatedAt })
  return { ...snapshot.data(), ...values, id: snapshot.id, updatedAt } as AdditionalProfile
}
