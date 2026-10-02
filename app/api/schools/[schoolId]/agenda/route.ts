import { NextResponse } from 'next/server'
import { buildAvailableSlots, type CoachScheduleBlock, monthRange } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { resolveOfferings } from '@/lib/coach-offerings'
import {
  type SchoolClassOccurrence,
  type SchoolMembership,
  schoolMembershipHasRole,
} from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { getSchoolCaller, requireSchoolAccess } from '@/lib/server/school-access'
import {
  legacySchoolOfferings,
  schoolClassAgendaBooking,
  schoolClassCoachIds,
  schoolScheduleOwners,
} from '@/lib/server/school-agenda'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

function publicUserName(user: Record<string, unknown>, fallback: string) {
  return (
    (typeof user.nickname === 'string' && user.nickname.trim()) ||
    (typeof user.displayName === 'string' && user.displayName.trim()) ||
    (typeof user.name === 'string' && user.name.trim()) ||
    fallback
  )
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const url = new URL(request.url)
  const publicView = url.searchParams.get('view') === 'public'
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response && !(publicView && access.response.status === 403)) return access.response
  if (access.response && !(await getSchoolById(schoolId)))
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const targetCoachId = url.searchParams.get('coachId')
  const viewerId = access.response ? (await getSchoolCaller(request))?.uid : access.caller.uid
  const canManage =
    url.searchParams.get('view') !== 'public' &&
    !access.response &&
    (access.globalAdmin || schoolMembershipHasRole(access.membership, 'director'))
  const range = monthRange(url.searchParams.get('month'))
  const [membershipSnapshot, bookingsSnapshot, blocksSnapshot] = await Promise.all([
    adminDb.collection('schoolMemberships').where('schoolId', '==', schoolId).get(),
    adminDb.collection('bookings').where('schoolId', '==', schoolId).get(),
    adminDb.collection('coachScheduleBlocks').where('schoolId', '==', schoolId).get(),
  ])
  const [schoolClassesSnapshot, studentsSnapshot, requestsSnapshot] = await Promise.all([
    adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId).get(),
    adminDb.collection('schoolStudents').where('schoolId', '==', schoolId).get(),
    adminDb.collection('schoolClassRequests').where('schoolId', '==', schoolId).get(),
  ])

  const scheduleMemberships = schoolScheduleOwners(
    membershipSnapshot.docs.map((doc) => doc.data() as SchoolMembership)
  )
  const teacherIds = new Set(
    scheduleMemberships
      .map((membership) => membership.userId)
      .filter(
        (userId): userId is string =>
          typeof userId === 'string' &&
          userId.length > 0 &&
          (!targetCoachId || userId === targetCoachId)
      )
  )

  const teacherData = await Promise.all(
    [...teacherIds].map(async (teacherId) => {
      const [userSnapshot, profileSnapshot, offeringsSnapshot, availabilitySnapshot] =
        await Promise.all([
          adminDb.collection('users').doc(teacherId).get(),
          adminDb.collection('schoolProfiles').doc(`${schoolId}_${teacherId}`).get(),
          adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${teacherId}`).get(),
          adminDb.collection('schoolAvailability').doc(`${schoolId}_${teacherId}`).get(),
        ])
      const user = (userSnapshot.data() || {}) as Record<string, unknown>
      const profile = (profileSnapshot.data() || {}) as Record<string, unknown>
      const name = publicUserName(profile, publicUserName(user, 'Coach'))
      const offerings = offeringsSnapshot.exists
        ? resolveOfferings({
            classOfferings: offeringsSnapshot.data()?.classOfferings || [],
            teachingLocations: [],
            priceOptions: [],
          })
        : legacySchoolOfferings(availabilitySnapshot.data()?.weeklySlots)
      return { teacherId, name, offerings }
    })
  )

  const names = Object.fromEntries(teacherData.map(({ teacherId, name }) => [teacherId, name]))
  const bookings = bookingsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Booking, 'id'>) }))
    .filter((booking) => teacherIds.has(booking.coachId))
    .map((booking) => ({
      ...booking,
      coachName: booking.coachName || names[booking.coachId] || 'Coach',
    }))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  const studentNames = new Map(
    studentsSnapshot.docs.map((doc) => [doc.id, String(doc.data().name || 'Alumno')])
  )
  const viewerStudentIds = new Set(
    viewerId
      ? studentsSnapshot.docs
          .filter((doc) => {
            const student = doc.data()
            return (
              student.studentUserId === viewerId ||
              (Array.isArray(student.managerIds) && student.managerIds.includes(viewerId)) ||
              (Array.isArray(student.guardianIds) && student.guardianIds.includes(viewerId))
            )
          })
          .map((doc) => doc.id)
      : []
  )
  if (viewerId && !access.response && schoolMembershipHasRole(access.membership, 'student')) {
    viewerStudentIds.add(viewerId)
  }
  const startDate = range.start.toISOString().slice(0, 10)
  const endDate = range.end.toISOString().slice(0, 10)
  const schoolClassBookings = schoolClassesSnapshot.docs.flatMap((doc) => {
    const occurrence = doc.data() as SchoolClassOccurrence
    if (!occurrence.date || occurrence.date < startDate || occurrence.date > endDate) return []
    const coachIds = schoolClassCoachIds({
      assignedCoachIds: Array.isArray(occurrence.teacherIds) ? occurrence.teacherIds : [],
      allowedCoachIds: teacherIds,
      targetCoachId,
    })
    return coachIds.map((coachId) =>
      schoolClassAgendaBooking({
        schoolId,
        occurrence,
        coachId,
        coachName: names[coachId] || 'Coach',
        studentNames: canManage ? studentNames : undefined,
      })
    )
  })
  const myReservations = viewerId
    ? [
        ...schoolClassesSnapshot.docs.flatMap((doc) => {
          const occurrence = doc.data() as SchoolClassOccurrence
          if (
            !occurrence.date ||
            occurrence.date < startDate ||
            occurrence.date > endDate ||
            !occurrence.studentIds?.some((studentId) => viewerStudentIds.has(studentId))
          )
            return []
          return schoolClassCoachIds({
            assignedCoachIds: occurrence.teacherIds,
            allowedCoachIds: teacherIds,
          }).map((coachId) => ({
            id: `class-${occurrence.id}-${coachId}`,
            coachId,
            coachName: names[coachId] || 'Entrenador',
            date: occurrence.date,
            startTime: occurrence.startTime,
            endTime: occurrence.endTime,
            status: occurrence.status === 'scheduled' ? 'confirmed' : occurrence.status,
            groupType: occurrence.type === 'group' ? 'grupal' : 'particular',
          }))
        }),
        ...requestsSnapshot.docs.flatMap((doc) => {
          const requestRecord = doc.data()
          const coachId =
            typeof requestRecord.preferredTeacherId === 'string'
              ? requestRecord.preferredTeacherId
              : ''
          if (
            requestRecord.requestedBy !== viewerId ||
            requestRecord.status !== 'pending' ||
            !coachId ||
            !requestRecord.startDate ||
            requestRecord.startDate < startDate ||
            requestRecord.startDate > endDate
          )
            return []
          return [
            {
              id: `request-${doc.id}`,
              coachId,
              coachName: names[coachId] || 'Entrenador',
              date: requestRecord.startDate,
              startTime: requestRecord.preferredStartTime,
              endTime: requestRecord.preferredEndTime,
              status: 'pending',
              groupType: requestRecord.type === 'group' ? 'grupal' : 'particular',
            },
          ]
        }),
      ]
    : []
  const pendingRequestBookings = requestsSnapshot.docs.flatMap((doc) => {
    const record = doc.data()
    const teacherId = typeof record.preferredTeacherId === 'string' ? record.preferredTeacherId : ''
    if (
      record.status !== 'pending' ||
      !teacherIds.has(teacherId) ||
      typeof record.startDate !== 'string' ||
      record.startDate < startDate ||
      record.startDate > endDate
    )
      return []
    return [
      {
        id: `school-request-${doc.id}`,
        schoolRequestId: doc.id,
        schoolId,
        coachId: teacherId,
        coachName: names[teacherId] || 'Entrenador',
        athleteId: record.requestedBy || '',
        athleteName: record.studentName || 'Alumno',
        athleteEmail: null,
        date: record.startDate,
        startTime: record.preferredStartTime || '16:00',
        endTime: record.preferredEndTime || '17:00',
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
  const blocks = blocksSnapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<CoachScheduleBlock, 'id'>) }))
    .filter((block) => teacherIds.has(block.coachId))
    .sort((a, b) =>
      `${a.date} ${a.startTime || ''}`.localeCompare(`${b.date} ${b.startTime || ''}`)
    )

  const agendaBookings = [...bookings, ...schoolClassBookings, ...pendingRequestBookings].sort(
    (a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  )
  const availableSlots = teacherData
    .flatMap(({ teacherId, name, offerings }) =>
      buildAvailableSlots({
        coachId: teacherId,
        offerings,
        bookings: agendaBookings.filter((booking) => booking.coachId === teacherId),
        blocks: blocks.filter((block) => block.coachId === teacherId),
        startDate: range.start,
        endDate: range.end,
      }).map((slot) => ({ ...slot, coachName: name, schoolId }))
    )
    .sort((a, b) =>
      `${a.date} ${a.startTime} ${a.coachName || ''}`.localeCompare(
        `${b.date} ${b.startTime} ${b.coachName || ''}`
      )
    )

  return NextResponse.json({
    bookings: [
      ...(canManage
        ? agendaBookings
        : agendaBookings.map((booking, index) => ({
            id: `school-slot-${index}`,
            coachId: booking.coachId,
            coachName: booking.coachName,
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            offeringId: booking.offeringId,
            scheduleId: booking.scheduleId,
            locationName: booking.locationName,
            groupType: booking.groupType,
            status: booking.status,
            classFull: booking.classFull === true,
            athleteId: '',
            athleteName: 'Alumno',
          }))),
    ],
    blocks: canManage ? blocks : blocks.map(({ note: _note, ...block }) => block),
    availableSlots,
    myReservations,
    offerings: targetCoachId ? teacherData[0]?.offerings || [] : [],
    coachNames: names,
    schoolId,
  })
}
