'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { useUser } from '@/context/UserContext'
import { getAuthed, getCachedAuthedData } from '@/lib/client/authed-api'
import { type School, type SchoolMembership, schoolMembershipHasRole } from '@/lib/school'
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
  const tenant = useTenantSchool()
  const { user } = useUser() as { user: { uid?: string; id?: string } | null | undefined }
  const userId = user?.uid || user?.id
  const selectionKey = athleteMode
    ? 'nadamas.athleteSelection'
    : includePersonal
      ? 'nadamas.coachSelection'
      : 'nadamas.schoolId'
  const [initial] = useState(() => {
    const payload = getCachedAuthedData<{
      schools?: SchoolAccessClient[]
      ownedSchool?: School | null
    }>('/api/schools')
    if (!payload || typeof window === 'undefined') return null
    const next = athleteMode
      ? (payload.schools || []).filter(
          ({ membership }) =>
            membership.status === 'active' && schoolMembershipHasRole(membership, 'student')
        )
      : schoolsForWorkspace(payload.schools || [], includePersonal)
    if (tenant) {
      const scoped = next.filter((item) => item.school.id === tenant.id)
      return { schools: scoped, selectedId: scoped[0]?.school.id || null, personal: false }
    }
    const storedSelection = window.localStorage.getItem(selectionKey)
    if (
      includePersonal &&
      (!storedSelection ||
        storedSelection === 'personal' ||
        !next.some((item) => item.school.id === storedSelection))
    )
      return { schools: next, selectedId: null, personal: true }
    const stored = window.localStorage.getItem('nadamas.schoolId')
    const preferred =
      next.find((item) => item.school.id === (includePersonal ? storedSelection : stored)) ||
      next.find((item) => item.school.id === payload.ownedSchool?.id) ||
      next[0]
    return { schools: next, selectedId: preferred?.school.id || null, personal: false }
  })
  const [schools, setSchools] = useState<SchoolAccessClient[]>(initial?.schools || [])
  const [selectedId, setSelectedId] = useState<string | null>(initial?.selectedId || null)
  const [isPersonal, setIsPersonal] = useState(initial?.personal || false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(initial ? 'ready' : 'loading')

  useEffect(() => {
    if (!userId) return
    let active = true
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
        if (!active) return
        const storedCoachSelection = window.localStorage.getItem(selectionKey)
        const next = athleteMode
          ? (payload.schools || []).filter(
              ({ membership }) =>
                membership.status === 'active' && schoolMembershipHasRole(membership, 'student')
            )
          : schoolsForWorkspace(payload.schools || [], includePersonal)
        if (tenant) {
          const scoped = next.filter((item) => item.school.id === tenant.id)
          setSchools(scoped)
          setSelectedId(scoped[0]?.school.id || null)
          setIsPersonal(false)
          setStatus('ready')
          return
        }
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
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [athleteMode, includePersonal, selectionKey, tenant, userId])

  useEffect(() => {
    function handleSelectionChange(event: Event) {
      if (tenant) return
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
  }, [includePersonal, selectionKey, tenant])

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
      if (tenant) return
      if (!schools.some((item) => item.school.id === schoolId)) return
      setIsPersonal(false)
      setSelectedId(schoolId)
      window.localStorage.setItem(selectionKey, schoolId)
      window.dispatchEvent(
        new CustomEvent(SCHOOL_SELECTION_EVENT, { detail: { schoolId, selectionKey } })
      )
    },
    [schools, selectionKey, tenant]
  )

  const selectPersonal = useCallback(() => {
    if (tenant) return
    setIsPersonal(true)
    setSelectedId(null)
    window.localStorage.setItem(selectionKey, 'personal')
    window.dispatchEvent(
      new CustomEvent(SCHOOL_SELECTION_EVENT, { detail: { schoolId: null, selectionKey } })
    )
  }, [selectionKey, tenant])

  return {
    schools,
    selected,
    selectedId: selected?.school.id || null,
    isPersonal,
    status: user === undefined ? ('loading' as const) : status,
    selectSchool,
    selectPersonal,
  }
}
