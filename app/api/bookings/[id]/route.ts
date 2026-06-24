import { NextResponse } from 'next/server'
import { formatSlotLabel } from '@/lib/coach-booking'
import { publicNameFromUser } from '@/lib/public-name'
import { sendBookingCancelledEmail } from '@/lib/server/emails'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { notifyBookingCancelled } from '@/lib/server/notifications'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const caller = await adminAuth.verifyIdToken(token)
  const { id } = await params
  const bookingRef = adminDb.collection('bookings').doc(id)
  const bookingSnap = await bookingRef.get()

  if (!bookingSnap.exists) {
    return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 })
  }

  const booking = bookingSnap.data() as {
    athleteId: string
    athleteName?: string
    coachId: string
    locationName: string
    days: string[]
    startTime: string
    endTime: string
    status: string
  }

  if (booking.athleteId !== caller.uid) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  if (booking.status === 'cancelled') {
    return NextResponse.json({ ok: true, status: 'cancelled' })
  }

  const now = Date.now()
  await bookingRef.set({ status: 'cancelled', cancelledAt: now, updatedAt: now }, { merge: true })

  // Notify the coach. Best-effort: a failed email must not fail the cancel.
  try {
    const coachUser = await adminDb.collection('users').doc(booking.coachId).get()
    const email = coachUser.data()?.email
    if (typeof email === 'string') {
      await sendBookingCancelledEmail({
        email,
        coachName: publicNameFromUser(coachUser.data()),
        athleteName: booking.athleteName || 'Un alumno',
        locationName: booking.locationName,
        slotLabel: formatSlotLabel({
          days: booking.days,
          startTime: booking.startTime,
          endTime: booking.endTime,
        }),
      })
    }
  } catch (error) {
    console.error('[BOOKING_CANCEL_NOTIFY]', error)
  }

  try {
    await notifyBookingCancelled({
      coachId: booking.coachId,
      athleteId: caller.uid,
      athleteName: booking.athleteName || 'Un alumno',
      locationName: booking.locationName,
      startTime: booking.startTime,
      bookingId: id,
    })
  } catch (error) {
    console.error('[BOOKING_CANCEL_NOTIFY_INAPP]', error)
  }

  return NextResponse.json({ ok: true, status: 'cancelled' })
}
