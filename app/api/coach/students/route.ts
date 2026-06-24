import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/coach-booking'
import {
  normalizeStudentProgressInput,
  type StudentProgress,
  type StudentProgressEntry,
  type StudentProgressInput,
  studentProgressId,
} from '@/lib/coach-student-progress'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

interface CoachStudentSummary {
  athleteId: string
  name: string
  email: string | null
  phone?: string
  totalClasses: number
  nextClass?: Booking
  upcomingClasses: Booking[]
  lastClass?: Booking
  progress: StudentProgress | null
  entries: StudentProgressEntry[]
}

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

  const [progressSnapshot, entriesSnapshot] = await Promise.all([
    adminDb.collection('coachStudentProgress').where('coachId', '==', coachId).get(),
    adminDb.collection('coachStudentProgressEntries').where('coachId', '==', coachId).get(),
  ])
  const progressByAthlete = new Map(
    progressSnapshot.docs.map((doc) => {
      const progress = doc.data() as StudentProgress
      return [progress.athleteId, progress]
    })
  )
  const entriesByAthlete = new Map<string, StudentProgressEntry[]>()
  for (const doc of entriesSnapshot.docs) {
    const entry = doc.data() as StudentProgressEntry
    entriesByAthlete.set(entry.athleteId, [...(entriesByAthlete.get(entry.athleteId) || []), entry])
  }

  const now = new Date().toISOString().slice(0, 10)
  const students: CoachStudentSummary[] = [...groupBookingsByAthlete(bookings).values()]
    .map((studentBookings) => {
      const sorted = [...studentBookings].sort((a, b) =>
        `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
      )
      const first = sorted[0]
      const upcomingClasses = sorted.filter((booking) => booking.date >= now)
      const nextClass = upcomingClasses[0]
      const lastClass = [...sorted].reverse().find((booking) => booking.date < now) || sorted.at(-1)
      const progress = progressByAthlete.get(first.athleteId) || null

      return {
        athleteId: first.athleteId,
        name: first.athleteName,
        email: first.athleteEmail,
        phone: first.athletePhone,
        totalClasses: sorted.length,
        nextClass,
        upcomingClasses,
        lastClass,
        progress,
        entries: (entriesByAthlete.get(first.athleteId) || []).sort(
          (a, b) => b.createdAt - a.createdAt
        ),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const bookingAthleteIds = new Set(students.map((student) => student.athleteId))
  const manualStudents = progressSnapshot.docs
    .map((doc) => doc.data() as StudentProgress)
    .filter((progress) => !bookingAthleteIds.has(progress.athleteId))
    .map((progress) => ({
      athleteId: progress.athleteId,
      name: progress.athleteName,
      email: progress.athleteEmail,
      phone: progress.athletePhone,
      totalClasses: 0,
      upcomingClasses: [],
      progress,
      entries: (entriesByAthlete.get(progress.athleteId) || []).sort(
        (a, b) => b.createdAt - a.createdAt
      ),
    }))

  students.push(...manualStudents)
  students.sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ students })
}

export async function POST(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const coachId = verification.caller.uid
  const body = (await request.json()) as {
    name?: unknown
    email?: unknown
    phone?: unknown
  }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 160) : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : ''

  if (name.length < 2) {
    return NextResponse.json({ error: 'Nombre inválido.' }, { status: 400 })
  }

  const athleteId = `manual_${randomUUID()}`
  const id = studentProgressId(coachId, athleteId)
  const now = Date.now()
  const progress: StudentProgress = {
    id,
    coachId,
    athleteId,
    athleteName: name,
    athleteEmail: email || null,
    ...(phone ? { athletePhone: phone } : {}),
    level: 'Inicial',
    goal: '',
    lastNote: '',
    nextFocus: '',
    coachAssessment: 1,
    createdAt: now,
    updatedAt: now,
  }

  await adminDb.collection('coachStudentProgress').doc(id).set(progress)

  return NextResponse.json({
    student: {
      athleteId,
      name,
      email: email || null,
      ...(phone ? { phone } : {}),
      totalClasses: 0,
      progress,
      entries: [],
    },
  })
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
  const existingProgress = await adminDb
    .collection('coachStudentProgress')
    .doc(studentProgressId(coachId, body.athleteId))
    .get()
  const manualProgress = existingProgress.data() as StudentProgress | undefined

  if (!booking && !manualProgress) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const id = studentProgressId(coachId, body.athleteId)
  const now = Date.now()
  const docRef = adminDb.collection('coachStudentProgress').doc(id)
  const current = existingProgress
  const normalized = normalizeStudentProgressInput(body)
  const progress: StudentProgress = {
    id,
    coachId,
    athleteId: body.athleteId,
    athleteName: booking?.athleteName || manualProgress?.athleteName || 'Alumno',
    athleteEmail: booking?.athleteEmail ?? manualProgress?.athleteEmail ?? null,
    // Firestore rejects `undefined`; only include the phone when present.
    ...(booking?.athletePhone || manualProgress?.athletePhone
      ? { athletePhone: booking?.athletePhone || manualProgress?.athletePhone }
      : {}),
    createdAt: (current.data()?.createdAt as number | undefined) || now,
    updatedAt: now,
    ...normalized,
  }

  // Append a timestamped entry to the student's progress history.
  const entryRef = adminDb.collection('coachStudentProgressEntries').doc()
  const entry: StudentProgressEntry = {
    id: entryRef.id,
    coachId,
    athleteId: body.athleteId,
    level: normalized.level,
    coachAssessment: normalized.coachAssessment,
    goal: normalized.goal,
    nextFocus: normalized.nextFocus,
    note: normalized.lastNote,
    createdAt: now,
  }

  await Promise.all([docRef.set(progress, { merge: true }), entryRef.set(entry)])

  return NextResponse.json({ progress, entry })
}

function groupBookingsByAthlete(bookings: Booking[]) {
  const map = new Map<string, Booking[]>()
  for (const booking of bookings) {
    map.set(booking.athleteId, [...(map.get(booking.athleteId) || []), booking])
  }
  return map
}
