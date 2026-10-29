// No `server-only` marker: it is a Next.js build alias that Playwright cannot resolve,
// and the Admin SDK import already keeps this module out of client bundles.
import type { Transaction } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/server/firebase-admin'
import { SubscriptionError } from '@/lib/subscriptions/engine'
import type { SchoolSubscription } from '@/lib/subscriptions/model'
import {
  hasSeat,
  planLimitMessage,
  type SchoolPlanLimits,
  type SeatKind,
  type SeatMembership,
  type SeatStudent,
  type SeatUsage,
  schoolPlanLimits,
  seatKeys,
  seatUsage,
} from '@/lib/subscriptions/plans'

export async function readSchoolSeats(
  schoolId: string,
  tx?: Transaction
): Promise<{
  limits: SchoolPlanLimits
  usage: SeatUsage
  keys: { teachers: Set<string>; students: Set<string> }
}> {
  const subscriptionRef = adminDb.collection('schoolSubscriptions').doc(schoolId)
  const membershipsQuery = adminDb
    .collection('schoolMemberships')
    .where('schoolId', '==', schoolId)
    .select('userId', 'status', 'role', 'roles')
  const studentsQuery = adminDb
    .collection('schoolStudents')
    .where('schoolId', '==', schoolId)
    .select('status', 'studentUserId', 'additionalProfileId')
  const [subscription, memberships, students] = tx
    ? await Promise.all([tx.get(subscriptionRef), tx.get(membershipsQuery), tx.get(studentsQuery)])
    : await Promise.all([subscriptionRef.get(), membershipsQuery.get(), studentsQuery.get()])
  const keys = seatKeys({
    memberships: memberships.docs.map((doc) => doc.data() as SeatMembership),
    students: students.docs.map((doc) => ({ ...(doc.data() as SeatStudent), id: doc.id })),
  })
  return {
    limits: schoolPlanLimits((subscription.data() as SchoolSubscription | undefined) ?? null),
    usage: seatUsage(keys),
    keys,
  }
}

/**
 * Read-only reservation: call after the transaction's own reads, then call `claim()`
 * in its write phase. Every seat-adding transaction reads and writes the same
 * `schoolSeatLocks/{schoolId}` doc, so concurrent ones conflict and retry with fresh counts.
 */
export async function reserveSchoolSeat(
  tx: Transaction,
  schoolId: string,
  kind: SeatKind,
  key: string
): Promise<{ claim: () => void }> {
  const lockRef = adminDb.collection('schoolSeatLocks').doc(schoolId)
  await tx.get(lockRef)
  const { limits, usage, keys } = await readSchoolSeats(schoolId, tx)
  if ((kind === 'teacher' ? keys.teachers : keys.students).has(key)) return { claim: () => {} }
  if (!hasSeat(limits, usage, kind))
    throw new SubscriptionError('plan_limit_reached', planLimitMessage(limits), 409)
  return {
    claim: () => tx.set(lockRef, { schoolId, updatedAt: Date.now() }, { merge: true }),
  }
}
