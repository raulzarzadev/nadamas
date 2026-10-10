import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/coach-booking'
import { type SchoolMembership, schoolMembershipHasRole } from '@/lib/school'
import { getAdditionalProfile } from '@/lib/server/additional-profiles'
import {
  type BookingInput,
  createConfirmedBookings,
  validateSelections,
} from '@/lib/server/bookings'
import { getClassEvaluations } from '@/lib/server/class-evaluations'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'
import { listClassRequests, listSchoolClasses } from '@/lib/server/school-classes'
import { listSchoolStudents } from '@/lib/server/school-students'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const caller = await adminAuth.verifyIdToken(token)
  const [snapshot, evaluations, membershipsSnapshot] = await Promise.all([
    adminDb.collection('bookings').where('athleteId', '==', caller.uid).get(),
    getClassEvaluations('athleteId', caller.uid),
    adminDb.collection('schoolMemberships').where('userId', '==', caller.uid).get(),
  ])

  const individualBookings: Booking[] = snapshot.docs
    .map((doc) => ({
      ...(doc.data() as Booking),
      id: doc.id,
      evaluation: evaluations.find((item) => item.id === doc.id),
    }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  const studentMemberships = membershipsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<SchoolMembership, 'id'>) }))
    .filter(
      (membership) =>
        membership.status === 'active' && schoolMembershipHasRole(membership, 'student')
    )
  const schoolBookings = await Promise.all(
    studentMemberships.map(async (membership) => {
      const schoolId = typeof membership.schoolId === 'string' ? membership.schoolId : ''
      if (!schoolId) return []
      const students = await listSchoolStudents(schoolId, caller.uid)
      const studentIds = new Set(students.map((student) => student.id))
      if (!studentIds.size) return []
      const [classes, requests] = await Promise.all([
        listSchoolClasses({ schoolId, studentIds: [...studentIds] }),
        listClassRequests(schoolId, caller.uid),
      ])
      const coachIds = [
        ...new Set(
          classes
            .flatMap((item) => item.teacherIds)
            .concat(
              requests.flatMap((item) => (item.preferredTeacherId ? [item.preferredTeacherId] : []))
            )
        ),
      ]
      const coachUsers = await Promise.all(
        coachIds.map(async (coachId) => {
          const user = await adminDb.collection('users').doc(coachId).get()
          const data = user.data() || {}
          return [
            coachId,
            String(data.nickname || data.displayName || data.name || 'Entrenador'),
          ] as const
        })
      )
      const coachNames = Object.fromEntries(coachUsers)
      const classBookings: Booking[] = classes.flatMap((item) => {
        const relevantStudentIds = item.studentIds.filter((id) => studentIds.has(id))
        const coachId = item.teacherIds[0]
        if (!coachId) return []
        return [
          {
            id: `school-class-${item.id}-${caller.uid}`,
            schoolId,
            schoolClassId: item.id,
            schoolClassTitle: item.title,
            schoolClassStudentCount: relevantStudentIds.length,
            coachId,
            coachName: coachNames[coachId] || 'Entrenador',
            athleteId: caller.uid,
            athleteName: relevantStudentIds
              .map((id) => students.find((student) => student.id === id)?.name || 'Alumno')
              .join(', '),
            athleteEmail: null,
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            offeringId: `school-class:${item.seriesId || item.id}`,
            scheduleId: `school-class:${item.id}`,
            locationName: item.location || '',
            mode: 'fixed',
            groupType: item.type === 'group' ? 'grupal' : 'particular',
            days: [],
            priceCents: null,
            currency: 'MXN',
            unit: 'clase',
            status: item.status === 'scheduled' ? 'confirmed' : item.status,
            source: 'school-class',
            createdAt: item.createdAt || 0,
            updatedAt: item.updatedAt || 0,
            classFull: item.classFull === true,
          } as Booking,
        ]
      })
      const pendingBookings: Booking[] = requests
        .filter((item) => item.status === 'pending' && item.preferredTeacherId)
        .map(
          (item) =>
            ({
              id: `school-request-${item.id}`,
              schoolId,
              coachId: item.preferredTeacherId as string,
              coachName: coachNames[item.preferredTeacherId as string] || 'Entrenador',
              athleteId: caller.uid,
              athleteName: item.studentName || 'Alumno',
              athleteEmail: null,
              date: item.startDate,
              startTime: item.preferredStartTime,
              endTime: item.preferredEndTime,
              offeringId: `school-request:${item.id}`,
              scheduleId: `school-request:${item.id}`,
              locationName: item.location || '',
              mode: 'fixed',
              groupType: item.type === 'group' ? 'grupal' : 'particular',
              days: [],
              priceCents: null,
              currency: 'MXN',
              unit: 'clase',
              status: 'pending',
              source: 'school-request',
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              classFull: false,
            }) as Booking
        )
      return [...classBookings, ...pendingBookings]
    })
  )
  const bookings = [...individualBookings, ...schoolBookings.flat()].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  )

  return NextResponse.json({ bookings })
}

async function handlePOST(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const caller = await adminAuth.verifyIdToken(token)
  const body = (await request.json()) as BookingInput & {
    allowPackage?: boolean
    selections?: BookingInput[]
    locationId?: string
    athleteProfile?: {
      profileId?: string
      additionalProfileId?: string
      name?: string
      phone?: string
    }
  }

  const selections = body.selections?.length ? body.selections : [body]
  if (!validateSelections(selections)) {
    return NextResponse.json({ error: 'Datos de reserva incompletos.' }, { status: 400 })
  }

  const additionalProfile = body.athleteProfile?.additionalProfileId
    ? await getAdditionalProfile(caller.uid, body.athleteProfile.additionalProfileId)
    : null
  if (body.athleteProfile?.additionalProfileId && !additionalProfile) {
    return NextResponse.json({ error: 'Perfil adicional inválido.' }, { status: 400 })
  }
  const profileName = additionalProfile?.name || body.athleteProfile?.name?.trim()
  if (!profileName) {
    return NextResponse.json({ error: 'Completa tu nombre para confirmar.' }, { status: 400 })
  }

  const { bookings } = await createConfirmedBookings({
    uid: caller.uid,
    allowPackage: body.allowPackage === true,
    selections,
    profileName,
    profilePhone: body.athleteProfile?.phone?.trim(),
    profileId: additionalProfile?.id || caller.uid,
    additionalProfileId: additionalProfile?.id,
    callerName: caller.name,
    callerEmail: caller.email,
  })

  return NextResponse.json({ ok: true, bookings })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
