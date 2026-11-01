'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'

export type TrainingSelection = { type: 'plan' | 'session' | 'public-session'; id: string }

export function useTrainingSelection(role: 'athlete' | 'coach') {
  const { user } = useUser()
  const uid = user?.uid || user?.id
  const [selection, setSelection] = useState<TrainingSelection | null>(null)
  useEffect(() => {
    setSelection(null)
    if (!uid) return
    try {
      const value = JSON.parse(
        localStorage.getItem(`nadamas.training.selection.${role}.${uid}`) || 'null'
      )
      if (
        value &&
        (value.type === 'plan' || value.type === 'session' || value.type === 'public-session') &&
        typeof value.id === 'string'
      )
        setSelection(value)
    } catch {
      /* Storage may be unavailable. */
    }
  }, [uid, role])
  const select = (value: TrainingSelection | null) => {
    setSelection(value)
    if (uid) {
      try {
        const key = `nadamas.training.selection.${role}.${uid}`
        if (value) localStorage.setItem(key, JSON.stringify(value))
        else localStorage.removeItem(key)
      } catch {
        /* Storage may be unavailable. */
      }
    }
  }
  return { selection, select }
}
