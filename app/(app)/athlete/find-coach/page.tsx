'use client'

import { useEffect, useState } from 'react'
import AthleteBookingsOverview from '@/components/athlete/AthleteBookingsOverview'
import AthleteSchoolSchedule from '@/components/athlete/AthleteSchoolSchedule'
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
  const [schools, setSchools] = useState<PublicSchoolOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/public/schools')
      .then((response) => response.json() as Promise<{ schools?: PublicSchoolOption[] }>)
      .then((payload) => setSchools(payload.schools || []))
      .catch(() => setSchools([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <AthleteBookingsOverview view="upcoming" />
      {!loading &&
        (tenant ? (
          <AthleteSchoolSchedule
            key={tenant.id}
            schoolId={tenant.id}
            schoolName={tenant.name}
            title="Horarios"
            description={`Consulta horarios disponibles de los entrenadores de ${tenant.name}.`}
            bookingMode={tenant.bookingMode || 'request'}
          />
        ) : (
          <AthleteSchoolSchedule
            key="public-directory"
            schoolId={null}
            title="Coaches independientes"
            description="Consulta horarios disponibles de coaches que ofrecen clases por cuenta propia."
            bookingMode="direct"
            schools={schools}
          />
        ))}
    </div>
  )
}
