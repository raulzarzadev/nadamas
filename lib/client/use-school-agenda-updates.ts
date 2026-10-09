'use client'

import { useEffect, useRef } from 'react'
import { AgendaUpdatesCRUD } from '@/firebase/agenda-updates/main'
import { invalidateAuthedCache } from './authed-api'

export function useSchoolAgendaUpdates(
  schoolId: string | string[] | null | undefined,
  onChange: () => void
) {
  const callback = useRef(onChange)
  useEffect(() => {
    callback.current = onChange
  }, [onChange])
  const schoolIdsKey = JSON.stringify(
    [...new Set(Array.isArray(schoolId) ? schoolId : schoolId ? [schoolId] : [])].sort()
  )
  useEffect(() => {
    const schoolIds = JSON.parse(schoolIdsKey) as string[]
    if (!schoolIds.length) return
    let unsubscribes: Array<() => void> = []
    const update = () => {
      for (const id of schoolIds)
        invalidateAuthedCache(`/api/schools/${encodeURIComponent(id)}/agenda`)
      callback.current()
    }
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
  }, [schoolIdsKey])
}
