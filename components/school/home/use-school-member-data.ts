'use client'

import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth } from '@/firebase/index'
import { getAuthed } from '@/lib/client/authed-api'

/** Why member data is not (yet) available: auth/request in flight, no session, or refused/failed. */
export type SchoolGateStatus = 'loading' | 'signed-out' | 'denied'

export type SchoolMemberDataState<T> = { status: SchoolGateStatus } | { status: 'ready'; data: T }

/**
 * Fetches `path` with the signed-in user's token whenever auth changes. Any non-OK response,
 * network failure, or payload rejected by `accept` resolves to `denied` (never surfaced raw).
 */
export function useSchoolMemberData<T>(
  path: string,
  accept: (payload: unknown) => payload is T
): SchoolMemberDataState<T> {
  const [state, setState] = useState<SchoolMemberDataState<T>>({ status: 'loading' })

  // biome-ignore lint/correctness/useExhaustiveDependencies: `accept` is a stable type guard
  useEffect(() => {
    let current = 0
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const request = ++current
      if (!user) {
        setState({ status: 'signed-out' })
        return
      }
      setState({ status: 'loading' })
      getAuthed(path)
        .then((response) => response.json() as Promise<unknown>)
        .then((payload) => {
          if (request !== current) return
          setState(accept(payload) ? { status: 'ready', data: payload } : { status: 'denied' })
        })
        .catch(() => {
          if (request === current) setState({ status: 'denied' })
        })
    })
    return () => {
      current++
      unsubscribe()
    }
  }, [path])

  return state
}
