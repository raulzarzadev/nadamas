import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import { notFound, redirect } from 'next/navigation'
import AthleteSchoolCoachSchedule from '@/components/school/AthleteSchoolCoachSchedule'
import { getPublicCoachDetail } from '@/lib/server/public-coach'
import { resolveSlug } from '@/lib/server/slugs'
import { getTenantSchool } from '@/lib/server/tenant-school'

interface AthleteCoachViewProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ schoolId?: string }>
}

export default async function AthleteCoachView({ params, searchParams }: AthleteCoachViewProps) {
  const { id } = await params
  const tenant = await getTenantSchool()
  const schoolId = tenant?.id || (await searchParams).schoolId
  if (schoolId) return <AthleteSchoolCoachSchedule schoolId={schoolId} coachId={id} />
  const target = await resolveSlug(id, 'coach')
  if (!target) notFound()

  const detail = await getPublicCoachDetail(target.uid)
  if (!detail) notFound()

  if (detail.coachSlug && detail.coachSlug !== id) {
    redirect(`/${detail.coachSlug}`)
  }

  return (
    <CoachPublicProfile
      coach={detail.coach}
      name={detail.name}
      avatarUrl={detail.avatarUrl}
      bookedSlots={detail.bookedSlots}
      blockedSlots={detail.blockedSlots}
    />
  )
}
