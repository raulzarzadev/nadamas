'use client'

import { useEffect, useState } from 'react'
import ClassTrainingEditor from '@/components/coach/ClassTrainingEditor'
import SessionShareMenu from '@/components/training/SessionShareMenu'
import type { ClassTrainingBlock } from '@/lib/class-training'
import type { TrainingSelection } from '@/lib/client/training-selection'
import { reportInternalError } from '@/lib/user-facing-error'

type Session = {
  id: string
  title: string
  description: string
  authorName: string
  training: ClassTrainingBlock[]
}

export default function PublicSelectedSession({
  selection,
  accountRole,
  onSelectTraining,
}: {
  selection: TrainingSelection | null
  accountRole: 'athlete' | 'coach'
  onSelectTraining: (selection: TrainingSelection) => void
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  useEffect(() => {
    if (selection?.type !== 'public-session') return
    let active = true
    setSession(null)
    setStatus('loading')
    fetch(`/api/public/training-sessions?session=${encodeURIComponent(selection.id)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('PUBLIC_SESSION_LOAD')
        return response.json() as Promise<{ item: Session }>
      })
      .then(({ item }) => {
        if (!active) return
        const found = item
        setSession(found || null)
        setStatus(found ? 'ready' : 'error')
      })
      .catch((cause) => {
        reportInternalError('PUBLIC_SESSION_LOAD', cause)
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [selection])
  if (selection?.type !== 'public-session') return null
  return (
    <section className="mx-auto grid w-full max-w-4xl gap-3 px-3 pb-5" aria-label="Entreno de hoy">
      <h1 className="text-center text-2xl font-extrabold">Entreno de hoy</h1>
      {status === 'loading' && <p role="status">Cargando entreno…</p>}
      {status === 'error' && (
        <p role="alert">No pudimos cargar este entreno. Busca otro o inténtalo más tarde.</p>
      )}
      {session && (
        <div className="min-w-0">
          <h2 className="font-bold text-(--c-ocean)">{session.title}</h2>
          <p className="mb-3 text-xs text-(--c-text-2)">{session.authorName}</p>
          <div className="flex justify-end">
            <SessionShareMenu
              session={session}
              accountRole={accountRole}
              onDuplicated={(id) => onSelectTraining({ type: 'session', id })}
            />
          </div>
          {session.description && (
            <p className="mb-3 whitespace-pre-wrap text-sm">{session.description}</p>
          )}
          <ClassTrainingEditor
            blocks={session.training}
            onChange={() => {}}
            readOnly
            allowTransfer={false}
          />
        </div>
      )}
    </section>
  )
}
