'use client'
import { TextField } from '@comps/Inputs/FormFields'
import SaveButton from '@comps/SaveButton'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import { useAutosave } from '@/hooks/useAutosave'
import { patchAuthed } from '@/lib/client/authed-api'

export default function ProfilePage() {
  const router = useRouter()
  const { user, refreshUser } = useUser() as {
    user: any
    refreshUser?: () => Promise<unknown>
  }
  const { roles } = useRole()

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

        {roles.coach && (
          <Link
            href="/coach/coach-profile"
            className="btn btn-outline min-h-11 w-full justify-center text-[var(--c-ocean)] sm:w-fit"
          >
            Ver perfil de coach
          </Link>
        )}
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
          placeholder="Como aparece en tu INE"
          autoComplete="given-name"
        />

        <TextField
          label="Apellido(s)"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          placeholder="Como aparece en tu INE"
          autoComplete="family-name"
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

    </div>
  )
}
