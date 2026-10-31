'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import AthleteBookingsOverview from '@/components/athlete/AthleteBookingsOverview'
import AthleteSearchBar from '@/components/athlete/AthleteSearchBar'
import { useTenantSchool } from '@/context/TenantSchoolContext'

// Search available hours above the athlete's upcoming classes.
export default function AthleteSchedulePage() {
  const tenant = useTenantSchool()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Old links (?search=, ?schoolId=) meant the search view.
  useEffect(() => {
    if (searchParams.has('search') || searchParams.has('schoolId'))
      router.replace(`/athlete/schedule/find?${searchParams}`)
  }, [searchParams, router])

  return (
    <div className="flex flex-col gap-4">
      <AthleteSearchBar schoolId={tenant?.id} defaultTab="schedules" />
      <AthleteBookingsOverview view="upcoming" inline />
    </div>
  )
}
