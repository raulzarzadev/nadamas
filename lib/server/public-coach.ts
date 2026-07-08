import 'server-only'

import type { CoachPublic } from '@/firebase/coaches/coach.model'
import type { PublicBlockedSlot, PublicBookedSlot } from '@/lib/coach-booking'
import { publicNameFromUser } from '@/lib/public-name'
import { adminDb } from '@/lib/server/firebase-admin'

export async function getPublicCoachDetail(id: string) {
  const coachSnap = await adminDb.collection('coaches').doc(id).get()
  if (!coachSnap.exists) return null

  const userSnap = await adminDb.collection('users').doc(id).get()
  const user = userSnap.data()
  const coach = { ...(coachSnap.data() as CoachPublic), id: coachSnap.id }
  const [bookedSlots, blockedSlots] = await Promise.all([
    getPublicBookedSlots(id),
    getPublicBlockedSlots(id),
  ])

  return {
    coach,
    name: publicNameFromUser(user),
    avatarUrl:
      typeof user?.photoURL === 'string'
        ? user.photoURL
        : typeof user?.photoUrl === 'string'
          ? user.photoUrl
          : null,
    coachSlug: typeof user?.slugs?.coach === 'string' ? user.slugs.coach : null,
    bookedSlots,
    blockedSlots,
  }
}

export async function getPublicBlockedSlots(coachId: string): Promise<PublicBlockedSlot[]> {
  const snapshot = await adminDb
    .collection('coachScheduleBlocks')
    .where('coachId', '==', coachId)
    .get()
  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as {
        date?: string
        startTime?: string | null
        allDay?: boolean
        hidden?: boolean
      }
      return {
        date: data.date || '',
        startTime: data.allDay ? null : data.startTime || null,
        allDay: data.allDay === true,
        hidden: data.hidden === true,
      }
    })
    .filter((block) => block.date && (block.allDay || block.startTime))
}

export async function getPublicBookedSlots(coachId: string): Promise<PublicBookedSlot[]> {
  const snapshot = await adminDb.collection('bookings').where('coachId', '==', coachId).get()
  const slots = new Map<string, PublicBookedSlot>()

  for (const doc of snapshot.docs) {
    const booking = doc.data() as Partial<PublicBookedSlot> & { status?: string }
    if (
      booking.status === 'cancelled' ||
      !booking.offeringId ||
      !booking.scheduleId ||
      !booking.date ||
      !booking.startTime ||
      !booking.endTime
    ) {
      continue
    }

    const key = [
      booking.offeringId,
      booking.scheduleId,
      booking.date,
      booking.startTime,
      booking.endTime,
    ].join('::')
    const existing = slots.get(key)
    if (existing) {
      existing.bookedCount += 1
      continue
    }

    slots.set(key, {
      offeringId: booking.offeringId,
      scheduleId: booking.scheduleId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      bookedCount: 1,
    })
  }

  return [...slots.values()]
}
