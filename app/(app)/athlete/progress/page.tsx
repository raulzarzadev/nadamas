'use client'

import Loading from '@comps/Loading'
import { useEffect, useState } from 'react'
import { FiCalendar, FiMapPin } from 'react-icons/fi'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'

export default function ProgressPage() {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined)

  useEffect(() => {
    getAuthed('/api/bookings')
      .then((response) => response.json())
      .then((payload: { bookings?: Booking[] }) => setBookings(payload.bookings || []))
      .catch(() => setBookings([]))
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const completedClasses = (bookings || [])
    .filter((booking) => booking.status !== 'cancelled' && booking.date < today)
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">Mi progreso</h1>
        <p className="mt-2 text-[var(--c-text-2)]">Historial de clases tomadas.</p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[var(--c-ocean)]">Clases tomadas</h2>
          <span className="rounded-full bg-[var(--c-surface)] px-3 py-1 text-sm font-semibold text-[var(--c-ocean)]">
            {completedClasses.length}
          </span>
        </div>
        {bookings === undefined ? (
          <Loading />
        ) : completedClasses.length === 0 ? (
          <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] p-8 text-center text-[var(--c-text-2)]">
            Tus clases tomadas aparecerán aquí.
          </div>
        ) : (
          <ul className="grid gap-3">
            {completedClasses.map((booking) => (
              <li
                key={booking.id}
                className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]"
              >
                <p className="font-bold text-[var(--c-ocean)]">
                  {booking.coachName || 'Coach de natación'}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                  <FiCalendar aria-hidden="true" />
                  {new Date(`${booking.date}T12:00:00`).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  · {booking.startTime}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                  <FiMapPin aria-hidden="true" />
                  {booking.locationName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-surface)] p-5">
        <h2 className="font-bold text-[var(--c-ocean)]">Notas del coach</h2>
        <p className="mt-1 text-sm text-[var(--c-text-2)]">
          Próximamente: aquí verás observaciones y seguimiento que tu coach agregue sobre tu avance.
        </p>
      </section>
    </div>
  )
}
