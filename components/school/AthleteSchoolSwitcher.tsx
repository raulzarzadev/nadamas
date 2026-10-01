'use client'

import SchoolWorkspaceTabs from './SchoolWorkspaceTabs'
import { useSchoolSelection } from './useSchoolSelection'

export default function AthleteSchoolSwitcher() {
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
      description="Escuelas de las que formas parte."
      onChange={(id) => (id ? selectSchool(id) : selectPersonal())}
    />
  )
}
