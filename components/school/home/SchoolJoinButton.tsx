'use client'

import { onAuthStateChanged, type User } from 'firebase/auth'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { FiCheck, FiUserPlus } from 'react-icons/fi'
import { auth } from '@/firebase/index'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

type RequestStatus = 'pending' | 'approved'
type JoinState = 'idle' | 'sending' | RequestStatus | 'error'

const BUTTON_CLASS =
  'inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-white px-6 font-bold transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'

function statusOf(payload: unknown): RequestStatus | null {
  const status = (payload as { request?: { status?: unknown } | null })?.request?.status
  return status === 'pending' || status === 'approved' ? status : null
}

export default function SchoolJoinButton({ schoolId, slug }: { schoolId: string; slug: string }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [state, setState] = useState<JoinState>('idle')
  const autoSent = useRef(false)
  const path = `/api/schools/${encodeURIComponent(schoolId)}/access-requests`

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  const send = async () => {
    setState('sending')
    try {
      const response = await postAuthed(path)
      setState(statusOf(await response.json()) ?? 'pending')
    } catch (error) {
      reportInternalError('school-join', error)
      setState('error')
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per signed-in user
  useEffect(() => {
    if (!user) {
      setState('idle')
      return
    }
    const params = new URLSearchParams(window.location.search)
    if (params.get('join') === '1' && !autoSent.current) {
      autoSent.current = true
      params.delete('join')
      const query = params.toString()
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
      )
      void send()
      return
    }
    let active = true
    getAuthed(path)
      .then((response) => response.json())
      .then((payload) => {
        const status = statusOf(payload)
        if (active && status) setState((current) => (current === 'idle' ? status : current))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user?.uid])

  if (state === 'approved') return null

  if (state === 'pending')
    return (
      <p
        role="status"
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white/15 px-6 font-bold text-white"
      >
        <FiCheck aria-hidden="true" /> Solicitud enviada
      </p>
    )

  const label = (
    <>
      <FiUserPlus aria-hidden="true" /> Solicitar unirme al equipo
    </>
  )

  return (
    <div className="grid gap-2">
      {user ? (
        <button
          type="button"
          onClick={() => void send()}
          disabled={state === 'sending'}
          className={BUTTON_CLASS}
          style={{ color: 'var(--school-primary)' }}
        >
          {label}
        </button>
      ) : (
        <Link
          href={`/login?redirectTo=${encodeURIComponent(`/school/${slug}?join=1`)}`}
          className={BUTTON_CLASS}
          style={{ color: 'var(--school-primary)' }}
        >
          {label}
        </Link>
      )}
      {state === 'error' && (
        <p role="alert" className="text-sm font-semibold text-white">
          {GENERIC_USER_ERROR}
        </p>
      )}
    </div>
  )
}
