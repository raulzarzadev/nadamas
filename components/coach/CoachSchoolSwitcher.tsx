'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { schoolMembershipHasRole } from '@/lib/school'
import CoachScopeBar from './CoachScopeBar'

export default function CoachSchoolSwitcher() {
  const tenant = useTenantSchool()
  const pathname = usePathname()
  return tenant ||
    pathname.startsWith('/coach/agenda') ||
    pathname.startsWith('/coach/students') ||
    // Coach Planes is always the personal space (school payments live in Coordinador mode).
    pathname.startsWith('/coach/payments') ? null : (
    <GlobalCoachSchoolSwitcher />
  )
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
    <div className="flex">
      <CoachScopeBar
        options={[
          { id: 'personal', label: 'Mis clases particulares' },
          ...coachSchools.map(({ school }) => ({ id: school.id, label: school.name })),
        ]}
        value={activeSchoolId || 'personal'}
        defaultValue="personal"
        onChange={(id) => (id === 'personal' ? selectPersonal() : selectSchool(id))}
      />
    </div>
  )
}
