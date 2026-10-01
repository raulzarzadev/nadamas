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
  const access = await requireSchoolAccess(request, schoolId, [
    'director',
    'teacher',
    'guardian',
    'student',
  ])
  if (access.response) return access.response

  const membershipSnapshot = await adminDb
    .collection('schoolMemberships')
    .where('schoolId', '==', schoolId)
    .get()
  const memberships = membershipSnapshot.docs.filter((doc) => {
    return schoolMembershipHasRole(doc.data() as SchoolMembership, 'teacher')
  })
  const teachers = await Promise.all(
    memberships.map(async (membership) => {
      const userId = membership.data().userId as string
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
        name: profile?.name || user.nickname || user.displayName || user.name || 'Coach',
        phone: profile?.phone || user.phone || user.contact?.phone || '',
        bio: profile?.bio || '',
        profileComplete:
          profile?.profileComplete === true ||
          Boolean(user.nickname || user.displayName || user.name),
        availability,
      }
    })
  )
  return NextResponse.json({ teachers: teachers.sort((a, b) => a.name.localeCompare(b.name)) })
}
