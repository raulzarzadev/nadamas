import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/coach-booking'
import { DAY_TO_INDEX } from '@/lib/coach-offerings'
import { type StudentProgress, studentProgressId } from '@/lib/coach-student-progress'
import { publicNameFromUser } from '@/lib/public-name'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { notifyBookingByCoach } from '@/lib/server/notifications'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

async function verifyCoach(request: Request) {
  const token = getBearerToken(request)
  if (!token) return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) }

  const caller = await adminAuth.verifyIdToken(token)
  const callerDoc = await adminDb.collection('users').doc(caller.uid).get()
  if (callerDoc.data()?.roles?.coach !== true && callerDoc.data()?.roles?.admin !== true) {
    return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) }
  }

  return { caller, callerDoc }
}

function weekdayLabel(date: string) {
  const index = new Date(`${date}T12:00:00`).getDay()
  return Object.entries(DAY_TO_INDEX).find(([, value]) => value === index)?.[0] || ''
}

type CoachBookingInput = {
  date?: string
  startTime?: string
  endTime?: string
  locationName?: string
  athleteId?: string
  athleteName?: string
  athleteEmail?: string | null
  athletePhone?: string | null
}

export async function POST(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const coachId = verification.caller.uid
  const body = (await request.json()) as CoachBookingInput
  const date = typeof body.date === 'string' ? body.date.trim() : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : ''
  const endTime = typeof body.endTime === 'string' ? body.endTime.trim() : ''
  const athleteName = typeof body.athleteName === 'string' ? body.athleteName.trim() : ''

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    !/^\d{2}:\d{2}$/.test(endTime) ||
    endTime <= startTime ||
    !athleteName
  ) {
    return NextResponse.json(
      { error: 'Datos del alumno o del horario inválidos.' },
      { status: 400 }
    )
  }

  const now = Date.now()
  const ref = adminDb.collection('bookings').doc()
  const athletePhone = body.athletePhone?.trim()
  const booking: Booking = {
    id: ref.id,
    athleteId: body.athleteId?.trim() || `manual:${ref.id}`,
    athleteName,
    // Firestore rejects `undefined`; only include the field when present.
    ...(athletePhone ? { athletePhone } : {}),
    athleteEmail: body.athleteEmail?.trim() || null,
    coachId,
    coachName: publicNameFromUser(verification.callerDoc.data()),
    offeringId: 'open',
    scheduleId: `open:${date}:${startTime}`,
    locationName: body.locationName?.trim() || 'Horario abierto',
    mode: 'fixed',
    groupType: 'particular',
    days: [weekdayLabel(date)],
    date,
    startTime,
    endTime,
    price: null,
    priceCents: null,
    currency: 'MXN',
    unit: 'clase',
    status: 'confirmed',
    source: 'coach',
    createdAt: now,
    updatedAt: now,
  }

  await ref.set(booking)
  const progressRef = adminDb
    .collection('coachStudentProgress')
    .doc(studentProgressId(coachId, booking.athleteId))
  const progressSnap = await progressRef.get()
  if (!progressSnap.exists) {
    const progress: StudentProgress = {
      id: progressRef.id,
      coachId,
      athleteId: booking.athleteId,
      athleteName: booking.athleteName,
      athleteEmail: booking.athleteEmail ?? null,
      ...(booking.athletePhone ? { athletePhone: booking.athletePhone } : {}),
      level: 'Inicial',
      goal: '',
      lastNote: '',
      nextFocus: '',
      coachAssessment: 1,
      createdAt: now,
      updatedAt: now,
    }
    await progressRef.set(progress)
  }

  // Notify the athlete (skipped automatically for manual_* placeholder ids).
  try {
    await notifyBookingByCoach({
      athleteId: booking.athleteId,
      coachId,
      coachName: booking.coachName,
      date: booking.date,
      startTime: booking.startTime,
      locationName: booking.locationName,
      bookingId: booking.id,
    })
  } catch (error) {
    console.error('[COACH_BOOKING_NOTIFY_INAPP]', error)
  }

  return NextResponse.json({ booking })
}

export async function DELETE(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Reserva inválida.' }, { status: 400 })

  const ref = adminDb.collection('bookings').doc(id)
  const current = await ref.get()
  if (!current.exists || current.data()?.coachId !== verification.caller.uid) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const now = Date.now()
  await ref.set({ status: 'cancelled', cancelledAt: now, updatedAt: now }, { merge: true })

  const cancelled = current.data() as Booking
  try {
    await notifyBookingByCoach({
      athleteId: cancelled.athleteId,
      coachId: verification.caller.uid,
      coachName: cancelled.coachName,
      date: cancelled.date,
      startTime: cancelled.startTime,
      locationName: cancelled.locationName,
      bookingId: id,
      cancelled: true,
    })
  } catch (error) {
    console.error('[COACH_BOOKING_CANCEL_NOTIFY_INAPP]', error)
  }

  return NextResponse.json({ ok: true, status: 'cancelled' })
}
