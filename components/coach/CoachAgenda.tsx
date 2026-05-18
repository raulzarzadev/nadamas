'use client'

import Loading from '@comps/Loading'
import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiMapPin, FiPhone, FiUser } from 'react-icons/fi'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
}

export default function CoachAgenda() {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined)

  useEffect(() => {
    getAuthed('/api/coach/bookings')
      .then((response) => response.json())
      .then((payload: { bookings?: Booking[] }) => setBookings(payload.bookings || []))
      .catch(() => setBookings([]))
  }, [])

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (bookings || []).filter(
      (booking) => booking.status !== 'cancelled' && booking.date >= today
    )
  }, [bookings])

  const grouped = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const booking of upcoming) {
      map.set(booking.date, [...(map.get(booking.date) || []), booking])
    }
    return [...map.entries()]
  }, [upcoming])

  if (bookings === undefined) return <Loading />

  if (!upcoming.length) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] p-10 text-center text-[var(--c-text-2)]">
        Aún no tienes próximas clases
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(([date, items]) => (
        <section key={date} className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-[var(--c-ocean)]">
            {new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h2>
          {items.map((booking) => (
            <article
              key={booking.id}
              className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2">
                  <p className="text-lg font-bold text-[var(--c-ocean)]">{booking.startTime}</p>
                  <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                    <FiUser aria-hidden="true" />
                    {booking.athleteName}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                    <FiMapPin aria-hidden="true" />
                    {booking.locationName}
                  </p>
                  {booking.athletePhone && (
                    <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                      <FiPhone aria-hidden="true" />
                      {booking.athletePhone}
                    </p>
                  )}
                </div>
                <span className="w-fit rounded-full bg-[var(--c-aqua-light)] px-3 py-1 text-sm font-semibold text-[var(--c-ocean)]">
                  {STATUS_LABEL[booking.status] || booking.status}
                </span>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  )
}
