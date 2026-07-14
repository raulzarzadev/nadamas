import { createHash } from 'node:crypto'
import type { CoachBookingSelection } from '@/lib/coach-booking'
import { publicNameFromUser } from '@/lib/public-name'
import { sendBookingConfirmedEmail } from '@/lib/server/emails'
import { adminDb } from '@/lib/server/firebase-admin'
import { notifyBookingConfirmed } from '@/lib/server/notifications'

export type BookingInput = Partial<CoachBookingSelection> & { locationId?: string }

function bookingIdFor(athleteId: string, selection: CoachBookingSelection) {
  return createHash('sha1')
    .update(
      [
        athleteId,
        selection.coachId,
        selection.offeringId,
        selection.scheduleId,
        selection.date,
        selection.days.join(','),
      ].join('|')
    )
    .digest('hex')
}

export function validateSelections(selections: BookingInput[]) {
  if (!selections.length) return false
  return selections.every((selection) => {
    const offeringId = selection.offeringId || selection.locationId
    return (
      selection.coachId &&
      offeringId &&
      selection.date &&
      selection.locationName &&
      Array.isArray(selection.days) &&
      selection.days.length > 0 &&
      selection.startTime &&
      selection.endTime
    )
  })
}

export async function createConfirmedBookings(params: {
  uid: string
  selections: BookingInput[]
  profileName: string
  profilePhone?: string
  callerName?: string
  callerEmail?: string
}) {
  const { uid, selections, profileName, callerName, callerEmail } = params
  const profilePhone = params.profilePhone || ''

  const now = Date.now()
  await adminDb
    .collection('users')
    .doc(uid)
    .set(
      {
        name: profileName,
        ...(profilePhone ? { phone: profilePhone } : {}),
        profileCompletedAt: now,
        updatedAt: now,
      },
      { merge: true }
    )

  const athleteDoc = await adminDb.collection('users').doc(uid).get()
  const coachId = selections[0].coachId as string
  const coachDoc = await adminDb.collection('users').doc(coachId).get()
  const bookings = selections.map((selection) => {
    const offeringId = (selection.offeringId || selection.locationId) as string
    return {
      athleteId: uid,
      athleteName:
        profileName ||
        athleteDoc.data()?.displayName ||
        athleteDoc.data()?.name ||
        callerName ||
        'Alumno',
      athletePhone: profilePhone || null,
      athleteEmail: athleteDoc.data()?.email || callerEmail || null,
      coachId,
      coachName: publicNameFromUser(coachDoc.data()),
      offeringId,
      scheduleId: selection.scheduleId || `${offeringId}:legacy`,
      date: selection.date as string,
      locationName: selection.locationName as string,
      mode: selection.mode ?? 'fixed',
      groupType: selection.groupType ?? 'particular',
      days: selection.days as string[],
      startTime: selection.startTime as string,
      endTime: selection.endTime as string,
      price: selection.price ?? null,
      priceCents:
        selection.priceCents ??
        (selection.price !== undefined && selection.price !== null ? selection.price * 100 : null),
      currency: 'MXN' as const,
      unit: selection.unit ?? 'clase',
      status: 'confirmed',
      source: 'marketplace',
      createdAt: now,
      updatedAt: now,
    }
  })

  const savedBookings = bookings.map((booking) => ({
    id: bookingIdFor(uid, booking),
    ...booking,
  }))
  await Promise.all(
    savedBookings.map((booking) =>
      adminDb.collection('bookings').doc(booking.id).set(booking, { merge: true })
    )
  )

  try {
    const coachEmail = coachDoc.data()?.email
    if (typeof coachEmail === 'string') {
      await sendBookingConfirmedEmail({
        email: coachEmail,
        coachName: publicNameFromUser(coachDoc.data()),
        athleteName: savedBookings[0].athleteName,
        athletePhone: savedBookings[0].athletePhone ?? undefined,
        bookings: savedBookings.map((booking) => ({
          locationName: booking.locationName,
          date: booking.date,
          startTime: booking.startTime,
          priceCents: booking.priceCents,
        })),
      })
    }
  } catch (error) {
    console.error('[BOOKING_CONFIRM_NOTIFY]', error)
  }

  try {
    const first = savedBookings[0]
    await notifyBookingConfirmed({
      coachId,
      athleteId: uid,
      athleteName: first.athleteName,
      date: first.date,
      startTime: first.startTime,
      locationName: first.locationName,
      bookingId: first.id,
      count: savedBookings.length,
    })
  } catch (error) {
    console.error('[BOOKING_CONFIRM_NOTIFY_INAPP]', error)
  }

  return { bookings: savedBookings }
}
