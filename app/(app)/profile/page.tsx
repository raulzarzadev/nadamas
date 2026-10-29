'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import CoachProfileEditor from '@/components/coach/CoachProfileEditor'
import AdditionalProfiles from '@/components/profile/AdditionalProfiles'
import AthleteCredentialButton from '@/components/profile/AthleteCredentialButton'
import MarketingPreference from '@/components/profile/MarketingPreference'
import PersonalProfileCard from '@/components/profile/PersonalProfileCard'
import ProfileBioCard from '@/components/profile/ProfileBioCard'
import ProfileShareActions from '@/components/profile/ProfileShareActions'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import { useAutosave } from '@/hooks/useAutosave'
import { patchAuthed } from '@/lib/client/authed-api'

interface ProfileUser {
  athleteBio?: string
  birthDate?: string | null
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

  const [athleteBio, setAthleteBio] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  useEffect(() => {
    if (!user) return
    setAthleteBio((current) => current || user.athleteBio || '')
  }, [user])

  const { saveNow } = useAutosave(JSON.stringify({ athleteBio }), () => void save(), {
    enabled: !!user && !!user?.nickname?.trim(),
  })

  if (!user) return null

  async function save() {
    const trimmed = user?.nickname || user?.displayName || user?.name || ''
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
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
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

      <PersonalProfileCard />
      <MarketingPreference />

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
          <ProfileBioCard
            id="athlete-bio-title"
            title="Bio del atleta"
            value={athleteBio}
            onChange={setAthleteBio}
            maxLength={280}
            placeholder="Una línea sobre ti como nadador (se muestra en tu perfil público)."
            status={status}
            onSaveNow={saveNow}
          />
          {/* Tu enlace público (PublicLinkEditor) hidden for now; Compartir perfil still uses the saved slug. */}
        </>
      )}

      {message && (
        <p role={status === 'error' ? 'alert' : 'status'} className="text-sm">
          {message}
        </p>
      )}
      <AdditionalProfiles />
    </div>
  )
}
