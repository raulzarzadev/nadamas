'use client'

import { useEffect, useState } from 'react'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined)

  useEffect(() => {
    getAuthed('/api/admin/bookings')
      .then((response) => response.json())
      .then((payload: { bookings?: Booking[] }) => setBookings(payload.bookings || []))
      .catch(() => setBookings([]))
  }, [])

  if (bookings === undefined) {
    return <p className="text-[var(--c-text-2)]">Cargando clases…</p>
  }

  if (!bookings.length) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] p-10 text-center text-[var(--c-text-2)]">
        Aún no hay clases agendadas
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)]">
      <ul className="divide-y divide-[var(--c-border)]">
        {bookings.map((booking) => (
          <li key={booking.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-bold text-[var(--c-ocean)]">
                {booking.athleteName} → {booking.coachName || 'Coach'}
              </p>
              <p className="text-sm text-[var(--c-text-2)]">
                {booking.date} · {booking.startTime} · {booking.locationName}
              </p>
            </div>
            <span className="justify-self-start rounded-full bg-[var(--c-surface)] px-3 py-1 text-sm font-semibold text-[var(--c-ocean)] sm:justify-self-end">
              {booking.status === 'cancelled' ? 'Cancelada' : 'Confirmada'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
