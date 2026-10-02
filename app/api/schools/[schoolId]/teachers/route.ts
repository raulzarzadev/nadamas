import { NextResponse } from 'next/server'
import type { CoachClassOffering } from '@/firebase/coaches/coach.model'
import { DAY_TO_INDEX, resolveOfferingSchedules } from '@/lib/coach-offerings'
import {
  type SchoolMembership,
  type SchoolTeacherProfile,
  schoolMembershipHasRole,
} from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { schoolScheduleOwners } from '@/lib/server/school-agenda'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

function availabilityFromOfferings(classOfferings: CoachClassOffering[]) {
  const today = new Date().toISOString().slice(0, 10)
  const slots = classOfferings.flatMap((offering) =>
    resolveOfferingSchedules(offering).flatMap((schedule) => {
      if (schedule.timeMode === 'open' || !schedule.startTime || !schedule.endTime) return []
      if (
        schedule.availabilityMode === 'dates' &&
        !(schedule.availableDates || []).some((date) => date >= today)
      ) {
        return []
      }
      return schedule.days.flatMap((day) => {
        const dayIndex = DAY_TO_INDEX[day]
        return dayIndex === undefined
          ? []
          : [{ day: dayIndex, start: schedule.startTime, end: schedule.endTime }]
      })
    })
  )
  return [...new Map(slots.map((slot) => [`${slot.day}|${slot.start}|${slot.end}`, slot])).values()]
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response

  const membershipSnapshot = await adminDb
    .collection('schoolMemberships')
    .where('schoolId', '==', schoolId)
    .get()
  const memberships = schoolScheduleOwners(
    membershipSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as SchoolMembership)
  )
  const teachers = await Promise.all(
    memberships.map(async (membership) => {
      const userId = membership.userId as string
      const [profileSnapshot, userSnapshot, availabilitySnapshot, offeringsSnapshot] =
        await Promise.all([
          adminDb.collection('schoolProfiles').doc(`${schoolId}_${userId}`).get(),
          adminDb.collection('users').doc(userId).get(),
          adminDb.collection('schoolAvailability').doc(`${schoolId}_${userId}`).get(),
          adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${userId}`).get(),
        ])
      const profile = profileSnapshot.exists
        ? (profileSnapshot.data() as Omit<SchoolTeacherProfile, 'id'>)
        : null
      const user = userSnapshot.data() || {}
      const legacyAvailability = availabilitySnapshot.exists
        ? availabilitySnapshot.data()?.weeklySlots || []
        : []
      const offeringAvailability = offeringsSnapshot.exists
        ? availabilityFromOfferings(
            (offeringsSnapshot.data()?.classOfferings || []) as CoachClassOffering[]
          )
        : []
      const availability = [...legacyAvailability, ...offeringAvailability].filter(
        (slot, index, all) =>
          all.findIndex(
            (item) => item.day === slot.day && item.start === slot.start && item.end === slot.end
          ) === index
      )
      return {
        id: userId,
        status: membership.status,
        name: profile?.name || user.nickname || user.displayName || user.name || 'Coach',
        phone: profile?.phone || user.phone || user.contact?.phone || '',
        bio: profile?.bio || '',
        profileComplete:
          profile?.profileComplete === true ||
          Boolean(user.nickname || user.displayName || user.name),
        availability,
        canManageSchoolBookings: membership.canManageSchoolBookings === true,
      }
    })
  )
  return NextResponse.json({ teachers: teachers.sort((a, b) => a.name.localeCompare(b.name)) })
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = (await request.json().catch(() => ({}))) as {
    teacherId?: unknown
    canManageSchoolBookings?: unknown
  }
  if (typeof body.teacherId !== 'string' || typeof body.canManageSchoolBookings !== 'boolean') {
    return NextResponse.json({ error: 'Permiso inválido.' }, { status: 400 })
  }
  const membershipRef = adminDb.collection('schoolMemberships').doc(`${schoolId}_${body.teacherId}`)
  const membershipSnapshot = await membershipRef.get()
  const membership = membershipSnapshot.data() as SchoolMembership | undefined
  if (
    !membershipSnapshot.exists ||
    membership?.schoolId !== schoolId ||
    membership.status !== 'active' ||
    !schoolMembershipHasRole(membership, 'teacher')
  ) {
    return NextResponse.json(
      { error: 'Entrenador no encontrado en esta escuela.' },
      { status: 404 }
    )
  }
  await membershipRef.update({
    canManageSchoolBookings: body.canManageSchoolBookings,
    updatedAt: Date.now(),
  })
  return NextResponse.json({ canManageSchoolBookings: body.canManageSchoolBookings })
}
