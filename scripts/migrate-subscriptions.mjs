/** Dry-run by default. Existing schools receive a trial from the announced rollout timestamp. */
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const production = args.includes('--production')
const startArg = args.find((arg) => arg.startsWith('--starts-at='))?.slice('--starts-at='.length)
const startsAt = Date.parse(startArg || '')
if (!Number.isFinite(startsAt)) throw new Error('Provide --starts-at=<announced ISO timestamp>')
if (apply && !process.env.FIRESTORE_EMULATOR_HOST && !production)
  throw new Error('Production writes require --production --apply')
const account = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : null
const app =
  getApps()[0] ||
  initializeApp(
    account
      ? { credential: cert({ ...account, private_key: account.private_key.replace(/\\n/g, '\n') }) }
      : { projectId: process.env.GCLOUD_PROJECT || 'nadamas-b1ecf' }
  )
const db = getFirestore(app)
const schools = await db.collection('schools').get()
let created = 0
let existing = 0
let limited = 0
// Stable sort means a legacy owner receives the trial on their oldest school only.
const sorted = schools.docs.sort(
  (a, b) => (a.data().createdAt || 0) - (b.data().createdAt || 0) || a.id.localeCompare(b.id)
)
const seenOwners = new Set()
for (const school of sorted) {
  const ownerId = school.data().createdBy || school.data().directorId
  if (typeof ownerId !== 'string' || !ownerId) throw new Error(`School missing owner: ${school.id}`)
  const subRef = db.collection('schoolSubscriptions').doc(school.id)
  const markerRef = db.collection('subscriptionTrialOwners').doc(ownerId)
  if (!apply) {
    const [sub, marker] = await Promise.all([subRef.get(), markerRef.get()])
    if (sub.exists) {
      existing++
      seenOwners.add(ownerId)
      continue
    }
    if (marker.exists || seenOwners.has(ownerId)) limited++
    created++
    seenOwners.add(ownerId)
    continue
  }
  const outcome = await db.runTransaction(async (tx) => {
    const [sub, marker] = await tx.getAll(subRef, markerRef)
    if (sub.exists) {
      if (!marker.exists)
        tx.create(markerRef, {
          ownerId,
          schoolId: school.id,
          usedAt: sub.data().trialStartedAt || sub.data().createdAt || startsAt,
          migration: 'subscription-rollout-v1',
        })
      return 'existing'
    }
    const trial = !marker.exists
    tx.create(subRef, {
      schoolId: school.id,
      ownerId,
      trialStartedAt: trial ? startsAt : null,
      trialEndsAt: trial ? startsAt + 15 * 86400000 : null,
      periodStartedAt: null,
      periodEndsAt: null,
      cancelAtPeriodEnd: false,
      promotionalCodeId: null,
      promotionalGrantedAt: null,
      pendingOrderId: null,
      provisionalOrderId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      migration: 'subscription-rollout-v1',
    })
    if (trial)
      tx.create(markerRef, {
        ownerId,
        schoolId: school.id,
        usedAt: startsAt,
        migration: 'subscription-rollout-v1',
      })
    tx.create(db.collection('subscriptionAudit').doc(), {
      action: 'legacy_school_migrated',
      schoolId: school.id,
      actorId: 'migration',
      createdAt: Date.now(),
      trial,
      startsAt,
    })
    return trial ? 'trial' : 'limited'
  })
  if (outcome === 'existing') existing++
  else {
    created++
    if (outcome === 'limited') limited++
  }
}
console.log(
  JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    startsAt: new Date(startsAt).toISOString(),
    created,
    existing,
    withoutTrial: limited,
  })
)
