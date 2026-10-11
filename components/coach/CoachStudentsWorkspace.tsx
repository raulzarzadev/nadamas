'use client'

import { useMemo, useState } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { capitalizeSchoolTerm, schoolMembershipHasRole } from '@/lib/school'
import CoachAllStudents from './CoachAllStudents'
import CoachSchoolStudents from './CoachSchoolStudents'

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
      <h1 className="text-3xl font-extrabold">{capitalizeSchoolTerm(participantPlural)}</h1>
      {!tenant && (
        <nav aria-label="Filtrar alumnos por origen" className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'personal', label: 'Solo míos' },
            ...coachSchools.map(({ school }) => ({
              id: `school:${school.id}`,
              label: school.name,
            })),
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={activeView === option.id}
              onClick={() => setView(option.id)}
              className={`min-h-11 shrink-0 rounded-full border px-5 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${activeView === option.id ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface)'}`}
            >
              {option.label}
            </button>
          ))}
        </nav>
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
