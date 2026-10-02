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
  const scheduleTitle = selectedId || tenant ? 'Horarios' : 'Coaches independientes'
  const scheduleDescription = schoolName
    ? `Consulta horarios disponibles de los entrenadores de ${schoolName}.`
    : terminology.schoolId
      ? `Consulta horarios disponibles de tus ${terminology.coachPlural}.`
      : 'Consulta horarios disponibles de coaches que ofrecen clases por cuenta propia.'
  return (
    <div className="flex flex-col gap-4">
      {status === 'ready' &&
        (tenant ? (
          <AthleteSchoolSchedule
            key={tenant.id}
            schoolId={tenant.id}
            schoolName={tenant.name}
            title={scheduleTitle}
            description={scheduleDescription}
            bookingMode={tenant.bookingMode || 'request'}
          />
        ) : selectedId ? (
          <AthleteSchoolSchedule
            key={selectedId}
            schoolId={selectedId}
            schoolName={selected?.school.name}
            title={scheduleTitle}
            description={scheduleDescription}
            bookingMode={selected?.school.bookingMode || 'request'}
          />
        ) : (
          <AthleteSchoolSchedule
            key="all-schools"
            schoolId={null}
            title={scheduleTitle}
            description={scheduleDescription}
            bookingMode="direct"
            schools={schools}
          />
        ))}
    </div>
  )
}
