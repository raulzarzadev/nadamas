'use client'

import { useEffect, useState } from 'react'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import { isValidSlug, normalizeSlug, type SlugKind, slugify } from '@/lib/slug'

const KIND_LABEL: Record<SlugKind, string> = {
  coach: 'Tu enlace de coach',
  athlete: 'Tu enlace de atleta',
}

function SlugRow({
  kind,
  initial,
  suggestion,
}: {
  kind: SlugKind
  initial: string
  suggestion: string
}) {
  const [value, setValue] = useState(initial || suggestion)
  const [saved, setSaved] = useState(initial)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const normalized = normalizeSlug(value)
  const dirty = normalized !== saved
  const valid = isValidSlug(normalized)

  const save = async () => {
    if (!valid) {
      setStatus('error')
      setMessage('Usa 3-40 letras, números o guiones (no reservado).')
      return
    }
    setStatus('saving')
    setMessage(null)
    try {
      const response = await postAuthed('/api/slug', { kind, slug: normalized })
      const data = (await response.json()) as { slug: string }
      setValue(data.slug)
      setSaved(data.slug)
      setStatus('saved')
      setMessage('Enlace guardado')
    } catch (error) {
      setStatus('error')
      setMessage(
        error instanceof Error && error.message.endsWith(':409')
          ? 'Ese enlace ya está en uso.'
          : 'No se pudo guardar. Intenta de nuevo.'
      )
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-[var(--c-ocean)]">{KIND_LABEL[kind]}</span>
      <div className="flex items-stretch gap-2">
        <span className="flex min-w-0 flex-1 items-center rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white pl-3 text-sm">
          <span className="shrink-0 text-[var(--c-text-2)]">nadamas.app/</span>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="tu-enlace"
            aria-label={KIND_LABEL[kind]}
            className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 font-semibold text-[var(--c-ocean)] outline-none"
          />
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === 'saving'}
          className="shrink-0 rounded-full bg-[var(--c-ocean)] px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {status === 'saving' ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${status === 'error' ? 'text-red-600' : 'text-[var(--c-text-2)]'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

export default function PublicLinkEditor() {
  const { user } = useUser() as {
    user: { nickname?: string; displayName?: string; name?: string } | null
  }
  const { roles } = useRole()
  const [slugs, setSlugs] = useState<{ coach?: string; athlete?: string } | null>(null)

  useEffect(() => {
    let active = true
    getAuthed('/api/slug?self=1')
      .then((response) => response.json())
      .then((data: { slugs?: { coach?: string; athlete?: string } }) => {
        if (active) setSlugs(data.slugs || {})
      })
      .catch(() => {
        if (active) setSlugs({})
      })
    return () => {
      active = false
    }
  }, [])

  if (slugs === null) return null
  const suggestion = slugify(user?.nickname || user?.displayName || user?.name || '')

  return (
    <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div>
        <h2 className="text-lg font-bold">Tu enlace público</h2>
        <p className="mt-1 text-sm text-[var(--c-text-2)]">
          Comparte un enlace corto a tu perfil. Cada enlace debe ser único.
        </p>
      </div>
      <SlugRow kind="athlete" initial={slugs.athlete || ''} suggestion={suggestion} />
      {roles.coach && (
        <SlugRow kind="coach" initial={slugs.coach || ''} suggestion={`${suggestion}-coach`} />
      )}
    </div>
  )
}
