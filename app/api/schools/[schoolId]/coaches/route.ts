import { NextResponse } from 'next/server'
import type { SchoolMembership } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { legacySchoolOfferings, schoolScheduleOwners } from '@/lib/server/school-agenda'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ schoolId: string }>
  }
) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response
  const snapshot = await adminDb
    .collection('schoolMemberships')
    .where('schoolId', '==', schoolId)
    .get()
  const memberships = schoolScheduleOwners(
    snapshot.docs.map((doc) => doc.data() as SchoolMembership)
  )
  const coaches = await Promise.all(
    memberships.map(async ({ userId }) => {
      const [userSnapshot, profileSnapshot, offeringsSnapshot, availabilitySnapshot] =
        await Promise.all([
          adminDb.collection('users').doc(userId).get(),
          adminDb.collection('schoolProfiles').doc(`${schoolId}_${userId}`).get(),
          adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${userId}`).get(),
          adminDb.collection('schoolAvailability').doc(`${schoolId}_${userId}`).get(),
        ])
      const user = userSnapshot.data() || {}
      const profile = profileSnapshot.data() || {}
      return {
        id: userId,
        name: profile.name || user.nickname || user.displayName || user.name || 'Coach',
        avatarUrl: user.photoURL || user.photoUrl || null,
        classOfferings: offeringsSnapshot.exists
          ? offeringsSnapshot.data()?.classOfferings || []
          : legacySchoolOfferings(availabilitySnapshot.data()?.weeklySlots),
        teachingLocations: [],
        priceOptions: [],
      }
    })
  )
  return NextResponse.json({ coaches: coaches.sort((a, b) => a.name.localeCompare(b.name)) })
}
