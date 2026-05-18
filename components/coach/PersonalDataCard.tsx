'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { patchAuthed } from '@/lib/client/authed-api'
import ProfileSection from './ProfileSection'

export default function PersonalDataCard() {
  const { user, refreshUser } = useUser() as {
    user: {
      nickname?: string
      displayName?: string
      name?: string
      firstName?: string
      lastName?: string
    } | null
    refreshUser?: () => Promise<unknown>
  }

  const [nickname, setNickname] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setNickname((current) => current || user.nickname || user.displayName || user.name || '')
    setFirstName((current) => current || user.firstName || '')
    setLastName((current) => current || user.lastName || '')
  }, [user])

  const hasLegalName = !!(user?.firstName?.trim() && user?.lastName?.trim())
  const summary = hasLegalName
    ? `${nickname || 'Sin nombre visible'} · datos completos`
    : 'Falta nombre y apellidos'

  async function save() {
    const trimmed = nickname.trim()
    if (!trimmed) {
      setStatus('error')
      setMessage('El nombre visible es obligatorio.')
      return
    }
    setStatus('saving')
    setMessage(null)
    try {
      await patchAuthed('/api/profile', {
        nickname: trimmed,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      await refreshUser?.()
      setStatus('saved')
      setMessage('Datos guardados')
    } catch {
      setStatus('error')
      setMessage('No se pudo guardar. Intenta de nuevo.')
    }
  }

  return (
    <ProfileSection
      title="Datos personales"
      description="El nombre visible es lo que ven los atletas. Tus nombre(s) y apellido(s) se cotejan con tu documento de identidad y nunca se muestran públicamente."
      summary={summary}
      surface="tinted"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-[var(--c-text-2)]">
          Nombre visible (nickname)
        </span>
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Cómo quieres que te vean"
          className="h-12 w-full rounded-2xl border border-[var(--c-border)] bg-white px-4 outline-none transition focus:border-[var(--c-aqua)]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-[var(--c-text-2)]">Nombre(s)</span>
        <input
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          placeholder="Como aparece en tu documento"
          autoComplete="given-name"
          className="h-12 w-full rounded-2xl border border-[var(--c-border)] bg-white px-4 outline-none transition focus:border-[var(--c-aqua)]"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-[var(--c-text-2)]">Apellido(s)</span>
        <input
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          placeholder="Como aparece en tu documento"
          autoComplete="family-name"
          className="h-12 w-full rounded-2xl border border-[var(--c-border)] bg-white px-4 outline-none transition focus:border-[var(--c-aqua)]"
        />
      </label>

      {message && (
        <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-[var(--c-text-2)]'}`}>
          {message}
        </p>
      )}

      <button
        type="button"
        disabled={status === 'saving'}
        onClick={() => void save()}
        className="btn btn-primary min-w-36 self-start disabled:opacity-50 sm:self-auto"
      >
        {status === 'saving' ? 'Guardando…' : 'Guardar datos'}
      </button>
    </ProfileSection>
  )
}
