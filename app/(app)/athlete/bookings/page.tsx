'use client'

import Loading from '@comps/Loading'
import Avatar from '@comps/ui/avatar'
import Chip from '@comps/ui/chip'
import Sheet from '@comps/ui/sheet'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { FiCalendar, FiChevronRight, FiClock, FiSearch, FiUser } from 'react-icons/fi'
import { deleteAuthed, getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

interface CoachInfo {
  name: string
  avatarUrl: string | null
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  confirmed: {
    label: 'Confirmada',
    className: 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-aqua-strong)]',
  },
  pending: {
    label: 'Pendiente',
    className: 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-2)]',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'border-[var(--rose-bd)] bg-[var(--rose-bg)] text-[var(--rose-tx)]',
  },
}

function dayLabel(booking: Booking) {
  return new Date(`${booking.date}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

function timeLabel(booking: Booking) {
  const toMinutes = (value: string) => {
    const [h, m] = value.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  const minutes = toMinutes(booking.endTime) - toMinutes(booking.startTime)
  return minutes > 0 ? `${booking.startTime} · ${minutes} min` : booking.startTime
}

function modalityLabel(booking: Booking) {
  return booking.groupType === 'grupal' ? 'Clase grupal' : 'Clase individual'
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined)
  const [coaches, setCoaches] = useState<Record<string, CoachInfo>>({})
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [toCancel, setToCancel] = useState<Booking | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const response = await getAuthed('/api/bookings')
      const payload = (await response.json()) as { bookings: Booking[] }
      const list = payload.bookings || []
      setBookings(list)

      const coachIds = [...new Set(list.map((b) => b.coachId))]
      const entries = await Promise.all(
        coachIds.map(async (coachId) => {
          try {
            const res = await fetch(`/api/public/coaches/${coachId}`)
            if (!res.ok) return null
            const data = (await res.json()) as { name?: string; avatarUrl?: string | null }
            return [coachId, { name: data.name || '', avatarUrl: data.avatarUrl || null }] as const
          } catch {
            return null
          }
        })
      )
      setCoaches(Object.fromEntries(entries.filter((entry) => entry !== null)))
    } catch (loadError) {
      reportInternalError('ATHLETE_BOOKINGS', loadError)
      setBookings([])
      setError(GENERIC_USER_ERROR)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function cancelBooking(booking: Booking) {
    setCancellingId(booking.id)
    try {
      await deleteAuthed(`/api/bookings/${booking.id}`)
      setToCancel(null)
      await load()
    } catch (cancelError) {
      reportInternalError('ATHLETE_BOOKING_CANCEL', cancelError)
      setError(GENERIC_USER_ERROR)
    } finally {
      setCancellingId(null)
    }
  }

  const activeCount = bookings?.filter((b) => b.status !== 'cancelled').length ?? 0

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-3xl font-extrabold text-[var(--c-ocean)]">Mis clases</h1>
        {bookings && bookings.length > 0 && (
          <p className="mt-1 text-sm text-[var(--c-text-2)]">
            {activeCount} {activeCount === 1 ? 'clase agendada' : 'clases agendadas'}
          </p>
        )}
      </header>

      {bookings === undefined ? (
        <Loading />
      ) : error ? (
        <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-6 text-center text-[var(--c-text-2)] shadow-[var(--shadow-sm)]">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="btn btn-outline btn-sm mt-4">
            Reintentar
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-surface)] p-9 text-center">
          <FiSearch aria-hidden="true" className="mx-auto mb-3 text-3xl text-[var(--c-aqua)]" />
          <p className="mx-auto mb-4 max-w-xs text-sm leading-relaxed text-[var(--c-text-2)]">
            Aún no tienes clases. Encuentra un coach y reserva tu primer entrenamiento.
          </p>
          <Link
            href="/athlete/find-coach"
            className="inline-flex items-center justify-center rounded-full bg-[var(--c-ocean)] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Buscar coach
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => {
            const cancelled = booking.status === 'cancelled'
            const coach = coaches[booking.coachId]
            const coachName = coach?.name || booking.coachName || 'Coach de natación'
            const status = STATUS_STYLE[booking.status] || {
              label: booking.status,
              className: 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-2)]',
            }

            return (
              <li
                key={booking.id}
                className={`overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)] ${
                  cancelled ? 'opacity-70' : ''
                }`}
              >
                <div className="h-1 bg-[image:var(--grad-brand)]" />
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={coachName} src={coach?.avatarUrl} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[var(--c-ocean)]">{coachName}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--c-text-2)]">
                        <FiUser aria-hidden="true" /> {modalityLabel(booking)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <Chip icon={<FiCalendar size={14} />}>{dayLabel(booking)}</Chip>
                    <Chip icon={<FiClock size={14} />}>{timeLabel(booking)}</Chip>
                  </div>

                  <div className="mt-3.5 flex gap-2">
                    <Link
                      href={`/athlete/coach/${booking.coachId}`}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--c-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)]"
                    >
                      Ver perfil <FiChevronRight aria-hidden="true" size={14} />
                    </Link>
                    {!cancelled && (
                      <button
                        type="button"
                        onClick={() => setToCancel(booking)}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-[var(--rose-bd)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--rose-tx)] transition hover:bg-[var(--rose-bg)]"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Sheet open={!!toCancel} onClose={() => setToCancel(null)} label="Cancelar clase">
        {toCancel && (
          <>
            <span className="mx-auto mb-3.5 grid h-11 w-11 place-items-center rounded-full bg-[var(--rose-bg)] text-[var(--rose-tx)]">
              <FiCalendar aria-hidden="true" size={22} />
            </span>
            <h3 className="text-center text-xl font-bold text-[var(--c-ocean)]">
              ¿Cancelar esta clase?
            </h3>
            <p className="mx-auto mt-2 mb-5 max-w-xs text-center text-sm text-[var(--c-text-2)]">
              {dayLabel(toCancel)} · {toCancel.startTime} con{' '}
              {coaches[toCancel.coachId]?.name || toCancel.coachName || 'tu coach'}
            </p>
            <button
              type="button"
              disabled={cancellingId === toCancel.id}
              onClick={() => void cancelBooking(toCancel)}
              className="mt-1 w-full rounded-[var(--r-sm)] bg-[var(--rose-tx)] py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {cancellingId === toCancel.id ? 'Cancelando…' : 'Sí, cancelar reserva'}
            </button>
            <button
              type="button"
              onClick={() => setToCancel(null)}
              className="mt-2 w-full rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white py-3 text-sm font-semibold text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)]"
            >
              Conservar clase
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}
