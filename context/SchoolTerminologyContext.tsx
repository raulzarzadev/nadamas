'use client'

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useRole } from '@/context/RoleContext'
import type { RoleName } from '@/lib/roles'
import { type School, type SchoolTerminologyLabels, schoolTerminologyLabels } from '@/lib/school'

export const SCHOOL_TERMINOLOGY_UPDATE_EVENT = 'nadamas:school-terminology-updated'

export interface SchoolTerminologyContextValue extends SchoolTerminologyLabels {
  schoolId: string | null
}

const DEFAULT_LABELS: SchoolTerminologyContextValue = {
  ...schoolTerminologyLabels(),
  schoolId: null,
}
const SchoolTerminologyContext = createContext<SchoolTerminologyContextValue>(DEFAULT_LABELS)

export function SchoolTerminologyProvider({
  mode,
  children,
}: {
  mode?: RoleName
  children: ReactNode
}) {
  const { activeRole } = useRole()
  const role = mode || activeRole
  const isSchoolMode = role === 'school' || role === 'coach' || role === 'athlete'
  const { selected } = useSchoolSelection({
    includePersonal: role === 'coach' || role === 'athlete',
    athleteMode: role === 'athlete',
  })
  const selectedSchool = isSchoolMode ? selected?.school : undefined
  const [updatedSchool, setUpdatedSchool] = useState<School | null>(null)

  useEffect(() => {
    function handleSchoolUpdated(event: Event) {
      const school = (event as CustomEvent<School>).detail
      if (school?.id === selectedSchool?.id) setUpdatedSchool(school)
    }
    window.addEventListener(SCHOOL_TERMINOLOGY_UPDATE_EVENT, handleSchoolUpdated)
    return () => window.removeEventListener(SCHOOL_TERMINOLOGY_UPDATE_EVENT, handleSchoolUpdated)
  }, [selectedSchool?.id])

  const labels = useMemo(
    () =>
      schoolTerminologyLabels(
        updatedSchool && updatedSchool.id === selectedSchool?.id
          ? updatedSchool.terminology
          : selectedSchool?.terminology
      ),
    [selectedSchool?.id, selectedSchool?.terminology, updatedSchool]
  )

  const value = useMemo(
    () => ({ ...labels, schoolId: selectedSchool?.id || null }),
    [labels, selectedSchool?.id]
  )

  return (
    <SchoolTerminologyContext.Provider value={value}>{children}</SchoolTerminologyContext.Provider>
  )
}

export function useSchoolTerminology() {
  return useContext(SchoolTerminologyContext)
}
