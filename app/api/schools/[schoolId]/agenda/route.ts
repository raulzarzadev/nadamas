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
import { getSchoolById } from '@/lib/server/schools'
import { requireSchoolAccess } from '@/lib/server/school-access'
import {
  legacySchoolOfferings,
  schoolClassAgendaBooking,
  schoolClassCoachIds,
  schoolScheduleOwners,
} from '@/lib/server/school-agenda'

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
  const [schoolClassesSnapshot, studentsSnapshot] = await Promise.all([
    adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId).get(),
    adminDb.collection('schoolStudents').where('schoolId', '==', schoolId).get(),
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
  const blocks = blocksSnapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<CoachScheduleBlock, 'id'>) }))
    .filter((block) => teacherIds.has(block.coachId))
    .sort((a, b) =>
      `${a.date} ${a.startTime || ''}`.localeCompare(`${b.date} ${b.startTime || ''}`)
    )

  const agendaBookings = [...bookings, ...schoolClassBookings].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
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
    offerings: targetCoachId ? teacherData[0]?.offerings || [] : [],
    coachNames: names,
    schoolId,
  })
}
