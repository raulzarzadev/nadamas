'use client'

import { useEffect, useRef } from 'react'
import { AgendaUpdatesCRUD } from '@/firebase/agenda-updates/main'

export function useSchoolAgendaUpdates(schoolId: string | null | undefined, onChange: () => void) {
  const callback = useRef(onChange)
  useEffect(() => {
    callback.current = onChange
  }, [onChange])
  useEffect(() => {
    if (!schoolId) return
    let unsubscribe: (() => void) | undefined
    const update = () => callback.current()
    const syncVisibility = () => {
      unsubscribe?.()
      unsubscribe = undefined
      if (document.visibilityState === 'visible')
        unsubscribe = AgendaUpdatesCRUD.listen(schoolId, update)
    }
    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    return () => {
      unsubscribe?.()
      document.removeEventListener('visibilitychange', syncVisibility)
    }
  }, [schoolId])
}
