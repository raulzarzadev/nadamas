import { notFound, redirect } from 'next/navigation'
import SchoolPublicHome from '@/components/school/SchoolPublicHome'
import { upcomingPublicSchoolEvents } from '@/lib/server/school-events'
import { getSchoolById } from '@/lib/server/schools'

export default async function SchoolSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id: schoolId } = await params
  const query = await searchParams
  if (schoolId.includes('/') || schoolId.length > 160) notFound()
  const school = await getSchoolById(schoolId)
  if (!school?.isPublic) notFound()
  if ('schedules' in query)
    redirect(`/athlete/search/school/${encodeURIComponent(schoolId)}/schedule`)
  return (
    <SchoolPublicHome school={school} publicEvents={await upcomingPublicSchoolEvents(school)} />
  )
}
