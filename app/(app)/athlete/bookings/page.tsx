'use client'

import Loading from '@comps/Loading'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { FiCalendar, FiExternalLink, FiMapPin } from 'react-icons/fi'
import { deleteAuthed, getAuthed } from '@/lib/client/authed-api'
import { type Booking, formatSlotLabel } from '@/lib/coach-booking'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined)
  const [names, setNames] = useState<Record<string, string>>({})
  const [cancellingId, setCancellingId] = useState<string | null>(null)
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
            if (!res.ok) return [coachId, ''] as const
            const data = (await res.json()) as { name?: string }
            return [coachId, data.name || ''] as const
          } catch {
            return [coachId, ''] as const
          }
        })
      )
      setNames(Object.fromEntries(entries.filter(([, name]) => name)))
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
      await load()
    } catch (cancelError) {
      reportInternalError('ATHLETE_BOOKING_CANCEL', cancelError)
      setError(GENERIC_USER_ERROR)
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Mis reservas</h1>
      <p className="text-[var(--c-text-2)]">Aquí ves tus clases agendadas y su estado.</p>

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
        <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] p-10 text-center text-[var(--c-text-2)]">
          Aún no tienes reservas
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => {
            const cancelled = booking.status === 'cancelled'
            const coachName = names[booking.coachId] || booking.coachName || 'Coach de natación'
            return (
              <li
                key={booking.id}
                className={`rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)] ${
                  cancelled ? 'opacity-70' : ''
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-2">
                    <p className="text-lg font-bold text-[var(--c-ocean)]">{coachName}</p>
                    <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                      <FiMapPin aria-hidden="true" />
                      {booking.locationName}
                    </p>
                    <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                      <FiCalendar aria-hidden="true" />
                      {formatSlotLabel(booking)}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-[var(--c-aqua-light)] px-3 py-1 text-sm font-semibold text-[var(--c-ocean)]">
                    {STATUS_LABEL[booking.status] || booking.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/athlete/coach/${booking.coachId}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--c-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)]"
                  >
                    Ver más datos del profe
                    <FiExternalLink aria-hidden="true" />
                  </Link>
                  {!cancelled && (
                    <button
                      type="button"
                      disabled={cancellingId === booking.id}
                      onClick={() => void cancelBooking(booking)}
                      className="inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      {cancellingId === booking.id ? 'Cancelando…' : 'Cancelar reserva'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
