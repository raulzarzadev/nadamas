'use client'
import { TextField } from '@comps/Inputs/FormFields'
import PublicLinkEditor from '@comps/profile/PublicLinkEditor'
import SaveButton from '@comps/SaveButton'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FiChevronUp, FiEdit2 } from 'react-icons/fi'
import CoachProfileEditor from '@/components/coach/CoachProfileEditor'
import AdditionalProfiles from '@/components/profile/AdditionalProfiles'
import AthleteCredentialButton from '@/components/profile/AthleteCredentialButton'
import MarketingPreference from '@/components/profile/MarketingPreference'
import ProfileShareActions from '@/components/profile/ProfileShareActions'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import { useAutosave } from '@/hooks/useAutosave'
import { patchAuthed } from '@/lib/client/authed-api'

interface ProfileUser {
  athleteBio?: string
  displayName?: string
  email?: string
  firstName?: string
  lastName?: string
  name?: string
  nickname?: string
  photoURL?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, refreshUser } = useUser() as {
    user: ProfileUser | null | undefined
    refreshUser?: () => Promise<unknown>
  }
  const { activeRole, roles } = useRole()
  const hasCoachProfile = roles.coach || activeRole === 'school'
  const [tab, setTab] = useState<'athlete' | 'coach'>(
    activeRole === 'coach' || activeRole === 'school' ? 'coach' : 'athlete'
  )

  const [nickname, setNickname] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [athleteBio, setAthleteBio] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [editingPersonal, setEditingPersonal] = useState(false)

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  useEffect(() => {
    if (!user) return
    setNickname((current) => current || user.nickname || user.displayName || user.name || '')
    setFirstName((current) => current || user.firstName || '')
    setLastName((current) => current || user.lastName || '')
    setAthleteBio((current) => current || user.athleteBio || '')
  }, [user])

  const { saveNow } = useAutosave(
    JSON.stringify({ nickname, firstName, lastName, athleteBio }),
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
        athleteBio: athleteBio.trim(),
      })
      await refreshUser?.()
      setStatus('saved')
      setMessage('Datos guardados')
    } catch {
      setStatus('error')
      setMessage('No se pudo guardar. Intenta de nuevo.')
    }
  }

  const tabClass = (active: boolean) =>
    `min-h-10 flex-1 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${
      active ? 'bg-(--c-ocean) text-white' : 'text-(--c-text-2) hover:text-(--c-ocean)'
    }`

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="bg-white px-4 py-5 sm:rounded-[var(--r-md)] sm:border sm:border-[var(--c-border)] sm:p-6 sm:shadow-[var(--shadow-sm)] flex flex-col gap-4">
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
            <p className="text-xs font-bold uppercase tracking-wide text-(--c-aqua-strong)">
              Perfil
            </p>
            <h1 className="truncate text-2xl font-extrabold">
              {user.nickname || user.displayName || 'Mi cuenta'}
            </h1>
            <p className="truncate text-[var(--c-text-2)]">{user.email}</p>
          </div>
        </div>
        <AthleteCredentialButton />
      </div>

      <section
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
        <MarketingPreference />
      </section>

      {hasCoachProfile && (
        <div
          role="tablist"
          aria-label="Tipo de perfil"
          className="flex gap-1 rounded-full border border-(--c-border) bg-white p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'athlete'}
            onClick={() => setTab('athlete')}
            className={tabClass(tab === 'athlete')}
          >
            De atleta
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'coach'}
            onClick={() => setTab('coach')}
            className={tabClass(tab === 'coach')}
          >
            De entrenador
          </button>
        </div>
      )}

      <ProfileShareActions kind={tab === 'coach' && hasCoachProfile ? 'coach' : 'athlete'} />

      {tab === 'coach' && hasCoachProfile ? (
        <CoachProfileEditor embedded />
      ) : (
        <>
          <section
            aria-labelledby="athlete-profile"
            className="bg-white px-4 py-5 sm:rounded-[var(--r-md)] sm:border sm:border-[var(--c-border)] sm:p-6 sm:shadow-[var(--shadow-sm)] flex flex-col gap-4"
          >
            <label className="flex flex-col gap-3 text-[var(--c-ocean)]">
              <span id="athlete-profile" className="text-lg font-bold">
                Bio del atleta
              </span>
              <textarea
                value={athleteBio}
                onChange={(event) => setAthleteBio(event.target.value)}
                placeholder="Una línea sobre ti como nadador (se muestra en tu perfil público)."
                rows={3}
                maxLength={280}
                className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 py-2 font-normal text-[var(--c-ocean)] outline-none transition focus:border-[var(--c-aqua)] focus:ring-4 focus:ring-[rgba(0,180,216,0.16)]"
              />
            </label>
          </section>
          <PublicLinkEditor />
        </>
      )}

      <AdditionalProfiles />
    </div>
  )
}
