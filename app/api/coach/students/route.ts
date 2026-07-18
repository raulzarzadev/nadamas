import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/coach-booking'
import {
  clampScale,
  computeStudentPosition,
  normalizeLevelValue,
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
  address?: string
  location?: string
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
        name: progress?.athleteName || first.athleteName,
        email: progress?.athleteEmail ?? first.athleteEmail,
        phone: progress?.athletePhone || first.athletePhone,
        address: progress?.athleteAddress || '',
        location: progress?.athleteLocation || '',
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
      address: progress.athleteAddress || '',
      location: progress.athleteLocation || '',
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
    level: 1,
    coachAssessment: 1,
    lastNote: '',
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
      address: '',
      location: '',
      totalClasses: 0,
      progress,
      entries: [],
    },
  })
}

export async function PUT(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const coachId = verification.caller.uid
  const body = (await request.json()) as {
    athleteId?: unknown
    name?: unknown
    email?: unknown
    phone?: unknown
    address?: unknown
    location?: unknown
  }
  const athleteId = typeof body.athleteId === 'string' ? body.athleteId : ''
  if (!athleteId) {
    return NextResponse.json({ error: 'Alumno inválido.' }, { status: 400 })
  }

  const details = sanitizeStudentDetails(body)
  if (details.name.length < 2) {
    return NextResponse.json({ error: 'Nombre inválido.' }, { status: 400 })
  }

  const [bookingSnapshot, existingProgress] = await Promise.all([
    adminDb
      .collection('bookings')
      .where('coachId', '==', coachId)
      .where('athleteId', '==', athleteId)
      .get(),
    adminDb.collection('coachStudentProgress').doc(studentProgressId(coachId, athleteId)).get(),
  ])
  const current = existingProgress.data() as StudentProgress | undefined

  if (bookingSnapshot.empty && !current) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const now = Date.now()
  const id = studentProgressId(coachId, athleteId)
  const progress: StudentProgress = {
    id,
    coachId,
    athleteId,
    athleteName: details.name,
    athleteEmail: details.email || null,
    athletePhone: details.phone,
    athleteAddress: details.address,
    athleteLocation: details.location,
    level: normalizeLevelValue(current?.level),
    coachAssessment: clampScale(current?.coachAssessment, 1),
    // Firestore rejects `undefined`; only include result when the doc has one.
    ...(current?.result ? { result: current.result } : {}),
    lastNote: current?.lastNote || '',
    createdAt: current?.createdAt || now,
    updatedAt: now,
  }

  const batch = adminDb.batch()
  batch.set(adminDb.collection('coachStudentProgress').doc(id), progress, { merge: true })
  for (const doc of bookingSnapshot.docs) {
    batch.set(
      doc.ref,
      {
        athleteName: details.name,
        athleteEmail: details.email || null,
        athletePhone: details.phone,
        updatedAt: now,
      },
      { merge: true }
    )
  }
  await batch.commit()

  return NextResponse.json({
    student: {
      athleteId,
      name: details.name,
      email: details.email || null,
      phone: details.phone,
      address: details.address,
      location: details.location,
      progress,
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

  // Append a timestamped entry to the student's progress history.
  const entryRef = adminDb.collection('coachStudentProgressEntries').doc()
  const entry: StudentProgressEntry = {
    id: entryRef.id,
    coachId,
    athleteId: body.athleteId,
    level: normalized.level,
    coachAssessment: normalized.coachAssessment,
    result: normalized.result,
    note: normalized.lastNote,
    createdAt: now,
  }

  // The doc's level is not the last click but the rounded-up average of the
  // most recent entries (including this one).
  const historySnapshot = await adminDb
    .collection('coachStudentProgressEntries')
    .where('coachId', '==', coachId)
    .where('athleteId', '==', body.athleteId)
    .get()
  const history = historySnapshot.docs.map((doc) => doc.data() as StudentProgressEntry)
  const computed = computeStudentPosition([...history, entry])

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
    ...computed,
  }

  await Promise.all([docRef.set(progress, { merge: true }), entryRef.set(entry)])

  return NextResponse.json({ progress, entry })
}

function sanitizeStudentDetails(input: {
  name?: unknown
  email?: unknown
  phone?: unknown
  address?: unknown
  location?: unknown
}) {
  return {
    name: typeof input.name === 'string' ? input.name.trim().slice(0, 120) : '',
    email: typeof input.email === 'string' ? input.email.trim().slice(0, 160) : '',
    phone: typeof input.phone === 'string' ? input.phone.trim().slice(0, 40) : '',
    address: typeof input.address === 'string' ? input.address.trim().slice(0, 240) : '',
    location: typeof input.location === 'string' ? input.location.trim().slice(0, 500) : '',
  }
}

function groupBookingsByAthlete(bookings: Booking[]) {
  const map = new Map<string, Booking[]>()
  for (const booking of bookings) {
    map.set(booking.athleteId, [...(map.get(booking.athleteId) || []), booking])
  }
  return map
}
