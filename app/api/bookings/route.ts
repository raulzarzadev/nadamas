import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { CoachBookingSelection } from '@/lib/coach-booking'
import { publicNameFromUser } from '@/lib/public-name'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

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
  const body = (await request.json()) as Partial<CoachBookingSelection> & {
    locationId?: string
    athleteProfile?: { name?: string; phone?: string }
  }

  const offeringId = body.offeringId || body.locationId
  if (
    !body.coachId ||
    !offeringId ||
    !body.date ||
    !body.locationName ||
    !Array.isArray(body.days) ||
    body.days.length === 0 ||
    !body.startTime ||
    !body.endTime
  ) {
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
  const coachDoc = await adminDb.collection('users').doc(body.coachId).get()
  const booking = {
    athleteId: caller.uid,
    athleteName:
      profileName ||
      athleteDoc.data()?.displayName ||
      athleteDoc.data()?.name ||
      caller.name ||
      'Alumno',
    athletePhone: profilePhone,
    athleteEmail: athleteDoc.data()?.email || caller.email || null,
    coachId: body.coachId,
    coachName: publicNameFromUser(coachDoc.data()),
    offeringId,
    scheduleId: body.scheduleId || `${offeringId}:legacy`,
    date: body.date,
    locationName: body.locationName,
    mode: body.mode ?? 'fixed',
    groupType: body.groupType ?? 'particular',
    days: body.days,
    startTime: body.startTime,
    endTime: body.endTime,
    price: body.price ?? null,
    currency: 'MXN' as const,
    unit: body.unit ?? 'clase',
    status: 'confirmed',
    source: 'marketplace',
    createdAt: now,
    updatedAt: now,
  }

  const id = bookingIdFor(caller.uid, booking)
  await adminDb
    .collection('bookings')
    .doc(id)
    .set({ id, ...booking }, { merge: true })

  return NextResponse.json({ ok: true, booking: { id, ...booking } })
}
