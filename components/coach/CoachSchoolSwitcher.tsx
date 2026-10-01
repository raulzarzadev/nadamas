'use client'

import { useEffect, useMemo } from 'react'
import SchoolWorkspaceTabs from '@/components/school/SchoolWorkspaceTabs'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { schoolMembershipHasRole } from '@/lib/school'

export default function CoachSchoolSwitcher() {
  const tenant = useTenantSchool()
  return tenant ? null : <GlobalCoachSchoolSwitcher />
}

function GlobalCoachSchoolSwitcher() {
  const { schools, selectedId, isPersonal, status, selectSchool, selectPersonal } =
    useSchoolSelection({ includePersonal: true })
  const coachSchools = useMemo(
    () =>
      schools.filter(
        ({ membership }) =>
          membership.status === 'active' && schoolMembershipHasRole(membership, 'teacher')
      ),
    [schools]
  )
  const activeSchoolId =
    !isPersonal && coachSchools.some(({ school }) => school.id === selectedId) ? selectedId : null

  useEffect(() => {
    if (status === 'ready' && !isPersonal && !activeSchoolId) selectPersonal()
  }, [activeSchoolId, isPersonal, selectPersonal, status])

  if (status !== 'ready' || !coachSchools.length) return null

  return (
    <SchoolWorkspaceTabs
      schools={coachSchools.map(({ school }) => ({ id: school.id, name: school.name }))}
      selectedId={activeSchoolId}
      description="Escuelas en las que formas parte como entrenador"
      onChange={(id) => (id ? selectSchool(id) : selectPersonal())}
    />
  )
}
