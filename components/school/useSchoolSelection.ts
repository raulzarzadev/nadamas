'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAuthed } from '@/lib/client/authed-api'
import type { School, SchoolMembership } from '@/lib/school'

export const SCHOOL_SELECTION_EVENT = 'nadamas:school-selection-changed'

export interface SchoolAccessClient {
  school: School
  membership: SchoolMembership
}

export function useSchoolSelection({
  includePersonal = false,
}: {
  includePersonal?: boolean
} = {}) {
  const [schools, setSchools] = useState<SchoolAccessClient[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPersonal, setIsPersonal] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const stored = window.localStorage.getItem('nadamas.schoolId')
    const storedCoachSelection = window.localStorage.getItem('nadamas.coachSelection')
    getAuthed('/api/schools')
      .then(
        (response) =>
          response.json() as Promise<{
            schools?: SchoolAccessClient[]
            ownedSchool?: School | null
          }>
      )
      .then((payload) => {
        const next = payload.schools || []
        setSchools(next)
        if (includePersonal && storedCoachSelection !== null) {
          if (storedCoachSelection === 'personal') {
            setSelectedId(null)
            setIsPersonal(true)
            setStatus('ready')
            return
          }
          if (next.some((item) => item.school.id === storedCoachSelection)) {
            setSelectedId(storedCoachSelection)
            setIsPersonal(false)
            window.localStorage.setItem('nadamas.schoolId', storedCoachSelection)
            setStatus('ready')
            return
          }
        }
        if (includePersonal) {
          setSelectedId(null)
          setIsPersonal(true)
          setStatus('ready')
          return
        }
        const preferred =
          stored && next.some((item) => item.school.id === stored)
            ? stored
            : payload.ownedSchool?.id || next[0]?.school.id || null
        setSelectedId(preferred)
        setIsPersonal(false)
        if (preferred) window.localStorage.setItem('nadamas.schoolId', preferred)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [includePersonal])

  useEffect(() => {
    function handleSelectionChange(event: Event) {
      const selection = (event as CustomEvent<string | null>).detail
      if (selection === null && includePersonal) {
        setSelectedId(null)
        setIsPersonal(true)
      } else if (typeof selection === 'string') {
        setSelectedId(selection)
        setIsPersonal(false)
      }
    }
    window.addEventListener(SCHOOL_SELECTION_EVENT, handleSelectionChange)
    return () => window.removeEventListener(SCHOOL_SELECTION_EVENT, handleSelectionChange)
  }, [includePersonal])

  const selected = useMemo(
    () =>
      isPersonal
        ? null
        : schools.find((item) => item.school.id === selectedId) ||
          (includePersonal ? null : schools[0]) ||
          null,
    [includePersonal, isPersonal, schools, selectedId]
  )

  const selectSchool = useCallback((schoolId: string) => {
    setIsPersonal(false)
    setSelectedId(schoolId)
    window.localStorage.setItem('nadamas.schoolId', schoolId)
    window.localStorage.setItem('nadamas.coachSelection', schoolId)
    window.dispatchEvent(
      new CustomEvent<string | null>(SCHOOL_SELECTION_EVENT, { detail: schoolId })
    )
  }, [])

  const selectPersonal = useCallback(() => {
    setIsPersonal(true)
    setSelectedId(null)
    window.localStorage.setItem('nadamas.coachSelection', 'personal')
    window.dispatchEvent(new CustomEvent<string | null>(SCHOOL_SELECTION_EVENT, { detail: null }))
  }, [])

  return {
    schools,
    selected,
    selectedId: selected?.school.id || null,
    isPersonal,
    status,
    selectSchool,
    selectPersonal,
  }
}
