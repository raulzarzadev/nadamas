'use client'

import AthleteSchoolSchedule from '@/components/athlete/AthleteSchoolSchedule'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { useTenantSchool } from '@/context/TenantSchoolContext'

export default function FindCoachPage() {
  const { selected, schools, selectedId, status } = useSchoolSelection({
    includePersonal: true,
    athleteMode: true,
  })
  const terminology = useSchoolTerminology()
  const tenant = useTenantSchool()
  const schoolName = tenant?.name || selected?.school.name
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h1 className="text-2xl font-extrabold text-[var(--c-ocean)]">Horarios</h1>
          <p className="text-xs text-[var(--c-text-2)]">
            {schoolName ? (
              <>
                Consulta horarios disponibles de los entrenadores de{' '}
                <strong className="font-semibold text-(--c-ocean)">{schoolName}</strong>.
              </>
            ) : terminology.schoolId ? (
              `Consulta horarios disponibles de tus ${terminology.coachPlural}.`
            ) : (
              'Consulta horarios disponibles de coaches abiertos.'
            )}
          </p>
        </div>
      </header>
      {status === 'ready' &&
        (tenant ? (
          <AthleteSchoolSchedule
            key={tenant.id}
            schoolId={tenant.id}
            schoolName={tenant.name}
            bookingMode={tenant.bookingMode || 'request'}
          />
        ) : selectedId ? (
          <AthleteSchoolSchedule
            key={selectedId}
            schoolId={selectedId}
            schoolName={selected?.school.name}
            bookingMode={selected?.school.bookingMode || 'request'}
          />
        ) : (
          <AthleteSchoolSchedule
            key="all-schools"
            schoolId={null}
            bookingMode="direct"
            schools={schools}
          />
        ))}
    </div>
  )
}
