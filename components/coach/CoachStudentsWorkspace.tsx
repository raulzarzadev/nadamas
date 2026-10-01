'use client'

import { useMemo } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { schoolMembershipHasRole } from '@/lib/school'
import CoachSchoolStudents from './CoachSchoolStudents'
import CoachStudents from './CoachStudents'

export default function CoachStudentsWorkspace() {
  const { schools, selectedId, isPersonal, status } = useSchoolSelection({ includePersonal: true })
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
  return hasActiveSchool ? <CoachSchoolStudents /> : <CoachStudents />
}
