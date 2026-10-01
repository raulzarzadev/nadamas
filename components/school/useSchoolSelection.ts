'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAuthed } from '@/lib/client/authed-api'
import type { School, SchoolMembership } from '@/lib/school'
import { schoolsForWorkspace } from '@/lib/school-workspace'

export const SCHOOL_SELECTION_EVENT = 'nadamas:school-selection-changed'

export interface SchoolAccessClient {
  school: School
  membership: SchoolMembership
}

export function useSchoolSelection({
  includePersonal = false,
  athleteMode = false,
}: {
  includePersonal?: boolean
  athleteMode?: boolean
} = {}) {
  const selectionKey = athleteMode
    ? 'nadamas.athleteSelection'
    : includePersonal
      ? 'nadamas.coachSelection'
      : 'nadamas.schoolId'
  const [schools, setSchools] = useState<SchoolAccessClient[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPersonal, setIsPersonal] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const stored = window.localStorage.getItem('nadamas.schoolId')
    getAuthed('/api/schools')
      .then(
        (response) =>
          response.json() as Promise<{
            schools?: SchoolAccessClient[]
            ownedSchool?: School | null
          }>
      )
      .then((payload) => {
        const storedCoachSelection = window.localStorage.getItem(selectionKey)
        const next = athleteMode
          ? (payload.schools || []).filter(({ membership }) => membership.status === 'active')
          : schoolsForWorkspace(payload.schools || [], includePersonal)
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
            : next.find((item) => item.school.id === payload.ownedSchool?.id)?.school.id ||
              next[0]?.school.id ||
              null
        setSelectedId(preferred)
        setIsPersonal(false)
        if (preferred) window.localStorage.setItem('nadamas.schoolId', preferred)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [athleteMode, includePersonal, selectionKey])

  useEffect(() => {
    function handleSelectionChange(event: Event) {
      const detail = (event as CustomEvent<{ schoolId: string | null; selectionKey: string }>)
        .detail
      if (detail.selectionKey !== selectionKey) return
      const selection = detail.schoolId
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
  }, [includePersonal, selectionKey])

  const selected = useMemo(
    () =>
      isPersonal
        ? null
        : schools.find((item) => item.school.id === selectedId) ||
          (includePersonal ? null : schools[0]) ||
          null,
    [includePersonal, isPersonal, schools, selectedId]
  )

  const selectSchool = useCallback(
    (schoolId: string) => {
      if (!schools.some((item) => item.school.id === schoolId)) return
      setIsPersonal(false)
      setSelectedId(schoolId)
      window.localStorage.setItem(selectionKey, schoolId)
      window.dispatchEvent(
        new CustomEvent(SCHOOL_SELECTION_EVENT, { detail: { schoolId, selectionKey } })
      )
    },
    [schools, selectionKey]
  )

  const selectPersonal = useCallback(() => {
    setIsPersonal(true)
    setSelectedId(null)
    window.localStorage.setItem(selectionKey, 'personal')
    window.dispatchEvent(
      new CustomEvent(SCHOOL_SELECTION_EVENT, { detail: { schoolId: null, selectionKey } })
    )
  }, [selectionKey])

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
