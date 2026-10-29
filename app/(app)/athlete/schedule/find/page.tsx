'use client'

import { useSearchParams } from 'next/navigation'
import AthleteScheduleBrowser from '@/components/athlete/AthleteScheduleBrowser'
import AthleteSearchBar from '@/components/athlete/AthleteSearchBar'
import { useTenantSchool } from '@/context/TenantSchoolContext'

// Deep-link view of the schedule search (old ?search= / ?schoolId= links, public tenant entry).
export default function FindSchedulePage() {
  const tenant = useTenantSchool()
  const searchParams = useSearchParams()
  return (
    <div className="flex flex-col gap-4">
      <AthleteSearchBar
        schoolId={tenant?.id}
        initialTab={
          searchParams.get('search') === 'schools'
            ? 'schools'
            : searchParams.get('search') === 'coaches'
              ? 'coaches'
              : undefined
        }
      />
      <AthleteScheduleBrowser requestedSchoolId={searchParams.get('schoolId')} />
    </div>
  )
}
