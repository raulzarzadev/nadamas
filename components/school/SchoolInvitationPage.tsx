'use client'

import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FiArrowLeft, FiCheck, FiPlus, FiUsers } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { useRole } from '@/context/RoleContext'
import { useUser } from '@/context/UserContext'
import type { AdditionalProfile } from '@/lib/additional-profile'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import { type SchoolTerminologyConfig, schoolTerminologyLabels } from '@/lib/school'
import { GENERIC_USER_ERROR } from '@/lib/user-facing-error'

type AdditionalProfileForm = {
  name: string
  birthDate: string
  gender: AdditionalProfile['gender']
}

const EMPTY_ADDITIONAL_FORM: AdditionalProfileForm = {
  name: '',
  birthDate: '',
  gender: 'varonil',
}

interface InvitationPayload {
  schoolId: string
  schoolName: string
  schoolLogoUrl: string | null
  terminology?: SchoolTerminologyConfig
  role: 'teacher' | 'student'
  email: string
  status: string
  acceptedByCurrentUser?: boolean
  expiresAt: number
  studentId?: string | null
}

export default function SchoolInvitationPage() {
  const params = useParams<{ token: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const { setActiveRole } = useRole()
  const { refreshUser, user } = useUser() as {
    refreshUser: () => Promise<unknown>
    user: {
      name?: string
      nickname?: string
      displayName?: string
      firstName?: string
      lastName?: string
    } | null
  }
  const token = params.token
  const [invitation, setInvitation] = useState<InvitationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [additionalProfiles, setAdditionalProfiles] = useState<AdditionalProfile[]>([])
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([])
  const [additionalModalOpen, setAdditionalModalOpen] = useState(false)
  const [additionalSaving, setAdditionalSaving] = useState(false)
  const [additionalError, setAdditionalError] = useState('')
  const [additionalForm, setAdditionalForm] = useState<AdditionalProfileForm>(EMPTY_ADDITIONAL_FORM)
  const [error, setError] = useState<string | null>(null)
  const terminology = schoolTerminologyLabels(invitation?.terminology)
  const accountName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.nickname ||
    user?.displayName ||
    user?.name ||
    'Mi perfil'
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    relationship: '',
    bio: '',
    birthDate: '',
    gender: 'varonil',
  })
  useEffect(() => {
    getAuthed('/api/additional-profiles')
      .then((r) => r.json())
      .then((p) => setAdditionalProfiles(p.profiles || []))
      .catch(() => setError('No se pudieron cargar tus Adicionales.'))
    getAuthed(`/api/school-invitations/${token}`)
      .then((response) => response.json() as Promise<{ invitation: InvitationPayload }>)
      .then((payload) => {
        setInvitation(payload.invitation)
        if (payload.invitation.acceptedByCurrentUser) setAccepted(true)
        if (payload.invitation.role === 'teacher') {
          if (pathname.startsWith('/school/invitations/')) {
            router.replace(`/coach/invitations/${token}`)
          }
        }
        if (payload.invitation.role === 'student') {
          setActiveRole('athlete', { navigate: false })
          if (pathname.startsWith('/school/invitations/')) {
            router.replace(`/athlete/invitations/${token}`)
          }
        }
      })
      .catch(() => setError('No encontramos esta invitación.'))
      .finally(() => setLoading(false))
  }, [pathname, router, setActiveRole, token])

  async function accept() {
    if (!invitation || saving) return
    setSaving(true)
    setError(null)
    try {
      await postAuthed(`/api/school-invitations/${token}`, {
        ...profile,
      })
      if (invitation.role === 'teacher') {
        await refreshUser()
        setActiveRole('coach', { navigate: false })
      }
      setAccepted(true)
    } catch {
      setError(GENERIC_USER_ERROR)
    } finally {
      setSaving(false)
    }
  }

  async function addSelectedProfilesToSchool() {
    if (!invitation || saving) return
    if (selectedParticipantIds.length === 0) {
      setError('Selecciona al menos un perfil para agregar a la escuela.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await postAuthed(`/api/school-invitations/${token}`, {
        participantIds: selectedParticipantIds,
      })
      setAccepted(true)
    } catch {
      setError(GENERIC_USER_ERROR)
    } finally {
      setSaving(false)
    }
  }

  async function createAdditionalProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (additionalSaving) return
    setAdditionalSaving(true)
    setAdditionalError('')
    try {
      const response = await postAuthed('/api/additional-profiles', additionalForm)
      const { profile: createdProfile } = (await response.json()) as { profile: AdditionalProfile }
      setAdditionalProfiles((current) =>
        [...current, createdProfile].sort((a, b) => a.name.localeCompare(b.name))
      )
      setSelectedParticipantIds((current) => [...current, createdProfile.id])
      setAdditionalForm(EMPTY_ADDITIONAL_FORM)
      setAdditionalModalOpen(false)
    } catch {
      setAdditionalError('No se pudo crear el Adicional. Revisa los datos e inténtalo de nuevo.')
    } finally {
      setAdditionalSaving(false)
    }
  }

  if (loading)
    return <div className="py-16 text-center text-sm text-(--c-text-2)">Cargando invitación…</div>
  if (!invitation)
    return (
      <div className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-6 text-center text-(--c-text-2)">
        {error}
      </div>
    )
  if (invitation.role === 'student' && pathname.startsWith('/school/invitations/'))
    return <div className="py-16 text-center text-sm text-(--c-text-2)">Abriendo invitación…</div>

  if (accepted) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-[var(--r-md)] border border-(--c-border) bg-white p-8 text-center shadow-[var(--shadow-sm)]">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-(--c-surface) text-2xl text-(--c-aqua-strong)">
          <FiCheck aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-extrabold text-(--c-ocean)">Todo listo</h1>
        <p className="text-(--c-text-2)">
          {invitation.role === 'teacher'
            ? `Ya formas parte del equipo de ${terminology.coachPlural}.`
            : invitation.role === 'student'
              ? `Los perfiles seleccionados se agregaron a la lista de ${terminology.participantPlural} de la escuela.`
              : `El registro de ${terminology.participantSingular} quedó guardado en la escuela.`}
        </p>
        <button
          type="button"
          onClick={() => {
            if (invitation.role === 'teacher') {
              window.localStorage.setItem('nadamas.coachSelection', invitation.schoolId)
              setActiveRole('coach')
            } else {
              router.push('/athlete/bookings')
            }
          }}
          className="btn btn-primary min-h-11"
        >
          {invitation.role === 'student'
            ? 'Ver mis próximas clases'
            : `Ir al modo ${terminology.coachSingular}`}
        </button>
      </section>
    )
  }

  if (invitation.role === 'student') {
    const toggleParticipant = (id: string) => {
      setSelectedParticipantIds((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      )
      setError(null)
    }

    return (
      <section className="mx-auto flex max-w-xl flex-col gap-5">
        <Link
          href="/athlete/find-coach"
          className="inline-flex items-center gap-2 text-sm font-semibold text-(--c-ocean-mid)"
        >
          <FiArrowLeft aria-hidden="true" /> Regresar
        </Link>
        <div className="rounded-[var(--r-md)] bg-(--c-ocean) p-6 text-white sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-(--c-aqua) text-xl text-(--c-ocean)">
            <FiUsers aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm font-semibold text-(--c-aqua-light)">Invitación a escuela</p>
          <h1 className="mt-1 text-3xl font-extrabold">{invitation.schoolName}</h1>
          <p className="mt-2 text-white/75">Selecciona a quién quieres agregar a la escuela.</p>
        </div>
        <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7">
          <h2 className="text-lg font-bold text-(--c-ocean)">¿Quiénes se agregarán?</h2>
          <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--r-sm)] border border-(--c-border) px-4 py-3 font-semibold text-(--c-ocean) has-[:checked]:border-(--c-aqua-strong) has-[:checked]:bg-(--c-surface)">
            <input
              type="checkbox"
              checked={selectedParticipantIds.includes('self')}
              onChange={() => toggleParticipant('self')}
              className="size-5 accent-(--c-aqua-strong)"
            />
            <span>
              {accountName} <span className="font-normal text-(--c-text-2)">(yo)</span>
            </span>
          </label>
          {additionalProfiles.map((profile) => (
            <label
              key={profile.id}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-[var(--r-sm)] border border-(--c-border) px-4 py-3 font-semibold text-(--c-ocean) has-[:checked]:border-(--c-aqua-strong) has-[:checked]:bg-(--c-surface)"
            >
              <input
                type="checkbox"
                checked={selectedParticipantIds.includes(profile.id)}
                onChange={() => toggleParticipant(profile.id)}
                className="size-5 accent-(--c-aqua-strong)"
              />
              <span>
                {profile.name} <span className="font-normal text-(--c-text-2)">(Adicional)</span>
              </span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => {
              setAdditionalForm(EMPTY_ADDITIONAL_FORM)
              setAdditionalError('')
              setAdditionalModalOpen(true)
            }}
            className="inline-flex items-center gap-2 self-start font-semibold text-(--c-ocean-mid) underline"
          >
            <FiPlus aria-hidden="true" /> Agregar un Adicional en Mi perfil
          </button>
          {error && (
            <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={
              saving || invitation.status !== 'pending' || selectedParticipantIds.length === 0
            }
            onClick={() => void addSelectedProfilesToSchool()}
            className="btn btn-primary min-h-12"
          >
            {saving ? 'Agregando…' : 'Agregar a la escuela'}
          </button>
        </div>
        <Sheet
          open={additionalModalOpen}
          onClose={() => {
            if (!additionalSaving) setAdditionalModalOpen(false)
          }}
          label="Agregar Adicional"
          keyboardAware
          fullBleedMobile
        >
          <form onSubmit={createAdditionalProfile} className="grid gap-4 px-4 pb-3 sm:px-0 sm:pb-0">
            <div>
              <h2 className="text-xl font-bold text-(--c-ocean)">Agregar Adicional</h2>
              <p className="mt-1 text-sm text-(--c-text-2)">
                Agrega los datos de la persona que administrarás desde tu cuenta.
              </p>
            </div>
            <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
              Nombre completo
              <input
                required
                minLength={2}
                maxLength={120}
                value={additionalForm.name}
                onChange={(event) =>
                  setAdditionalForm({ ...additionalForm, name: event.target.value })
                }
                className="min-h-11 w-full rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal focus:outline-2 focus:outline-(--c-aqua-strong)"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
              Fecha de nacimiento
              <input
                required
                type="date"
                value={additionalForm.birthDate}
                onChange={(event) =>
                  setAdditionalForm({ ...additionalForm, birthDate: event.target.value })
                }
                className="min-h-11 w-full rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal focus:outline-2 focus:outline-(--c-aqua-strong)"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
              Rama / género
              <select
                value={additionalForm.gender}
                onChange={(event) =>
                  setAdditionalForm({
                    ...additionalForm,
                    gender: event.target.value as AdditionalProfile['gender'],
                  })
                }
                className="min-h-11 w-full rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 font-normal focus:outline-2 focus:outline-(--c-aqua-strong)"
              >
                <option value="varonil">Varonil</option>
                <option value="femenil">Femenil</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            {additionalError && (
              <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
                {additionalError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setAdditionalModalOpen(false)}
                disabled={additionalSaving}
                className="btn btn-outline min-h-11"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={additionalSaving}
                className="btn btn-primary min-h-11"
              >
                {additionalSaving ? 'Guardando…' : 'Crear Adicional'}
              </button>
            </div>
          </form>
        </Sheet>
      </section>
    )
  }

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-5">
      <Link
        href="/school/classes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-(--c-ocean-mid)"
      >
        <FiArrowLeft aria-hidden="true" /> Regresar
      </Link>
      <div className="rounded-[var(--r-md)] bg-(--c-ocean) p-6 text-white sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-(--c-aqua) text-xl text-(--c-ocean)">
          <FiUsers aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-semibold text-(--c-aqua-light)">Invitación a escuela</p>
        <h1 className="mt-1 text-3xl font-extrabold">{invitation.schoolName}</h1>
        <p className="mt-2 text-white/75">Invitación para {terminology.coachSingular}.</p>
      </div>
      <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <Field
          label="Nombre completo"
          value={profile.name}
          onChange={(value) => setProfile({ ...profile, name: value })}
          required
        />
        <Field
          label="Teléfono"
          value={profile.phone}
          onChange={(value) => setProfile({ ...profile, phone: value })}
          type="tel"
        />
        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Presentación
          <textarea
            value={profile.bio}
            onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
            rows={3}
            className="rounded-[var(--r-sm)] border border-(--c-border) px-3 py-2 font-normal"
          />
        </label>
        {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
        <button
          type="button"
          disabled={saving || invitation.status !== 'pending'}
          onClick={() => void accept()}
          className="btn btn-primary min-h-12"
        >
          {saving ? 'Confirmando…' : 'Aceptar invitación'}
        </button>
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
      />
    </label>
  )
}
