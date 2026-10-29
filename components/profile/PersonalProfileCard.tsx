'use client'
import { TextField } from '@comps/Inputs/FormFields'
import SaveButton from '@comps/SaveButton'
import { useEffect, useRef, useState } from 'react'
import { FiChevronUp, FiEdit2 } from 'react-icons/fi'
import DateInput from '@/components/ui/date-input'
import { useUser } from '@/context/UserContext'
import { useAutosave } from '@/hooks/useAutosave'
import { patchAuthed } from '@/lib/client/authed-api'
export default function PersonalProfileCard() {
  const { user, refreshUser } = useUser()
  const [nickname, setNickname] = useState(user?.nickname || user?.displayName || user?.name || '')
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [lastName, setLastName] = useState(user?.lastName || '')
  const [birthDate, setBirthDate] = useState(user?.birthDate || '')
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [dirty, setDirty] = useState(false)
  const revision = useRef(0)
  const markDirty = () => {
    revision.current += 1
    setDirty(true)
  }
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (!user || dirty) return
    setNickname(user.nickname || user.displayName || user.name || '')
    setFirstName(user.firstName || '')
    setLastName(user.lastName || '')
    setBirthDate(user.birthDate || '')
  }, [user, dirty])
  async function save() {
    if (!dirty || status === 'saving') return
    if (!nickname.trim()) {
      setStatus('error')
      setMessage('El nombre visible es obligatorio.')
      return
    }
    const savingRevision = revision.current
    setStatus('saving')
    try {
      await patchAuthed('/api/profile', {
        nickname: nickname.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate,
      })
      await refreshUser?.()
      if (revision.current === savingRevision) setDirty(false)
      setStatus('saved')
      setMessage('Datos guardados')
    } catch {
      setStatus('error')
      setMessage('No se pudo guardar. Intenta de nuevo.')
    }
  }
  const { saveNow } = useAutosave(
    JSON.stringify({ nickname, firstName, lastName, birthDate }),
    () => void save(),
    { enabled: dirty && !!nickname.trim() }
  )
  return (
    <section
      onChange={markDirty}
      aria-labelledby="personal-data"
      className="bg-white px-4 py-5 sm:rounded-[var(--r-md)] sm:border sm:border-[var(--c-border)] sm:p-6 sm:shadow-[var(--shadow-sm)] flex flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="personal-data" className="text-lg font-bold">
          Datos personales
        </h2>
        <button
          type="button"
          aria-expanded={editingPersonal}
          aria-controls="personal-data-form"
          onClick={() => setEditingPersonal((open) => !open)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-(--c-border) px-4 text-sm font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
        >
          {editingPersonal ? <FiChevronUp aria-hidden="true" /> : <FiEdit2 aria-hidden="true" />}
          {editingPersonal ? 'Cerrar' : 'Editar'}
        </button>
      </div>

      {!editingPersonal && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          <dt className="text-(--c-text-2)">Nombre visible</dt>
          <dd className="truncate font-semibold">{nickname || '—'}</dd>
          <dt className="text-(--c-text-2)">Nombre</dt>
          <dd className="truncate font-semibold">
            {[firstName, lastName].filter((part) => part.trim()).join(' ') || '—'}
          </dd>
          <dt className="text-(--c-text-2)">Nacimiento</dt>
          <dd className="truncate font-semibold">
            {birthDate
              ? new Date(`${birthDate}T12:00:00`).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : '—'}
          </dd>
        </dl>
      )}

      {editingPersonal && (
        <div id="personal-data-form" className="flex flex-col gap-4">
          <TextField
            label="Nombre visible (nickname)"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Cómo quieres que te vean"
          />

          <TextField
            label="Nombre(s)"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Escribe tus nombre(s)"
            autoComplete="given-name"
          />

          <TextField
            label="Apellido(s)"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Escribe tus apellido(s)"
            autoComplete="family-name"
          />

          <DateInput
            label="Fecha de nacimiento"
            value={birthDate}
            onChange={(value) => {
              markDirty()
              setBirthDate(value)
            }}
            max={new Date().toISOString().slice(0, 10)}
          />

          {message && (
            <p
              className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-[var(--c-text-2)]'}`}
            >
              {message}
            </p>
          )}

          <SaveButton
            status={status}
            onClick={saveNow}
            idleLabel="Guardado"
            savedLabel="Datos guardados"
          />
        </div>
      )}
    </section>
  )
}
