import { notFound } from 'next/navigation'
import AthleteSchoolSchedule from '@/components/athlete/AthleteSchoolSchedule'
import ScheduleHeader from '@/components/athlete/ScheduleHeader'
import type { SchoolMembership } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { getPublicCoachDetail } from '@/lib/server/public-coach'
import { schoolScheduleOwners } from '@/lib/server/school-agenda'
import { resolveSlug } from '@/lib/server/slugs'
import { getTenantSchool } from '@/lib/server/tenant-school'

// A school's profe may have no public coach profile ("Horarios por publicar"); inside that
// school they are found through their membership instead.
async function getSchoolCoach(schoolId: string, uid: string) {
  const membership = await adminDb.collection('schoolMemberships').doc(`${schoolId}_${uid}`).get()
  if (!membership.exists || !schoolScheduleOwners([membership.data() as SchoolMembership]).length)
    return null
  const [user, profile] = await Promise.all([
    adminDb.collection('users').doc(uid).get(),
    adminDb.collection('schoolProfiles').doc(`${schoolId}_${uid}`).get(),
  ])
  const userData = user.data() || {}
  return {
    uid,
    name:
      profile.data()?.name || userData.nickname || userData.displayName || userData.name || 'Coach',
  }
}

export default async function CoachSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ schoolId?: string }>
}) {
  const { id } = await params
  const tenant = await getTenantSchool()
  const schoolId = tenant?.id || (await searchParams).schoolId || null
  const schoolCoach = schoolId ? await getSchoolCoach(schoolId, id) : null
  let coach = schoolCoach
  if (!coach) {
    const target = await resolveSlug(id, 'coach')
    if (!target) notFound()
    const detail = await getPublicCoachDetail(target.uid)
    if (!detail) notFound()
    coach = { uid: target.uid, name: detail.name }
  }
  return (
    <div className="grid gap-4">
      <ScheduleHeader name={coach.name} searchTab="coaches" schoolId={tenant?.id} />
      <AthleteSchoolSchedule
        schoolId={schoolId}
        coachId={coach.uid}
        bookingMode={tenant?.bookingMode || 'direct'}
      />
    </div>
  )
}
