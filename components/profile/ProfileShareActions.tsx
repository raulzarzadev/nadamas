'use client'

import { useEffect, useState } from 'react'
import { FiCheck, FiShare2 } from 'react-icons/fi'
import CalendarConnectionButton from '@/components/calendar/CalendarConnectionButton'
import { useUser } from '@/context/UserContext'
import { getAuthed } from '@/lib/client/authed-api'
import { shareLink } from '@/lib/client/share-link'
import { reportInternalError } from '@/lib/user-facing-error'

type Kind = 'athlete' | 'coach'

// Public profile paths: athletes live under /atleta/, coaches at the root (see PublicLinkEditor).
const publicPath = (kind: Kind, id: string) =>
  kind === 'athlete' ? `/atleta/${encodeURIComponent(id)}` : `/${encodeURIComponent(id)}`

/** "Compartir perfil" + "Suscribirme al calendario" for the active profile tab. */
export default function ProfileShareActions({ kind }: { kind: Kind }) {
  const { user } = useUser() as {
    user: { uid?: string; id?: string; nickname?: string; displayName?: string } | null
  }
  const uid = user?.uid || user?.id || ''
  const [slugs, setSlugs] = useState<{ coach?: string; athlete?: string }>({})
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    let active = true
    getAuthed('/api/slug?self=1')
      .then((response) => response.json())
      .then((data: { slugs?: { coach?: string; athlete?: string } }) => {
        if (active) setSlugs(data.slugs || {})
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const share = async () => {
    const id = slugs[kind] || uid
    if (!id) return
    setStatus('idle')
    try {
      const result = await shareLink(
        `${location.origin}${publicPath(kind, id)}`,
        kind === 'athlete' ? 'Mi perfil de atleta en nadamas' : 'Mi perfil de entrenador en nadamas'
      )
      if (result === 'copied') setStatus('copied')
    } catch (cause) {
      reportInternalError('PROFILE_SHARE', cause)
      setStatus('error')
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void share()}
          disabled={!uid}
          className="btn btn-outline min-h-11 flex-1 gap-2"
        >
          {status === 'copied' ? <FiCheck aria-hidden="true" /> : <FiShare2 aria-hidden="true" />}
          {status === 'copied' ? 'Enlace copiado' : 'Compartir perfil'}
        </button>
        <div className="flex-1 [&_button]:w-full">
          <CalendarConnectionButton calendarRole={kind} />
        </div>
      </div>
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-600">
          No pudimos compartir tu perfil. Inténtalo de nuevo.
        </p>
      )}
    </div>
  )
}
