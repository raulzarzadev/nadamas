'use client'
import { useEffect, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'pending' | 'saved'

/**
 * Debounced per-section autosave. `key` is a serialized snapshot of the
 * editable values; when it changes (and `enabled`), `save` runs after
 * `delay`. The first render is skipped so loading data never triggers a
 * write. `saveNow` flushes immediately (force save button).
 */
export function useAutosave(
  key: string,
  save: () => void,
  { delay = 5000, enabled = true }: { delay?: number; enabled?: boolean } = {}
): { status: AutosaveStatus; saveNow: () => void } {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const firstRun = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedKey = useRef<string | null>(null)
  const saveRef = useRef(save)
  saveRef.current = save

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  const saveNow = () => {
    clear()
    saveRef.current()
    lastSavedKey.current = key
    setStatus('saved')
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: key is the snapshot
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      lastSavedKey.current = key
      return
    }
    if (!enabled) return
    if (key === lastSavedKey.current) return

    setStatus('pending')
    clear()
    timer.current = setTimeout(() => {
      saveRef.current()
      lastSavedKey.current = key
      setStatus('saved')
    }, delay)

    return clear
  }, [key, enabled, delay])

  return { status, saveNow }
}
