'use client'

import Loading from '@comps/Loading'
import Avatar from '@comps/ui/avatar'
import type React from 'react'
import { useEffect, useState } from 'react'
import { FiCalendar, FiMapPin, FiTrendingUp, FiUsers } from 'react-icons/fi'
import { progressResultEmoji } from '@/CONSTANTS/PROGRESS_SCALE'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'
import { clampScale, formatStudentLevel, type StudentProgress } from '@/lib/coach-student-progress'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export default function ProgressPage() {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined)
  const [progress, setProgress] = useState<StudentProgress[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAuthed('/api/athlete/progress')
      .then((response) => response.json())
      .then((payload: { bookings?: Booking[]; progress?: StudentProgress[] }) => {
        setBookings(payload.bookings || [])
        setProgress(payload.progress || [])
      })
      .catch((err) => {
        reportInternalError('ATHLETE_PROGRESS_LOAD', err)
        setError(GENERIC_USER_ERROR)
        setBookings([])
      })
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const completedClasses = (bookings || [])
    .filter((booking) => booking.status !== 'cancelled' && booking.date < today)
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))

  const avgAssessment = progress.length
    ? `${Math.round(
        progress.reduce((total, item) => total + clampScale(item.coachAssessment, 1), 0) /
          progress.length
      )}/4`
    : '—'

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold text-(--c-ocean)">Mi progreso</h1>
        <p className="mt-1 text-(--c-text-2)">
          Historial de clases, objetivos y seguimiento de tus coaches.
        </p>
      </header>

      {error && (
        <div className="rounded-[var(--r-md)] border border-(--c-border) bg-(--c-surface) p-4 text-sm text-(--c-text-2)">
          {error}
        </div>
      )}

      <section className="grid grid-cols-3 gap-3">
        <StatTile
          icon={<FiCalendar aria-hidden="true" />}
          label="Clases tomadas"
          value={bookings === undefined ? undefined : completedClasses.length}
        />
        <StatTile
          icon={<FiUsers aria-hidden="true" />}
          label="Coaches"
          value={bookings === undefined ? undefined : progress.length}
        />
        <StatTile
          icon={<FiTrendingUp aria-hidden="true" />}
          label="Avance prom."
          value={bookings === undefined ? undefined : avgAssessment}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-(--c-ocean)">Seguimiento del coach</h2>
        {bookings === undefined ? (
          <Loading />
        ) : progress.length === 0 ? (
          <div className="rounded-[var(--r-md)] border border-dashed border-(--c-border) bg-(--c-surface) p-5">
            <h3 className="font-bold text-(--c-ocean)">Sin notas todavía</h3>
            <p className="mt-1 text-sm text-(--c-text-2)">
              Cuando tu coach registre objetivos, observaciones o foco de entrenamiento, aparecerán
              aquí.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {progress.map((item) => {
              const coachName = coachNameFor(item.coachId, bookings || [])
              return (
                <article
                  key={item.id}
                  className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-4 shadow-[var(--shadow-sm)] sm:p-5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={coachName} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-(--c-ocean)">{coachName}</p>
                      <p className="mt-0.5 text-sm text-(--c-text-2)">
                        Nivel {formatStudentLevel(item)}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-(--c-surface) px-3 py-1 text-sm font-semibold text-(--c-ocean)">
                      {progressResultEmoji(item.result) || <FiTrendingUp aria-hidden="true" />}
                      {formatStudentLevel(item)}
                    </span>
                  </div>
                  {item.lastNote && (
                    <p className="mt-4 rounded-[var(--r-sm)] bg-(--c-surface) p-4 text-sm leading-6 text-(--c-text-2)">
                      {item.lastNote}
                    </p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-(--c-ocean)">Clases tomadas</h2>
          <span className="rounded-full bg-(--c-surface) px-3 py-1 text-sm font-semibold text-(--c-ocean)">
            {completedClasses.length}
          </span>
        </div>
        {bookings === undefined ? (
          <Loading />
        ) : completedClasses.length === 0 ? (
          <div className="rounded-[var(--r-md)] border border-(--c-border) bg-(--c-surface) p-8 text-center text-sm text-(--c-text-2)">
            Tus clases tomadas aparecerán aquí.
          </div>
        ) : (
          <ul className="grid gap-3">
            {completedClasses.map((booking) => (
              <li
                key={booking.id}
                className="flex items-center gap-3 rounded-[var(--r-md)] border border-(--c-border) bg-white p-4 shadow-[var(--shadow-sm)]"
              >
                <Avatar name={booking.coachName || 'Coach'} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-(--c-ocean)">
                    {booking.coachName || 'Coach de natación'}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-(--c-text-2)">
                    <FiCalendar aria-hidden="true" />
                    {new Date(`${booking.date}T12:00:00`).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {booking.startTime}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-(--c-text-2)">
                    <FiMapPin aria-hidden="true" />
                    {booking.locationName}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number | undefined
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--r-md)] border border-(--c-border) bg-white p-4 shadow-[var(--shadow-sm)]">
      <span className="text-(--c-ocean-mid)">{icon}</span>
      <span className="text-2xl font-extrabold leading-none text-(--c-ocean)">
        {value === undefined ? '—' : value}
      </span>
      <span className="text-xs font-semibold text-(--c-text-2)">{label}</span>
    </div>
  )
}

function coachNameFor(coachId: string, bookings: Booking[]) {
  return bookings.find((booking) => booking.coachId === coachId)?.coachName || 'Coach de natación'
}
