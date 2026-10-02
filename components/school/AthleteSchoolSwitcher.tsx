'use client'

import { useTenantSchool } from '@/context/TenantSchoolContext'

import SchoolWorkspaceTabs from './SchoolWorkspaceTabs'
import { useSchoolSelection } from './useSchoolSelection'

export default function AthleteSchoolSwitcher() {
  const tenant = useTenantSchool()
  return tenant ? null : <GlobalAthleteSchoolSwitcher />
}

function GlobalAthleteSchoolSwitcher() {
  const { schools, selectedId, status, selectSchool, selectPersonal } = useSchoolSelection({
    includePersonal: true,
    athleteMode: true,
  })
  if (status !== 'ready') return null
  return (
    <SchoolWorkspaceTabs
      schools={schools.map(({ school }) => ({ id: school.id, name: school.name }))}
      selectedId={selectedId}
      personalLabel="Todos"
      description="Horarios de tus escuelas o coaches disponibles."
      onChange={(id) => (id ? selectSchool(id) : selectPersonal())}
    />
  )
}
