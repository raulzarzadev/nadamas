'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import AthleteBookingsOverview from '@/components/athlete/AthleteBookingsOverview'
import AthleteSchoolSchedule from '@/components/athlete/AthleteSchoolSchedule'
import AthleteSearchBar from '@/components/athlete/AthleteSearchBar'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import type { SchoolBookingMode } from '@/lib/school'

interface PublicSchoolOption {
  id: string
  name: string
  bookingMode: SchoolBookingMode
  showCoachesSchedules: boolean
}

export default function FindCoachPage() {
  const tenant = useTenantSchool()
  const searchParams = useSearchParams()
  const requestedSchoolId = searchParams.get('schoolId')
  const [schools, setSchools] = useState<PublicSchoolOption[]>([])
  const [loading, setLoading] = useState(true)
  const initialSchoolId = schools.some((school) => school.id === requestedSchoolId)
    ? requestedSchoolId || undefined
    : undefined

  useEffect(() => {
    fetch('/api/public/schools')
      .then((response) => response.json() as Promise<{ schools?: PublicSchoolOption[] }>)
      .then((payload) => setSchools(payload.schools || []))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false))
  }, [])

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
      {!loading &&
        (tenant ? (
          <AthleteSchoolSchedule
            toolbarActions={<AthleteBookingsOverview view="upcoming" compact />}
            key={tenant.id}
            schoolId={tenant.id}
            schoolName={tenant.name}
            bookingMode={tenant.bookingMode || 'request'}
          />
        ) : (
          <AthleteSchoolSchedule
            toolbarActions={<AthleteBookingsOverview view="upcoming" compact />}
            key={`public-directory-${initialSchoolId || 'all'}`}
            initialSchoolId={initialSchoolId}
            schoolId={null}
            bookingMode="direct"
            schools={schools}
          />
        ))}
    </div>
  )
}
