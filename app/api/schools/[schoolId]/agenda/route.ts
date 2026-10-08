import { NextResponse } from 'next/server'
import {
  buildAvailableSlots,
  type CoachScheduleBlock,
  monthRange,
  timesOverlap,
} from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { resolveOfferings } from '@/lib/coach-offerings'
import {
  type SchoolClassOccurrence,
  type SchoolMembership,
  schoolMembershipHasRole,
  UNASSIGNED_SCHOOL_COACH_ID,
} from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { getSchoolCaller, requireSchoolAccess } from '@/lib/server/school-access'
import {
  type AgendaStudentRecord,
  coalesceGroupClassOccurrences,
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
  const publicSchool = access.response ? await getSchoolById(schoolId) : null
  if (access.response && (!publicSchool || (publicView && !publicSchool.isPublic)))
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  const viewerId = access.response ? (await getSchoolCaller(request))?.uid : access.caller.uid
  const canManage =
    url.searchParams.get('view') !== 'public' &&
    !access.response &&
    (access.globalAdmin || schoolMembershipHasRole(access.membership, 'director'))
  const teacherOwnScheduleOnly =
    !publicView &&
    !access.response &&
    !access.globalAdmin &&
    schoolMembershipHasRole(access.membership, 'teacher') &&
    !schoolMembershipHasRole(access.membership, 'director')
  const targetCoachId = teacherOwnScheduleOnly ? access.caller.uid : url.searchParams.get('coachId')
  const range = monthRange(url.searchParams.get('month'))
  const [membershipSnapshot, bookingsSnapshot, blocksSnapshot] = await Promise.all([
    adminDb.collection('schoolMemberships').where('schoolId', '==', schoolId).get(),
    adminDb.collection('bookings').where('schoolId', '==', schoolId).get(),
    adminDb.collection('coachScheduleBlocks').where('schoolId', '==', schoolId).get(),
  ])
  const assignmentsSnapshot = await adminDb
    .collection('schoolScheduleAssignments')
    .where('schoolId', '==', schoolId)
    .get()
  const [schoolClassesSnapshot, studentsSnapshot, requestsSnapshot, studentRecordsSnapshot] =
    await Promise.all([
      adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId).get(),
      adminDb.collection('schoolStudents').where('schoolId', '==', schoolId).get(),
      adminDb.collection('schoolClassRequests').where('schoolId', '==', schoolId).get(),
      canManage
        ? adminDb.collection('agendaStudentRecords').where('schoolId', '==', schoolId).get()
        : Promise.resolve(null),
    ])
  const studentRecords = new Map(
    (studentRecordsSnapshot?.docs || []).map((doc) => {
      const record = doc.data() as AgendaStudentRecord
      return [`${record.sourceId}|${record.studentId}`, record] as const
    })
  )

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
  const activeTeacherIds = new Set(scheduleMemberships.map((membership) => membership.userId))
  for (const doc of assignmentsSnapshot.docs) {
    const assignedCoachId = doc.data().coachId
    if (
      canManage &&
      typeof assignedCoachId === 'string' &&
      activeTeacherIds.has(assignedCoachId) &&
      (!targetCoachId ||
        targetCoachId === UNASSIGNED_SCHOOL_COACH_ID ||
        targetCoachId === assignedCoachId)
    )
      teacherIds.add(assignedCoachId)
  }
  const unassignedOfferingsSnapshot = await adminDb
    .collection('schoolCoachOfferings')
    .doc(`${schoolId}_${UNASSIGNED_SCHOOL_COACH_ID}`)
    .get()
  if (
    unassignedOfferingsSnapshot.exists &&
    (!targetCoachId || targetCoachId === UNASSIGNED_SCHOOL_COACH_ID)
  ) {
    teacherIds.add(UNASSIGNED_SCHOOL_COACH_ID)
  }

  const teacherData = await Promise.all(
    [...teacherIds].map(async (teacherId) => {
      if (teacherId === UNASSIGNED_SCHOOL_COACH_ID) {
        return {
          teacherId,
          name: 'Sin profe aún',
          offerings: resolveOfferings({
            classOfferings: unassignedOfferingsSnapshot.data()?.classOfferings || [],
            teachingLocations: [],
            priceOptions: [],
          }),
        }
      }
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
    .flatMap((booking) =>
      (booking.assignedCoachIds?.length ? booking.assignedCoachIds : [booking.coachId])
        .filter((id) => teacherIds.has(id))
        .map((coachId) => ({ ...booking, coachId }))
    )
    .map((booking) => ({
      ...booking,
      coachName: booking.coachName || names[booking.coachId] || 'Coach',
      ...(canManage
        ? { studentNote: studentRecords.get(`${booking.id}|${booking.athleteId}`)?.note || '' }
        : {}),
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
              student.guardianId === viewerId ||
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
  const classOccurrences = coalesceGroupClassOccurrences(
    schoolClassesSnapshot.docs.map((doc) => doc.data() as SchoolClassOccurrence)
  )
  const schoolClassBookings = classOccurrences.flatMap((occurrence) => {
    if (
      occurrence.status === 'cancelled' ||
      !occurrence.date ||
      occurrence.date < startDate ||
      occurrence.date > endDate
    )
      return []
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
        studentRecords: canManage ? studentRecords : undefined,
      })
    )
  })
  const myReservations = viewerId
    ? [
        ...bookings
          .filter(
            (booking) =>
              booking.athleteId === viewerId && booking.date >= startDate && booking.date <= endDate
          )
          .map((booking) => ({
            id: booking.id,
            coachId: booking.coachId,
            coachName: booking.coachName || names[booking.coachId] || 'Entrenador',
            date: booking.date,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
            groupType: booking.groupType,
            studentIds: [],
            studentNames: [booking.athleteName || 'Mi perfil'],
          })),
        ...classOccurrences.flatMap((occurrence) => {
          if (
            !occurrence.date ||
            occurrence.status === 'cancelled' ||
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
            schoolClassId: occurrence.id,
            coachId,
            coachName: names[coachId] || 'Entrenador',
            date: occurrence.date,
            startTime: occurrence.startTime,
            endTime: occurrence.endTime,
            status: occurrence.pendingStudentIds?.some((id) => viewerStudentIds.has(id))
              ? 'pending'
              : occurrence.status === 'scheduled'
                ? 'confirmed'
                : occurrence.status,
            groupType: occurrence.type === 'group' ? 'grupal' : 'particular',
            studentIds: occurrence.studentIds.filter((studentId) =>
              viewerStudentIds.has(studentId)
            ),
            studentNames: occurrence.studentIds
              .filter((studentId) => viewerStudentIds.has(studentId))
              .map((studentId) => studentNames.get(studentId) || 'Alumno'),
          }))
        }),
        ...requestsSnapshot.docs.flatMap((doc) => {
          const requestRecord = doc.data()
          const coachId =
            typeof requestRecord.preferredTeacherId === 'string'
              ? requestRecord.preferredTeacherId
              : ''
          if (
            (requestRecord.requestedBy !== viewerId &&
              !viewerStudentIds.has(requestRecord.studentId)) ||
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
              schoolRequestId: doc.id,
              coachId,
              coachName: names[coachId] || 'Entrenador',
              date: requestRecord.startDate,
              startTime: requestRecord.preferredStartTime,
              endTime: requestRecord.preferredEndTime,
              status: 'pending',
              groupType: requestRecord.type === 'group' ? 'grupal' : 'particular',
              studentIds:
                typeof requestRecord.studentId === 'string' ? [requestRecord.studentId] : [],
              studentNames:
                typeof requestRecord.studentName === 'string' ? [requestRecord.studentName] : [],
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

  const agendaBookings: Booking[] = [
    ...bookings,
    ...schoolClassBookings,
    ...pendingRequestBookings,
  ].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  const slotIsBlocked = (slot: {
    coachId: string
    date: string
    startTime: string
    endTime: string
  }) =>
    blocks.some(
      (block) =>
        block.coachId === slot.coachId &&
        block.date === slot.date &&
        (block.allDay ||
          (block.startTime &&
            block.endTime &&
            timesOverlap(block.startTime, block.endTime, slot.startTime, slot.endTime)))
    )
  const assignedSlots = assignmentsSnapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }))
    .filter(({ data }) => {
      const date = String(data.date || '')
      return date >= startDate && date <= endDate && teacherIds.has(String(data.coachId))
    })
    .map(({ id, data }) => {
      const slot = {
        id: `assignment:${id}`,
        coachId: String(data.coachId),
        schoolId,
        offeringId: String(data.offeringId || ''),
        scheduleId: String(data.scheduleId || ''),
        date: String(data.date),
        startTime: String(data.startTime),
        endTime: String(data.endTime),
        locationName: String(data.locationName || ''),
        groupType: data.groupType === 'grupal' ? ('grupal' as const) : ('particular' as const),
        coachName: names[String(data.coachId)] || 'Coach',
      }
      const matchingBookings = agendaBookings.filter(
        (booking) =>
          booking.coachId === slot.coachId &&
          booking.date === slot.date &&
          booking.status !== 'cancelled' &&
          timesOverlap(slot.startTime, slot.endTime, booking.startTime, booking.endTime)
      )
      const sourceOffering = teacherData
        .find(({ teacherId }) => teacherId === UNASSIGNED_SCHOOL_COACH_ID)
        ?.offerings.find(({ id: candidateId }) => candidateId === slot.offeringId)
      const groupCapacity = sourceOffering?.maxPeople || Number.POSITIVE_INFINITY
      const groupOccupancy = matchingBookings.reduce(
        (count, booking) =>
          count +
          Math.max(
            1,
            ('schoolClassStudentCount' in booking && booking.schoolClassStudentCount) || 1
          ),
        0
      )
      const canJoinGroup =
        slot.groupType === 'grupal' &&
        matchingBookings.length > 0 &&
        matchingBookings.every((booking) => booking.groupType === 'grupal' && !booking.classFull) &&
        groupOccupancy < groupCapacity
      return {
        ...slot,
        status: slotIsBlocked(slot)
          ? ('blocked' as const)
          : matchingBookings.length > 0 && !canJoinGroup
            ? ('booked' as const)
            : ('available' as const),
      }
    })
  const builtSlots = teacherData.flatMap(({ teacherId, name, offerings }) =>
    buildAvailableSlots({
      coachId: teacherId,
      offerings,
      bookings: agendaBookings.filter((booking) => booking.coachId === teacherId),
      blocks: blocks.filter((block) => block.coachId === teacherId),
      startDate: range.start,
      endDate: range.end,
    }).map((slot) => ({ ...slot, coachName: name, schoolId }))
  )
  const availableSlots = [
    ...builtSlots.filter(
      (slot) =>
        !(
          slot.coachId === UNASSIGNED_SCHOOL_COACH_ID &&
          assignmentsSnapshot.docs.some(
            (doc) => doc.data().date === slot.date && doc.data().startTime === slot.startTime
          )
        )
    ),
    ...assignedSlots.filter(
      (assignment) =>
        !builtSlots.some(
          (slot) =>
            slot.coachId === assignment.coachId &&
            slot.date === assignment.date &&
            slot.startTime === assignment.startTime
        )
    ),
  ].sort((a, b) =>
    `${a.date} ${a.startTime} ${a.coachName || ''}`.localeCompare(
      `${b.date} ${b.startTime} ${b.coachName || ''}`
    )
  )

  // Assigned classes can exist without a published recurring schedule.
  for (const booking of agendaBookings) {
    if (
      booking.status !== 'confirmed' ||
      booking.date < startDate ||
      booking.date > endDate ||
      availableSlots.some(
        (slot) =>
          slot.coachId === booking.coachId &&
          slot.date === booking.date &&
          slot.startTime === booking.startTime &&
          slot.groupType === booking.groupType
      )
    )
      continue
    availableSlots.push({
      id: `occupied:${booking.id}`,
      schoolId,
      coachId: booking.coachId,
      coachName: booking.coachName || names[booking.coachId] || 'Coach',
      offeringId: booking.offeringId,
      scheduleId: booking.scheduleId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      locationName: booking.locationName || '',
      groupType: booking.groupType,
      status: slotIsBlocked(booking)
        ? 'blocked'
        : booking.groupType === 'grupal' &&
            !booking.classFull &&
            agendaBookings
              .filter(
                (other) =>
                  other.status !== 'cancelled' &&
                  other.coachId === booking.coachId &&
                  other.date === booking.date &&
                  timesOverlap(other.startTime, other.endTime, booking.startTime, booking.endTime)
              )
              .every((other) => other.groupType === 'grupal' && !other.classFull) &&
            !blocks.some(
              (block) =>
                block.coachId === booking.coachId &&
                block.date === booking.date &&
                (block.allDay ||
                  (block.startTime &&
                    block.endTime &&
                    timesOverlap(
                      block.startTime,
                      block.endTime,
                      booking.startTime,
                      booking.endTime
                    )))
            )
          ? 'available'
          : 'booked',
    })
  }

  const enrolledCountForSlot = (slot: {
    coachId: string
    date: string
    startTime: string
    groupType: string
  }) => {
    const students = new Set<string>()
    for (const booking of agendaBookings) {
      if (
        booking.status !== 'confirmed' ||
        booking.schoolRequestId ||
        booking.coachId !== slot.coachId ||
        booking.date !== slot.date ||
        booking.startTime !== slot.startTime ||
        booking.groupType !== slot.groupType
      )
        continue
      if (booking.schoolClassStudents) {
        for (const student of booking.schoolClassStudents)
          if (!student.pending) students.add(student.id)
      } else if (booking.schoolClassStudentIds) {
        for (const id of booking.schoolClassStudentIds) students.add(id)
      } else {
        students.add(
          booking.additionalProfileId || booking.athleteProfileId || booking.athleteId || booking.id
        )
      }
    }
    return students.size
  }

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
    availableSlots: availableSlots.map((slot) => ({
      ...slot,
      enrolledCount: enrolledCountForSlot(slot),
    })),
    myReservations: myReservations.map((reservation) => ({
      ...reservation,
      enrolledCount: enrolledCountForSlot(reservation),
    })),
    offerings: targetCoachId
      ? teacherData.find(({ teacherId }) => teacherId === targetCoachId)?.offerings || []
      : [],
    coachNames: names,
    schoolId,
  })
}
