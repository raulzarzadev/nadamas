'use client'

import { useEffect, useState } from 'react'
import { FiCheck, FiShare2 } from 'react-icons/fi'
import { useUser } from '@/context/UserContext'
import { getAuthed } from '@/lib/client/authed-api'
import { copyTextToClipboard } from '@/lib/client/copy-to-clipboard'

export default function ShareScheduleButton() {
  const { user } = useUser()
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const [coachSlug, setCoachSlug] = useState<string | null>(null)

  const uid = user?.uid || user?.id

  // Prefer the readable coach slug; fall back to the uid.
  useEffect(() => {
    if (!uid) return
    let active = true
    getAuthed('/api/slug?self=1')
      .then((response) => response.json())
      .then((data: { slugs?: { coach?: string } }) => {
        if (active && data.slugs?.coach) setCoachSlug(data.slugs.coach)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [uid])

  const share = async () => {
    if (!uid) return
    const link = `${window.location.origin}/${coachSlug || uid}`
    setFailed(false)
    try {
      await copyTextToClipboard(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setFailed(true)
      setTimeout(() => setFailed(false), 3000)
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={!uid}
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--c-aqua)] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:opacity-50"
    >
      {copied ? (
        <>
          <FiCheck aria-hidden="true" /> Enlace copiado
        </>
      ) : failed ? (
        'No se pudo copiar'
      ) : (
        <>
          <FiShare2 aria-hidden="true" /> Compartir
        </>
      )}
    </button>
  )
}
