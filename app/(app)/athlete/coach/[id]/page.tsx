'use client'
import PhoneInput from 'Inputs/PhoneInput'
import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import { CoachStyleMapPreview } from '@comps/coach/CoachRadarChart'
import Loading from '@comps/Loading'
import { useRouter, useSearchParams } from 'next/navigation'
import { use, useEffect, useMemo, useState } from 'react'
import { CARD_PROPIERTIES_AND_STYLES_LABEL } from '@/CONSTANTS/LABELS'
import { useUser } from '@/context/UserContext'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import {
  type Booking,
  bookingSelectionKey,
  parseBookingSelections,
} from '@/lib/coach-booking'
import { normalizeCoachMetrics } from '@/lib/coach-metrics'
import { formatPesos } from '@/lib/coach-offerings'

interface CoachDetail {
  coach: CoachPublic
  name: string
  avatarUrl: string | null
}

export default function AthleteCoachView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, refreshUser } = useUser()
  const [detail, setDetail] = useState<CoachDetail | null | undefined>(undefined)
  const [showDetails, setShowDetails] = useState(false)
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  )
  const [bookingMessage, setBookingMessage] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const bookingSelections = useMemo(() => {
    const parsed = parseBookingSelections(
      searchParams.get('bookings') || searchParams.get('booking')
    )
    return parsed?.every((selection) => selection.coachId === id) ? parsed : null
  }, [searchParams, id])

  useEffect(() => {
    let active = true
    fetch(`/api/public/coaches/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active) return
        setDetail(payload?.coach ? (payload as CoachDetail) : null)
      })
      .catch(() => active && setDetail(null))
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!user) return
    setName((current) => current || user.nickname || user.displayName || user.name || '')
    setPhone((current) => current || user.phone || '')
  }, [user])

  // Booking lives server-side with a deterministic id, so a reload must
  // reflect an already-confirmed class instead of asking again.
  useEffect(() => {
    if (!user || !bookingSelections) return
    let active = true
    getAuthed('/api/bookings')
      .then((res) => res.json())
      .then((payload: { bookings?: Booking[] }) => {
        if (!active) return
        const existingKeys = new Set(
          (payload.bookings || []).map((booking) => bookingSelectionKey(booking))
        )
        const exists = bookingSelections.every((selection) =>
          existingKeys.has(bookingSelectionKey(selection))
        )
        if (exists) {
          setBookingStatus('success')
          setBookingMessage('Clase agendada')
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user, bookingSelections])

  async function confirmBooking() {
    if (!bookingSelections) return
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedName || !trimmedPhone) {
      setBookingStatus('error')
      setBookingMessage('Completa tu nombre y teléfono.')
      return
    }

    setBookingStatus('loading')
    setBookingMessage(null)
    try {
      await postAuthed('/api/bookings', {
        selections: bookingSelections,
        athleteProfile: { name: trimmedName, phone: trimmedPhone },
      })
      await refreshUser?.()
      setBookingStatus('success')
      setBookingMessage('Clase agendada')
    } catch {
      setBookingStatus('error')
      setBookingMessage('No se pudo agendar. Intenta otra vez.')
    }
  }

  if (detail === undefined) return <Loading />
  if (detail === null) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">Coach</h1>
        <div className="rounded-[var(--r-md)] bg-[var(--c-surface)] border border-[var(--c-border)] p-10 text-center text-[var(--c-text-2)]">
          Perfil no disponible
        </div>
      </div>
    )
  }

  const { coach, name: coachName } = detail
  const confirmed = bookingStatus === 'success'

  if (!bookingSelections) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">{coachName}</h1>
        <CoachPublicProfile coach={coach} />
      </div>
    )
  }

  const primarySelection = bookingSelections[0]

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text-2)]">
          Confirmar clase
        </p>

        <div className="mt-3 flex items-center gap-4">
          <CoachStyleMapPreview metrics={normalizeCoachMetrics(coach.metrics)} />
          <div>
            <h1 className="text-xl font-extrabold text-[var(--c-ocean)]">{coachName}</h1>
            <p className="text-sm text-[var(--c-text-2)]">{CARD_PROPIERTIES_AND_STYLES_LABEL}</p>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[var(--c-surface)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-[var(--c-text-2)]">Lugar</dt>
            <dd className="mt-1 font-semibold text-[var(--c-ocean)]">
              {bookingSelections.map((selection) => selection.locationName).join(', ')}
            </dd>
          </div>
          <div className="rounded-2xl bg-[var(--c-surface)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-[var(--c-text-2)]">Horario</dt>
            <dd className="mt-1 font-semibold text-[var(--c-ocean)]">
              {bookingSelections
                .map(
                  (selection) =>
                    `${new Date(`${selection.date}T12:00:00`).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })} · ${selection.startTime}`
                )
                .join(' · ')}
            </dd>
          </div>
          <div className="rounded-2xl bg-[var(--c-surface)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-[var(--c-text-2)]">Precio</dt>
            <dd className="mt-1 font-semibold text-[var(--c-ocean)]">
              {primarySelection.priceCents !== null
                ? `${formatPesos(primarySelection.priceCents)} ${
                    {
                      clase: 'por clase',
                      sesión: 'por sesión',
                      mes: 'por mes',
                      paquete: 'por paquete',
                    }[primarySelection.unit]
                  }`
                : 'Precio por definir'}
            </dd>
          </div>
          <div className="rounded-2xl bg-[var(--c-surface)] px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-[var(--c-text-2)]">Modalidad</dt>
            <dd className="mt-1 font-semibold text-[var(--c-ocean)]">
              {primarySelection.mode === 'home'
                ? '🏠 A domicilio'
                : primarySelection.mode === 'online'
                  ? '💻 En línea'
                  : '📍 Lugar fijo'}{' '}
              · {primarySelection.groupType === 'grupal' ? 'Grupal' : 'Particular'}
            </dd>
          </div>
        </dl>

        {!confirmed && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[var(--c-text-2)]">
                Nombre completo
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                className="h-12 w-full rounded-2xl border border-[var(--c-border)] bg-white px-4 outline-none transition focus:border-[var(--c-aqua)]"
              />
            </label>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>
        )}

        {bookingMessage && (
          <p
            className={`mt-3 text-sm ${
              bookingStatus === 'error' ? 'text-red-600' : 'text-[var(--c-text-2)]'
            }`}
          >
            {bookingMessage}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          {confirmed ? (
            <button
              type="button"
              onClick={() => router.push('/athlete/bookings')}
              className="inline-flex items-center justify-center rounded-full bg-[var(--c-aqua)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--c-aqua-strong)]"
            >
              Ver mis reservas
            </button>
          ) : (
            <button
              type="button"
              disabled={bookingStatus === 'loading'}
              onClick={() => void confirmBooking()}
              className="inline-flex items-center justify-center rounded-full bg-[var(--c-aqua)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--c-aqua-strong)] disabled:opacity-60"
            >
              {bookingStatus === 'loading' ? 'Agendando…' : 'Confirmar clase'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDetails((value) => !value)}
            className="inline-flex items-center justify-center rounded-full border border-[var(--c-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)]"
          >
            {showDetails ? 'Ocultar detalles' : 'Ver más detalles del coach'}
          </button>
        </div>
      </section>

      {showDetails && <CoachPublicProfile coach={coach} />}
    </div>
  )
}
