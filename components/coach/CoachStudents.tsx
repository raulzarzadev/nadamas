'use client'

import Loading from '@comps/Loading'
import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiMail, FiPhone, FiUser } from 'react-icons/fi'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'

interface StudentSummary {
  athleteId: string
  name: string
  email: string | null
  phone?: string
  totalClasses: number
  nextClass?: Booking
  lastClass?: Booking
}

export default function CoachStudents() {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined)

  useEffect(() => {
    getAuthed('/api/coach/bookings')
      .then((response) => response.json())
      .then((payload: { bookings?: Booking[] }) => setBookings(payload.bookings || []))
      .catch(() => setBookings([]))
  }, [])

  const students = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10)
    const map = new Map<string, StudentSummary>()
    for (const booking of bookings || []) {
      if (booking.status === 'cancelled') continue
      const current = map.get(booking.athleteId) || {
        athleteId: booking.athleteId,
        name: booking.athleteName,
        email: booking.athleteEmail,
        phone: booking.athletePhone,
        totalClasses: 0,
      }
      current.totalClasses += 1
      if (booking.date >= now && (!current.nextClass || booking.date < current.nextClass.date)) {
        current.nextClass = booking
      }
      if (!current.lastClass || booking.date > current.lastClass.date) current.lastClass = booking
      map.set(booking.athleteId, current)
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [bookings])

  if (bookings === undefined) return <Loading />

  if (!students.length) {
    return (
      <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] p-10 text-center text-[var(--c-text-2)]">
        Aún no tienes alumnos
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {students.map((student) => (
        <article
          key={student.athleteId}
          className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-lg font-bold text-[var(--c-ocean)]">
                <FiUser aria-hidden="true" />
                {student.name}
              </p>
              {student.email && (
                <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                  <FiMail aria-hidden="true" />
                  {student.email}
                </p>
              )}
              {student.phone && (
                <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                  <FiPhone aria-hidden="true" />
                  {student.phone}
                </p>
              )}
              {student.nextClass && (
                <p className="flex items-center gap-2 text-sm text-[var(--c-text-2)]">
                  <FiCalendar aria-hidden="true" />
                  Próxima: {student.nextClass.date} · {student.nextClass.startTime}
                </p>
              )}
            </div>
            <span className="w-fit rounded-full bg-[var(--c-surface)] px-3 py-1 text-sm font-semibold text-[var(--c-ocean)]">
              {student.totalClasses} {student.totalClasses === 1 ? 'clase' : 'clases'}
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}
