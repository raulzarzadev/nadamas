'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import CoachAgenda from '@/components/coach/CoachAgenda'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'

export default function AthleteSchoolCoachSchedule({
  schoolId,
  coachId,
}: {
  schoolId: string
  coachId: string
}) {
  const router = useRouter()
  const { selectedId, status } = useSchoolSelection({ includePersonal: true, athleteMode: true })
  useEffect(() => {
    if (status === 'ready' && selectedId !== schoolId) router.replace('/athlete/find-coach')
  }, [status, selectedId, schoolId, router])
  if (status !== 'ready' || selectedId !== schoolId) return null
  return <CoachAgenda schoolId={schoolId} coachId={coachId} aggregateSchool readOnly />
}
