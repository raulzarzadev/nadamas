import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/coach-booking'
import {
  normalizeStudentProgressInput,
  type StudentProgress,
  type StudentProgressInput,
  studentProgressId,
} from '@/lib/coach-student-progress'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

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

  return { caller }
}

export async function GET(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const coachId = verification.caller.uid
  const bookingsSnapshot = await adminDb
    .collection('bookings')
    .where('coachId', '==', coachId)
    .get()
  const bookings = bookingsSnapshot.docs
    .map((doc) => doc.data() as Booking)
    .filter((booking) => booking.status !== 'cancelled')

  const progressSnapshot = await adminDb
    .collection('coachStudentProgress')
    .where('coachId', '==', coachId)
    .get()
  const progressByAthlete = new Map(
    progressSnapshot.docs.map((doc) => [doc.data().athleteId as string, doc.data()])
  )

  const now = new Date().toISOString().slice(0, 10)
  const students = [...groupBookingsByAthlete(bookings).values()]
    .map((studentBookings) => {
      const sorted = [...studentBookings].sort((a, b) =>
        `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
      )
      const first = sorted[0]
      const nextClass = sorted.find((booking) => booking.date >= now)
      const lastClass = [...sorted].reverse().find((booking) => booking.date < now) || sorted.at(-1)
      const progress = progressByAthlete.get(first.athleteId) || null

      return {
        athleteId: first.athleteId,
        name: first.athleteName,
        email: first.athleteEmail,
        phone: first.athletePhone,
        totalClasses: sorted.length,
        nextClass,
        lastClass,
        progress,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ students })
}

export async function PATCH(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const coachId = verification.caller.uid
  const body = (await request.json()) as StudentProgressInput & { athleteId?: string }
  if (!body.athleteId) {
    return NextResponse.json({ error: 'Alumno inválido.' }, { status: 400 })
  }

  const bookingSnapshot = await adminDb
    .collection('bookings')
    .where('coachId', '==', coachId)
    .where('athleteId', '==', body.athleteId)
    .limit(1)
    .get()
  const booking = bookingSnapshot.docs[0]?.data() as Booking | undefined
  if (!booking) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const id = studentProgressId(coachId, body.athleteId)
  const now = Date.now()
  const docRef = adminDb.collection('coachStudentProgress').doc(id)
  const current = await docRef.get()
  const normalized = normalizeStudentProgressInput(body)
  const progress: StudentProgress = {
    id,
    coachId,
    athleteId: body.athleteId,
    athleteName: booking.athleteName,
    athleteEmail: booking.athleteEmail,
    athletePhone: booking.athletePhone,
    createdAt: (current.data()?.createdAt as number | undefined) || now,
    updatedAt: now,
    ...normalized,
  }

  await docRef.set(progress, { merge: true })

  return NextResponse.json({ progress })
}

function groupBookingsByAthlete(bookings: Booking[]) {
  const map = new Map<string, Booking[]>()
  for (const booking of bookings) {
    map.set(booking.athleteId, [...(map.get(booking.athleteId) || []), booking])
  }
  return map
}
