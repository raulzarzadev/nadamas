'use client'
import SaveButton from '@comps/SaveButton'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { useAutosave } from '@/hooks/useAutosave'
import { patchAuthed } from '@/lib/client/authed-api'

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, refreshUser } = useUser() as {
    user: any
    logout: () => void
    refreshUser?: () => Promise<unknown>
  }

  const [nickname, setNickname] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  useEffect(() => {
    if (!user) return
    setNickname((current) => current || user.nickname || user.displayName || user.name || '')
    setFirstName((current) => current || user.firstName || '')
    setLastName((current) => current || user.lastName || '')
  }, [user])

  const { saveNow } = useAutosave(
    JSON.stringify({ nickname, firstName, lastName }),
    () => void save(),
    { enabled: !!user && !!nickname.trim() }
  )

  if (!user) return null

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
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div className="flex items-center gap-4">
          {user.photoURL && (
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[var(--c-border)]">
              <Image
                src={user.photoURL}
                fill
                style={{ objectFit: 'cover' }}
                alt={user.nickname || user.email || 'avatar'}
              />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold">
              {user.nickname || user.displayName || 'Mi cuenta'}
            </h1>
            <p className="truncate text-[var(--c-text-2)]">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Tus datos</h2>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">
            El <strong>nombre visible</strong> es lo que ven otros. Tus{' '}
            <strong>nombre(s) y apellido(s)</strong> se cotejan con tu INE para validar tu identidad
            y no se muestran públicamente.
          </p>
        </div>

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
            placeholder="Como aparece en tu INE"
            autoComplete="given-name"
            className="h-12 w-full rounded-2xl border border-[var(--c-border)] bg-white px-4 outline-none transition focus:border-[var(--c-aqua)]"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-[var(--c-text-2)]">
            Apellido(s)
          </span>
          <input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Como aparece en tu INE"
            autoComplete="family-name"
            className="h-12 w-full rounded-2xl border border-[var(--c-border)] bg-white px-4 outline-none transition focus:border-[var(--c-aqua)]"
          />
        </label>

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

      <button type="button" onClick={logout} className="btn btn-outline w-full">
        Cerrar sesión
      </button>
    </div>
  )
}
