'use client'

import { useMemo, useState } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { capitalizeSchoolTerm, schoolMembershipHasRole } from '@/lib/school'
import CoachAllStudents from './CoachAllStudents'
import CoachSchoolStudents from './CoachSchoolStudents'
import CoachScopeBar from './CoachScopeBar'

export default function CoachStudentsWorkspace() {
  const { schools, status } = useSchoolSelection({ includePersonal: true })
  const terminology = useSchoolTerminology()
  const tenant = useTenantSchool()
  const [view, setView] = useState('all')
  const coachSchools = useMemo(
    () =>
      schools.filter(
        ({ school, membership }) =>
          (!tenant || school.id === tenant.id) &&
          membership.status === 'active' &&
          schoolMembershipHasRole(membership, 'teacher')
      ),
    [schools, tenant]
  )
  const allSchools = useMemo(
    () => coachSchools.map(({ school }) => ({ id: school.id, name: school.name })),
    [coachSchools]
  )
  const activeView = tenant ? `school:${tenant.id}` : view
  if (status === 'loading') return <ProfileLoadingSkeleton />
  if (status === 'error')
    return <p role="alert">No pudimos cargar tus datos. Inténtalo de nuevo.</p>
  const participantPlural = terminology.schoolId ? terminology.participantPlural : 'alumnos'
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">{capitalizeSchoolTerm(participantPlural)}</h1>
      {!tenant && (
        <div className="flex">
          <CoachScopeBar
            options={[
              { id: 'all', label: `Todos mis ${participantPlural}` },
              { id: 'personal', label: 'Mis clases particulares' },
              ...coachSchools.map(({ school }) => ({
                id: `school:${school.id}`,
                label: school.name,
              })),
            ]}
            value={activeView}
            defaultValue="all"
            onChange={setView}
          />
        </div>
      )}
      {!tenant && (activeView === 'all' || activeView === 'personal') && (
        <CoachAllStudents
          key={activeView}
          schools={allSchools}
          personalOnly={activeView === 'personal'}
        />
      )}
      {coachSchools
        .filter(({ school }) => activeView === `school:${school.id}`)
        .map(({ school }) => (
          <div key={school.id}>
            <CoachSchoolStudents schoolId={school.id} />
          </div>
        ))}
    </div>
  )
}
