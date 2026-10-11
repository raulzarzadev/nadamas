'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import DateInput from '@/components/ui/date-input'
import GenderSelector from '@/components/ui/gender-selector'
import PhoneNumberInput from '@/components/ui/phone-number-input'
import { useUser } from '@/context/UserContext'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { SchoolGender } from '@/lib/school'

type Profile = { name: string; phone: string; birthDate: string; gender: SchoolGender }
export default function AthleteProfileInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const { refreshUser } = useUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [accepted, setAccepted] = useState(false)
  useEffect(() => {
    let active = true
    getAuthed(`/api/athlete-profile-invitations/${token}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('INVITATION_UNAVAILABLE')
        return response.json()
      })
      .then((data) => {
        if (active) {
          setProfile(data.profile)
          setEmail(data.email)
          setAccepted(data.status === 'accepted')
        }
      })
      .catch(() => {
        if (active)
          setError(
            'No pudimos abrir la invitación. Inicia sesión con el correo que la recibió y comprueba que el enlace no haya vencido.'
          )
      })
    return () => {
      active = false
    }
  }, [token])
  async function accept(event: React.FormEvent) {
    event.preventDefault()
    if (!profile || busy) return
    setBusy(true)
    setError('')
    try {
      await postAuthed(`/api/athlete-profile-invitations/${token}`, profile)
      setAccepted(true)
      await refreshUser?.()
    } catch {
      setError('No pudimos aceptar la invitación. Revisa tus datos e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }
  if (accepted)
    return (
      <section className="mx-auto grid max-w-lg gap-4">
        <h1 className="text-2xl font-bold">Tu perfil quedó vinculado</h1>
        <p>
          Tu correo está verificado y tu cuenta está ligada al registro de atleta de tu entrenador.
        </p>
        <Link href="/athlete/schedule" className="btn btn-primary">
          Ver mis clases
        </Link>
      </section>
    )
  return (
    <section className="mx-auto grid max-w-lg gap-4">
      <h1 className="text-2xl font-bold">Verifica y completa tu perfil</h1>
      {error && <p role="alert">{error}</p>}
      {!profile && !error && <p>Cargando invitación…</p>}
      {profile && (
        <form className="grid gap-4" onSubmit={accept}>
          <p className="text-sm text-(--c-text-2)">
            Correo verificado: {email}. Revisa tus datos y acepta la invitación para vincular tu
            cuenta al atleta existente.
          </p>
          <label className="grid gap-1 text-sm font-semibold">
            Nombre completo
            <input
              className="input w-full"
              required
              minLength={2}
              maxLength={120}
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              disabled={busy}
            />
          </label>
          <div className="grid gap-1 text-sm font-semibold">
            <label htmlFor="invitation-phone">Teléfono</label>
            <PhoneNumberInput
              id="invitation-phone"
              value={profile.phone}
              onChange={(phone) => setProfile({ ...profile, phone })}
              disabled={busy}
            />
          </div>
          <DateInput
            label="Fecha de nacimiento"
            required
            value={profile.birthDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(birthDate) => setProfile({ ...profile, birthDate })}
            disabled={busy}
          />
          <GenderSelector
            value={profile.gender}
            onChange={(gender) => setProfile({ ...profile, gender })}
            disabled={busy}
          />
          <button type="submit" className="btn btn-primary min-h-11" disabled={busy}>
            {busy ? 'Vinculando…' : 'Aceptar invitación y vincular mi perfil'}
          </button>
        </form>
      )}
      {!profile && error && (
        <Link
          className="btn btn-outline"
          href={`/login?redirectTo=${encodeURIComponent(`/athlete/profile-invitations/${token}`)}`}
        >
          Iniciar sesión con el correo invitado
        </Link>
      )}
    </section>
  )
}
