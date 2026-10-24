import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import type {
  TrainingPlanSummary,
  TrainingPlanVisibility,
} from '@/firebase/training-plans/training-plan.model'
import { publicNameFromUser } from '@/lib/public-name'
import { decodeTrainingCycles, type StoredTrainingCycle } from '@/lib/training-plan-storage'
import { buildTrainingPlanSummary } from '@/lib/training-plan-summary'
import type { TrainingCycle } from '@/lib/training-planner'
import { adminDb } from './firebase-admin'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const plans = () => adminDb.collection('trainingPlans')
const subscriptions = () => adminDb.collection('trainingPlanSubscriptions')
const invites = () => adminDb.collection('trainingPlanInvites')

type StoredPlan = {
  userId?: string
  cycles?: StoredTrainingCycle[]
  visibility?: TrainingPlanVisibility
  summary?: TrainingPlanSummary
  subscriberCount?: number
}

export type PlanPreview = {
  id: string
  ownerId: string
  summary: TrainingPlanSummary
  subscriberCount: number
  visibility: TrainingPlanVisibility
  cycles: TrainingCycle[]
  isOwner: boolean
  isSubscribed: boolean
}

export const subscriptionId = (planId: string, uid: string) => `${planId}_${uid}`

/** Firestore ids we accept from URLs; rejects path separators and oversized input. */
export const isValidDocId = (value: string) => /^[\w-]{1,128}$/.test(value)

const visibilityOf = (plan: StoredPlan): TrainingPlanVisibility =>
  plan.visibility === 'public' ? 'public' : 'private'

async function inviteMatches(planId: string, invite?: string) {
  if (!invite || !/^[\w-]{43}$/.test(invite)) return false
  const stored = (await invites().doc(planId).get()).data()?.tokenHash
  if (typeof stored !== 'string' || stored.length !== 64) return false
  return timingSafeEqual(Buffer.from(stored), Buffer.from(hash(invite)))
}

export async function getPlanPreview(
  planId: string,
  uid: string,
  invite?: string
): Promise<PlanPreview | null> {
  if (!isValidDocId(planId)) return null
  const [planSnap, subSnap] = await Promise.all([
    plans().doc(planId).get(),
    subscriptions().doc(subscriptionId(planId, uid)).get(),
  ])
  const plan = planSnap.data() as StoredPlan | undefined
  if (!plan) return null
  const visibility = visibilityOf(plan)
  const isOwner = plan.userId === uid
  const isSubscribed = subSnap.exists
  if (
    visibility === 'private' &&
    !isOwner &&
    !isSubscribed &&
    !(await inviteMatches(planId, invite))
  )
    return null
  const cycles = decodeTrainingCycles(plan.cycles || [])
  return {
    id: planId,
    ownerId: plan.userId || '',
    summary:
      plan.summary || buildTrainingPlanSummary(cycles, { name: '', photo: '', role: 'coach' }),
    subscriberCount: Math.max(0, plan.subscriberCount || 0),
    visibility,
    cycles,
    isOwner,
    isSubscribed,
  }
}

/**
 * Title and author for a shared link's preview card (chat apps fetch it signed out).
 * Only public plans, or private ones opened with the current invite token, reveal details.
 */
export async function getPlanShareMeta(
  planId: string,
  invite?: string
): Promise<{ title: string; authorName: string } | null> {
  if (!isValidDocId(planId)) return null
  const plan = (await plans().doc(planId).get()).data() as StoredPlan | undefined
  if (!plan) return null
  if (visibilityOf(plan) === 'private' && !(await inviteMatches(planId, invite))) return null
  return { title: plan.summary?.title || '', authorName: plan.summary?.authorName || '' }
}

export async function subscribe(
  planId: string,
  uid: string,
  subscriber: { name: string; photo: string },
  invite?: string
): Promise<void> {
  if (!isValidDocId(planId)) throw new Error('FORBIDDEN')
  // Verify the token outside the transaction; the invite doc is not part of the write set.
  const validInvite = await inviteMatches(planId, invite)
  const planRef = plans().doc(planId)
  const subRef = subscriptions().doc(subscriptionId(planId, uid))
  await adminDb.runTransaction(async (tx) => {
    const [planSnap, subSnap] = await Promise.all([tx.get(planRef), tx.get(subRef)])
    const plan = planSnap.data() as StoredPlan | undefined
    if (!plan?.userId) throw new Error('FORBIDDEN')
    if (plan.userId === uid) throw new Error('SELF_SUBSCRIBE')
    if (subSnap.exists) return
    if (visibilityOf(plan) !== 'public' && !validInvite) throw new Error('FORBIDDEN')
    tx.set(subRef, {
      planId,
      uid,
      ownerId: plan.userId,
      name: subscriber.name,
      photo: subscriber.photo,
      via: validInvite ? 'invite' : 'public',
      createdAt: Date.now(),
    })
    tx.update(planRef, { subscriberCount: FieldValue.increment(1) })
  })
}

async function deleteSubscription(planId: string, uid: string, ownerUid?: string) {
  if (!isValidDocId(planId)) throw new Error('FORBIDDEN')
  const planRef = plans().doc(planId)
  const subRef = subscriptions().doc(subscriptionId(planId, uid))
  await adminDb.runTransaction(async (tx) => {
    const [planSnap, subSnap] = await Promise.all([tx.get(planRef), tx.get(subRef)])
    const plan = planSnap.data() as StoredPlan | undefined
    if (ownerUid !== undefined && plan?.userId !== ownerUid) throw new Error('FORBIDDEN')
    if (!subSnap.exists) return
    // Guards against `_` doc-id collisions between different (planId, uid) pairs.
    const sub = subSnap.data()
    if (sub?.planId !== planId || sub?.uid !== uid) return
    tx.delete(subRef)
    // The author may have deleted the plan; the orphan subscription still goes away.
    if (plan) tx.update(planRef, { subscriberCount: FieldValue.increment(-1) })
  })
}

export function unsubscribe(planId: string, uid: string): Promise<void> {
  return deleteSubscription(planId, uid)
}

export function removeSubscriber(
  planId: string,
  ownerUid: string,
  subscriberUid: string
): Promise<void> {
  if (!isValidDocId(subscriberUid)) return Promise.reject(new Error('FORBIDDEN'))
  return deleteSubscription(planId, subscriberUid, ownerUid)
}

async function assertOwner(planId: string, ownerUid: string) {
  if (!isValidDocId(planId)) throw new Error('FORBIDDEN')
  const plan = (await plans().doc(planId).get()).data() as StoredPlan | undefined
  if (!plan || plan.userId !== ownerUid) throw new Error('FORBIDDEN')
}

/** Returns the current invite token; only `regenerate` (or a missing token) mints a new one. */
export async function createInvite(
  planId: string,
  ownerUid: string,
  regenerate = false
): Promise<string> {
  await assertOwner(planId, ownerUid)
  if (!regenerate) {
    const existing = (await invites().doc(planId).get()).data()
    // Server-only collection (rules deny clients); validation still compares hashes.
    if (
      typeof existing?.token === 'string' &&
      existing.ownerId === ownerUid &&
      existing.tokenHash === hash(existing.token)
    )
      return existing.token
  }
  const token = randomBytes(32).toString('base64url')
  await invites()
    .doc(planId)
    .set({ token, tokenHash: hash(token), ownerId: ownerUid, createdAt: Date.now() })
  return token
}

export async function listSubscribers(
  planId: string,
  ownerUid: string
): Promise<{ uid: string; name: string; photo: string; createdAt: number }[]> {
  await assertOwner(planId, ownerUid)
  const snapshot = await subscriptions().where('planId', '==', planId).get()
  return snapshot.docs
    .map((doc) => doc.data())
    .filter((data) => data.ownerId === ownerUid)
    .map((data) => ({
      uid: String(data.uid || ''),
      name: String(data.name || ''),
      photo: String(data.photo || ''),
      createdAt: Number(data.createdAt) || 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Display identity for a subscriber comes from their user doc, never the request body. */
export async function subscriberProfile(uid: string) {
  const user = (await adminDb.collection('users').doc(uid).get()).data()
  return {
    name: publicNameFromUser(user),
    photo: typeof user?.photoURL === 'string' ? user.photoURL : '',
  }
}
