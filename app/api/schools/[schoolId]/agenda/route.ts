import { NextResponse } from 'next/server'
import { buildAvailableSlots, type CoachScheduleBlock, monthRange } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { resolveOfferings } from '@/lib/coach-offerings'
import { type SchoolMembership, schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { legacySchoolOfferings } from '@/lib/server/school-agenda'

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
  const access = await requireSchoolAccess(request, schoolId, [
    'director',
    'teacher',
    'student',
  ])
  if (access.response) return access.response

  const url = new URL(request.url)
  const targetCoachId = url.searchParams.get('coachId')
  if (
    targetCoachId &&
    !access.globalAdmin &&
    !schoolMembershipHasRole(access.membership, 'director')
  ) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }
  const range = monthRange(url.searchParams.get('month'))
  const [membershipSnapshot, bookingsSnapshot, blocksSnapshot] = await Promise.all([
    adminDb.collection('schoolMemberships').where('schoolId', '==', schoolId).get(),
    adminDb.collection('bookings').where('schoolId', '==', schoolId).get(),
    adminDb.collection('coachScheduleBlocks').where('schoolId', '==', schoolId).get(),
  ])

  const teacherMemberships = membershipSnapshot.docs.filter((doc) => {
    const membership = doc.data() as SchoolMembership
    return membership.status === 'active' && schoolMembershipHasRole(membership, 'teacher')
  })
  const teacherIds = new Set(
    teacherMemberships
      .map((doc) => doc.data().userId)
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
  const blocks = blocksSnapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<CoachScheduleBlock, 'id'>) }))
    .filter((block) => teacherIds.has(block.coachId))
    .sort((a, b) =>
      `${a.date} ${a.startTime || ''}`.localeCompare(`${b.date} ${b.startTime || ''}`)
    )

  const availableSlots = teacherData
    .flatMap(({ teacherId, name, offerings }) =>
      buildAvailableSlots({
        coachId: teacherId,
        offerings,
        bookings: bookings.filter((booking) => booking.coachId === teacherId),
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

  const canManage = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  return NextResponse.json({
    bookings: canManage
      ? bookings
      : bookings.map((booking, index) => ({
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
        })),
    blocks: canManage ? blocks : blocks.map(({ note: _note, ...block }) => block),
    availableSlots,
    offerings: targetCoachId ? teacherData[0]?.offerings || [] : [],
    coachNames: names,
    schoolId,
  })
}
