'use client'

import { useEffect, useRef } from 'react'
import { AgendaUpdatesCRUD } from '@/firebase/agenda-updates/main'

export function useSchoolAgendaUpdates(
  schoolId: string | string[] | null | undefined,
  onChange: () => void
) {
  const callback = useRef(onChange)
  useEffect(() => {
    callback.current = onChange
  }, [onChange])
  useEffect(() => {
    const schoolIds = [...new Set(Array.isArray(schoolId) ? schoolId : schoolId ? [schoolId] : [])]
    if (!schoolIds.length) return
    let unsubscribes: Array<() => void> = []
    const update = () => callback.current()
    const syncVisibility = () => {
      unsubscribes.forEach((unsubscribe) => {
        unsubscribe()
      })
      unsubscribes = []
      if (document.visibilityState === 'visible')
        unsubscribes = schoolIds.map((id) => AgendaUpdatesCRUD.listen(id, update))
    }
    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    return () => {
      unsubscribes.forEach((unsubscribe) => {
        unsubscribe()
      })
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [schoolId])
}
