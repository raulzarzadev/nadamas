import { NextResponse } from 'next/server'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import {
  buildAvailableSlots,
  type CoachScheduleBlock,
  monthRange,
  normalizeScheduleBlockInput,
  type ScheduleBlockInput,
} from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { resolveOfferings } from '@/lib/coach-offerings'
import {
  type SchoolClassOccurrence,
  type SchoolClassRequest,
  type SchoolMembership,
  schoolMembershipHasRole,
} from '@/lib/school'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { getSchoolMembership } from '@/lib/server/school-access'
import { coalesceGroupClassOccurrences, schoolClassAgendaBooking } from '@/lib/server/school-agenda'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

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
  const isAdmin = callerDoc.data()?.roles?.admin === true
  if (callerDoc.data()?.roles?.coach !== true && !isAdmin) {
    return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) }
  }

  return { caller, isAdmin }
}

// Admins may target another coach via `coachId`; everyone else acts on their own uid.
function resolveCoachId(
  verification: { caller: { uid: string }; isAdmin: boolean },
  target: string | null
) {
  return verification.isAdmin && target ? target : verification.caller.uid
}

async function authorizeSchoolContext(schoolId: string | null, uid: string, isAdmin: boolean) {
  if (!schoolId || isAdmin) return null
  const membership = await getSchoolMembership(schoolId, uid)
  if (
    !membership ||
    membership.status !== 'active' ||
    !schoolMembershipHasRole(membership as SchoolMembership, 'teacher')
  ) {
    return NextResponse.json({ error: 'No autorizado para esta escuela.' }, { status: 403 })
  }
  return null
}

export async function GET(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const url = new URL(request.url)
  const coachId = resolveCoachId(verification, url.searchParams.get('coachId'))
  const schoolId = url.searchParams.get('schoolId') || null
  const schoolError = await authorizeSchoolContext(
    schoolId,
    verification.caller.uid,
    verification.isAdmin
  )
  if (schoolError) return schoolError
  const schoolMembership = schoolId ? await getSchoolMembership(schoolId, coachId) : null
  const canReviewSchoolBookings =
    verification.isAdmin || schoolMembership?.canManageSchoolBookings === true
  const range = monthRange(url.searchParams.get('month'))
  const [
    coachDoc,
    bookingsSnapshot,
    blocksSnapshot,
    schoolOfferingsSnapshot,
    schoolClassesSnapshot,
    schoolStudentsSnapshot,
    schoolRequestsSnapshot,
  ] = await Promise.all([
    adminDb.collection('coaches').doc(coachId).get(),
    adminDb.collection('bookings').where('coachId', '==', coachId).get(),
    adminDb.collection('coachScheduleBlocks').where('coachId', '==', coachId).get(),
    schoolId
      ? adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${coachId}`).get()
      : Promise.resolve(null),
    schoolId
      ? adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId).get()
      : Promise.resolve(null),
    schoolId
      ? adminDb.collection('schoolStudents').where('schoolId', '==', schoolId).get()
      : Promise.resolve(null),
    schoolId
      ? adminDb.collection('schoolClassRequests').where('schoolId', '==', schoolId).get()
      : Promise.resolve(null),
  ])

  const coach = { id: coachDoc.id, ...coachDoc.data() } as CoachPublic
  const regularBookings = bookingsSnapshot.docs
    .map((doc) => doc.data() as Booking)
    .filter((booking) => (schoolId ? booking.schoolId === schoolId : !booking.schoolId))
  const studentNames = new Map(
    (schoolStudentsSnapshot?.docs || []).map((doc) => [doc.id, String(doc.data().name || 'Alumno')])
  )
  const startDate = range.start.toISOString().slice(0, 10)
  const endDate = range.end.toISOString().slice(0, 10)
  const schoolClassBookings = coalesceGroupClassOccurrences(
    (schoolClassesSnapshot?.docs || []).map((doc) => doc.data() as SchoolClassOccurrence)
  ).flatMap((occurrence) => {
    if (
      !occurrence.date ||
      occurrence.date < startDate ||
      occurrence.date > endDate ||
      !Array.isArray(occurrence.teacherIds) ||
      !occurrence.teacherIds.includes(coachId)
    )
      return []
    return [
      schoolClassAgendaBooking({
        schoolId: schoolId as string,
        occurrence,
        coachId,
        coachName: null,
        studentNames,
      }),
    ]
  })
  const schoolRequestBookings = canReviewSchoolBookings
    ? (schoolRequestsSnapshot?.docs || []).flatMap((doc) => {
        const record = doc.data() as SchoolClassRequest
        if (
          record.status !== 'pending' ||
          record.preferredTeacherId !== coachId ||
          record.startDate < startDate ||
          record.startDate > endDate
        )
          return []
        return [
          {
            id: `school-request-${doc.id}`,
            schoolRequestId: doc.id,
            schoolId: schoolId as string,
            coachId,
            coachName: null,
            athleteId: record.requestedBy,
            athleteName: record.studentName || 'Alumno',
            athleteEmail: null,
            date: record.startDate,
            startTime: record.preferredStartTime,
            endTime: record.preferredEndTime,
            offeringId: `school-request:${doc.id}`,
            scheduleId: `school-request:${doc.id}`,
            locationName: record.location || '',
            mode: 'fixed' as const,
            groupType: record.type === 'group' ? ('grupal' as const) : ('particular' as const),
            days: [],
            priceCents: null,
            currency: 'MXN' as const,
            unit: 'clase' as const,
            status: 'pending',
            source: 'school-request',
            createdAt: record.createdAt || 0,
            updatedAt: record.updatedAt || 0,
            classFull: false,
          },
        ]
      })
    : []
  const bookings = [...regularBookings, ...schoolClassBookings, ...schoolRequestBookings].sort(
    (a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  )
  const blocks = blocksSnapshot.docs
    .map((doc) => doc.data() as CoachScheduleBlock)
    .filter((block) => (schoolId ? block.schoolId === schoolId : !block.schoolId))
    .sort((a, b) =>
      `${a.date} ${a.startTime || ''}`.localeCompare(`${b.date} ${b.startTime || ''}`)
    )
  const offerings = resolveOfferings(
    schoolId
      ? ({
          ...coach,
          classOfferings: schoolOfferingsSnapshot?.data()?.classOfferings || [],
        } as CoachPublic)
      : coach
  )

  const availableSlots = buildAvailableSlots({
    coachId,
    offerings,
    bookings,
    blocks,
    startDate: range.start,
    endDate: range.end,
  })

  return NextResponse.json({ bookings, blocks, availableSlots, offerings, schoolId })
}

async function handlePOST(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const body = (await request.json()) as ScheduleBlockInput & {
    coachId?: string
    schoolId?: string
  }
  const coachId = resolveCoachId(verification, body.coachId ?? null)
  const schoolId = typeof body.schoolId === 'string' ? body.schoolId.trim() || null : null
  const schoolError = await authorizeSchoolContext(
    schoolId,
    verification.caller.uid,
    verification.isAdmin
  )
  if (schoolError) return schoolError
  const input = normalizeScheduleBlockInput(body)
  if (!input) {
    return NextResponse.json({ error: 'Datos de bloqueo inválidos.' }, { status: 400 })
  }

  const now = Date.now()
  const ref = adminDb.collection('coachScheduleBlocks').doc()
  const block: CoachScheduleBlock = {
    id: ref.id,
    coachId,
    createdAt: now,
    updatedAt: now,
    ...input,
    ...(schoolId ? { schoolId } : {}),
  }

  await ref.set(block)
  return NextResponse.json({ block })
}

async function handleDELETE(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Bloqueo inválido.' }, { status: 400 })

  const coachId = resolveCoachId(verification, url.searchParams.get('coachId'))
  const schoolId = url.searchParams.get('schoolId') || null
  const schoolError = await authorizeSchoolContext(
    schoolId,
    verification.caller.uid,
    verification.isAdmin
  )
  if (schoolError) return schoolError
  const ref = adminDb.collection('coachScheduleBlocks').doc(id)
  const current = await ref.get()
  if (
    !current.exists ||
    current.data()?.coachId !== coachId ||
    (schoolId ? current.data()?.schoolId !== schoolId : current.data()?.schoolId)
  ) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  await ref.delete()
  return NextResponse.json({ ok: true })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
export const DELETE = withSchoolAgendaUpdate(handleDELETE)
