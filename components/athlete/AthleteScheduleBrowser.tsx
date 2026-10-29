'use client'

import { useEffect, useMemo, useState } from 'react'
import AthleteSchoolSchedule from '@/components/athlete/AthleteSchoolSchedule'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { tenantDisplayName, useTenantSchool } from '@/context/TenantSchoolContext'
import type { SchoolBookingMode } from '@/lib/school'

interface PublicSchoolOption {
  id: string
  name: string
  bookingMode: SchoolBookingMode
  showCoachesSchedules: boolean
}

/** The available-hours calendar (own schools + independent coaches), shared by Horarios search. */
export default function AthleteScheduleBrowser({
  requestedSchoolId,
}: {
  requestedSchoolId?: string | null
}) {
  const tenant = useTenantSchool()
  const [schools, setSchools] = useState<PublicSchoolOption[]>([])
  const [loading, setLoading] = useState(true)
  const initialSchoolId = schools.some((school) => school.id === requestedSchoolId)
    ? requestedSchoolId || undefined
    : undefined
  // Load agendas only for the athlete's own schools (plus one picked from search): each school
  // costs an agenda fetch, a roster fetch and a realtime listener. Other schools come via search.
  const { schools: memberSchools, status: membershipStatus } = useSchoolSelection({
    includePersonal: true,
    athleteMode: true,
  })
  const memberKey = memberSchools
    .map((item) => item.school.id)
    .sort()
    .join(',')
  // Memoized: AthleteSchoolSchedule reloads whenever this array identity changes.
  const scheduleSchools = useMemo(() => {
    const memberIds = new Set(memberKey.split(','))
    return schools.filter((school) => memberIds.has(school.id) || school.id === initialSchoolId)
  }, [schools, memberKey, initialSchoolId])

  useEffect(() => {
    fetch('/api/public/schools')
      .then((response) => response.json() as Promise<{ schools?: PublicSchoolOption[] }>)
      .then((payload) => setSchools(payload.schools || []))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {!loading &&
        (tenant || membershipStatus !== 'loading') &&
        (tenant ? (
          <AthleteSchoolSchedule
            key={tenant.id}
            schoolId={tenant.id}
            schoolName={tenantDisplayName(tenant)}
            bookingMode={tenant.bookingMode || 'request'}
          />
        ) : (
          <AthleteSchoolSchedule
            key={`public-directory-${initialSchoolId || 'all'}-${scheduleSchools.length}`}
            initialSchoolId={initialSchoolId}
            schoolId={null}
            bookingMode="direct"
            schools={scheduleSchools}
          />
        ))}
    </div>
  )
}
