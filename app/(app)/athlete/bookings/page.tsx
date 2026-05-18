'use client'

import Loading from '@comps/Loading'
import { useCallback, useEffect, useState } from 'react'
import { FiCalendar, FiMapPin } from 'react-icons/fi'
import { getAuthed } from '@/lib/client/authed-api'
import { type Booking, formatSlotLabel } from '@/lib/coach-booking'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const response = await getAuthed('/api/bookings')
      const payload = (await response.json()) as { bookings: Booking[] }
      setBookings(payload.bookings || [])
    } catch (loadError) {
      reportInternalError('ATHLETE_BOOKINGS', loadError)
      setBookings([])
      setError(GENERIC_USER_ERROR)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                  <p className="text-lg font-bold text-[var(--c-ocean)]">
                    {booking.coachName || 'Coach de natación'}
                  </p>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
