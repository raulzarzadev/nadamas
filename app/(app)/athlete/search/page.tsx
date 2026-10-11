import { redirect } from 'next/navigation'
import AthleteSearch from '@/components/athlete/AthleteSearch'
import { getTenantSchool } from '@/lib/server/tenant-school'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const schoolId = typeof query.school === 'string' ? query.school : ''
  if (schoolId)
    redirect(
      `/athlete/search/school/${encodeURIComponent(schoolId)}${'schedules' in query ? '/schedule' : ''}`
    )
  const tenant = await getTenantSchool()
  return (
    <AthleteSearch schoolId={tenant?.id} initialTab={'school' in query ? 'schools' : 'coaches'} />
  )
}
