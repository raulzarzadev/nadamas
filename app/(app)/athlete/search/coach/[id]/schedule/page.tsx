import { notFound } from 'next/navigation'
import AthleteSchoolSchedule from '@/components/athlete/AthleteSchoolSchedule'
import ScheduleHeader from '@/components/athlete/ScheduleHeader'
import { getPublicCoachDetail } from '@/lib/server/public-coach'
import { resolveSlug } from '@/lib/server/slugs'
import { getTenantSchool } from '@/lib/server/tenant-school'

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
  const target = await resolveSlug(id, 'coach')
  if (!target) notFound()
  const detail = await getPublicCoachDetail(target.uid)
  if (!detail) notFound()
  return (
    <div className="grid gap-4">
      <ScheduleHeader name={detail.name} searchTab="coaches" schoolId={tenant?.id} />
      <AthleteSchoolSchedule
        schoolId={schoolId}
        coachId={target.uid}
        bookingMode={tenant?.bookingMode || 'direct'}
      />
    </div>
  )
}
