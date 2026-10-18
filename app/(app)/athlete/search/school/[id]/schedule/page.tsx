import { notFound } from 'next/navigation'
import AthleteSchoolSchedule from '@/components/athlete/AthleteSchoolSchedule'
import ScheduleHeader from '@/components/athlete/ScheduleHeader'
import { getSchoolById } from '@/lib/server/schools'

export default async function SchoolSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: schoolId } = await params
  if (schoolId.includes('/') || schoolId.length > 160) notFound()
  const school = await getSchoolById(schoolId)
  if (!school?.isPublic) notFound()
  return (
    <div className="grid gap-4">
      <ScheduleHeader name={school.name} searchTab="schools" />
      <AthleteSchoolSchedule
        schoolId={school.id}
        schoolName={school.name}
        bookingMode={school.bookingMode || 'request'}
      />
    </div>
  )
}
