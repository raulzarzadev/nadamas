import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { CoachBookingSelection } from '@/lib/coach-booking'
import { publicNameFromUser } from '@/lib/public-name'
import { sendBookingConfirmedEmail } from '@/lib/server/emails'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

type BookingInput = Partial<CoachBookingSelection> & { locationId?: string }

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

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

export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const caller = await adminAuth.verifyIdToken(token)
  const snapshot = await adminDb.collection('bookings').where('athleteId', '==', caller.uid).get()

  const bookings = snapshot.docs
    .map((doc) => doc.data())
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  return NextResponse.json({ bookings })
}

export async function POST(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const caller = await adminAuth.verifyIdToken(token)
  const body = (await request.json()) as BookingInput & {
    selections?: BookingInput[]
    locationId?: string
    athleteProfile?: { name?: string; phone?: string }
  }

  const selections = body.selections?.length ? body.selections : [body]
  const invalid = selections.some((selection) => {
    const offeringId = selection.offeringId || selection.locationId
    return (
      !selection.coachId ||
      !offeringId ||
      !selection.date ||
      !selection.locationName ||
      !Array.isArray(selection.days) ||
      selection.days.length === 0 ||
      !selection.startTime ||
      !selection.endTime
    )
  })
  if (invalid) {
    return NextResponse.json({ error: 'Datos de reserva incompletos.' }, { status: 400 })
  }

  const profileName = body.athleteProfile?.name?.trim()
  const profilePhone = body.athleteProfile?.phone?.trim()
  if (!profileName || !profilePhone) {
    return NextResponse.json(
      { error: 'Completa tu nombre y teléfono para confirmar.' },
      { status: 400 }
    )
  }

  const now = Date.now()
  await adminDb.collection('users').doc(caller.uid).set(
    {
      name: profileName,
      phone: profilePhone,
      profileCompletedAt: now,
      updatedAt: now,
    },
    { merge: true }
  )

  const athleteDoc = await adminDb.collection('users').doc(caller.uid).get()
  const coachId = selections[0].coachId as string
  const coachDoc = await adminDb.collection('users').doc(coachId).get()
  const bookings = selections.map((selection) => {
    const offeringId = (selection.offeringId || selection.locationId) as string
    return {
      athleteId: caller.uid,
      athleteName:
        profileName ||
        athleteDoc.data()?.displayName ||
        athleteDoc.data()?.name ||
        caller.name ||
        'Alumno',
      athletePhone: profilePhone,
      athleteEmail: athleteDoc.data()?.email || caller.email || null,
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
      currency: 'MXN' as const,
      unit: selection.unit ?? 'clase',
      status: 'confirmed',
      source: 'marketplace',
      createdAt: now,
      updatedAt: now,
    }
  })

  const savedBookings = bookings.map((booking) => ({
    id: bookingIdFor(caller.uid, booking),
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
        athletePhone: savedBookings[0].athletePhone,
        bookings: savedBookings.map((booking) => ({
          locationName: booking.locationName,
          date: booking.date,
          startTime: booking.startTime,
          price: booking.price,
        })),
      })
    }
  } catch (error) {
    console.error('[BOOKING_CONFIRM_NOTIFY]', error)
  }

  return NextResponse.json({ ok: true, bookings: savedBookings })
}
