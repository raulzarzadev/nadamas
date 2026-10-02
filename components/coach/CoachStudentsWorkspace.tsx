'use client'

import { useMemo } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { capitalizeSchoolTerm, schoolMembershipHasRole } from '@/lib/school'
import CoachSchoolStudents from './CoachSchoolStudents'
import CoachStudents from './CoachStudents'

export default function CoachStudentsWorkspace() {
  const { schools, selectedId, isPersonal, status } = useSchoolSelection({ includePersonal: true })
  const terminology = useSchoolTerminology()
  const hasSchoolSelection = useMemo(
    () =>
      schools.some(
        ({ school, membership }) =>
          school.id === selectedId &&
          membership.status === 'active' &&
          schoolMembershipHasRole(membership, 'teacher')
      ),
    [schools, selectedId]
  )
  const hasActiveSchool = !isPersonal && hasSchoolSelection

  if (status !== 'ready') return null
  const participantPlural = terminology.schoolId ? terminology.participantPlural : 'alumnos'
  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">{capitalizeSchoolTerm(participantPlural)}</h1>
        <p className="text-[var(--c-text-2)]">
          {hasActiveSchool
            ? 'Aquí aparecen alumnos con una clase próxima y los últimos tres alumnos a quienes diste clase.'
            : 'Personas de tus clases personales.'}
        </p>
      </div>
      {hasActiveSchool ? <CoachSchoolStudents /> : <CoachStudents />}
    </>
  )
}
