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

type SeatMembershipDoc = SeatMembership & { id: string }

async function readSeatDocs(schoolId: string, tx?: Transaction) {
  const subscriptionRef = adminDb.collection('schoolSubscriptions').doc(schoolId)
  const membershipsQuery = adminDb
    .collection('schoolMemberships')
    .where('schoolId', '==', schoolId)
    .select('userId', 'status', 'role', 'roles')
  const studentsQuery = adminDb
    .collection('schoolStudents')
    .where('schoolId', '==', schoolId)
    .select('status', 'studentUserId', 'additionalProfileId', 'guardianIds', 'managerIds')
  const [subscription, memberships, students] = tx
    ? await Promise.all([tx.get(subscriptionRef), tx.get(membershipsQuery), tx.get(studentsQuery)])
    : await Promise.all([subscriptionRef.get(), membershipsQuery.get(), studentsQuery.get()])
  return {
    limits: schoolPlanLimits((subscription.data() as SchoolSubscription | undefined) ?? null),
    memberships: memberships.docs.map((doc) => ({
      ...(doc.data() as SeatMembership),
      id: doc.id,
    })),
    students: students.docs.map((doc) => ({ ...(doc.data() as SeatStudent), id: doc.id })),
  }
}

export async function readSchoolSeats(
  schoolId: string,
  tx?: Transaction
): Promise<{
  limits: SchoolPlanLimits
  usage: SeatUsage
  keys: { teachers: Set<string>; students: Set<string> }
}> {
  const { limits, memberships, students } = await readSeatDocs(schoolId, tx)
  const keys = seatKeys({ memberships, students })
  return { limits, usage: seatUsage(keys), keys }
}

const noClaim = { claim: () => {} }

/** Reads the per-school lock (joining the transaction's read set); returns its write. */
async function readSeatLock(tx: Transaction, schoolId: string) {
  const lockRef = adminDb.collection('schoolSeatLocks').doc(schoolId)
  await tx.get(lockRef)
  return () => {
    tx.set(lockRef, { schoolId, updatedAt: Date.now() }, { merge: true })
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
  const claim = await readSeatLock(tx, schoolId)
  const { limits, usage, keys } = await readSchoolSeats(schoolId, tx)
  if ((kind === 'teacher' ? keys.teachers : keys.students).has(key)) return noClaim
  if (!hasSeat(limits, usage, kind))
    throw new SubscriptionError('plan_limit_reached', planLimitMessage(limits), 409)
  return { claim }
}

const withChanges = <T extends { id: string }>(current: T[], changes: T[] = []) => {
  const byId = new Map(current.map((item) => [item.id, item]))
  for (const change of changes) byId.set(change.id, change)
  return [...byId.values()]
}

/**
 * Like `reserveSchoolSeat`, for writes that touch several roster/membership docs at once
 * (or re-key an existing one). Pass each touched doc's post-write seat fields; the seat
 * count is recomputed with them applied, so re-keying an already counted person is a no-op
 * and two new people in one write need two free seats. Same read-then-`claim()` contract.
 */
export async function reserveSchoolSeatChanges(
  tx: Transaction,
  schoolId: string,
  kind: SeatKind,
  changes: { memberships?: SeatMembershipDoc[]; students?: SeatStudent[] }
): Promise<{ claim: () => void }> {
  const claim = await readSeatLock(tx, schoolId)
  const { limits, memberships, students } = await readSeatDocs(schoolId, tx)
  const pick = (keys: ReturnType<typeof seatKeys>) =>
    (kind === 'teacher' ? keys.teachers : keys.students).size
  const before = pick(seatKeys({ memberships, students }))
  const after = pick(
    seatKeys({
      memberships: withChanges(memberships, changes.memberships),
      students: withChanges(students, changes.students),
    })
  )
  if (after <= before) return noClaim
  const limit = kind === 'teacher' ? limits.teachers : limits.students
  if (limit !== null && after > limit)
    throw new SubscriptionError('plan_limit_reached', planLimitMessage(limits), 409)
  return { claim }
}
