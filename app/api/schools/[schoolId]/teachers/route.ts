import { NextResponse } from 'next/server'
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
      const profileSnapshot = await adminDb
        .collection('schoolProfiles')
        .doc(`${schoolId}_${userId}`)
        .get()
      const userSnapshot = await adminDb.collection('users').doc(userId).get()
      const profile = profileSnapshot.exists
        ? (profileSnapshot.data() as Omit<SchoolTeacherProfile, 'id'>)
        : null
      const user = userSnapshot.data() || {}
      const availabilitySnapshot = await adminDb
        .collection('schoolAvailability')
        .doc(`${schoolId}_${userId}`)
        .get()
      return {
        id: userId,
        name: profile?.name || user.nickname || user.displayName || user.name || 'Coach',
        phone: profile?.phone || user.phone || '',
        bio: profile?.bio || '',
        profileComplete: profile?.profileComplete || false,
        availability: availabilitySnapshot.exists
          ? availabilitySnapshot.data()?.weeklySlots || []
          : [],
      }
    })
  )
  return NextResponse.json({ teachers: teachers.sort((a, b) => a.name.localeCompare(b.name)) })
}
