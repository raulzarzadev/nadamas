'use client'

import Loading from '@comps/Loading'
import type React from 'react'
import { useEffect, useState } from 'react'
import { FiCalendar, FiMapPin, FiTarget, FiTrendingUp } from 'react-icons/fi'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'
import type { StudentProgress } from '@/lib/coach-student-progress'
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

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">Mi progreso</h1>
        <p className="mt-2 text-[var(--c-text-2)]">
          Historial de clases, objetivos y seguimiento de tus coaches.
        </p>
      </header>

      {error && (
        <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 text-sm text-[var(--c-text-2)]">
          {error}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Clases tomadas" value={completedClasses.length} />
        <SummaryCard label="Coaches con seguimiento" value={progress.length} />
        <SummaryCard
          label="Avance promedio"
          value={
            progress.length
              ? `${Math.round(
                  progress.reduce((total, item) => total + item.coachAssessment, 0) /
                    progress.length
                )}/5`
              : '—'
          }
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-[var(--c-ocean)]">Seguimiento del coach</h2>
        {bookings === undefined ? (
          <Loading />
        ) : progress.length === 0 ? (
          <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-surface)] p-5">
            <h3 className="font-bold text-[var(--c-ocean)]">Sin notas todavía</h3>
            <p className="mt-1 text-sm text-[var(--c-text-2)]">
              Cuando tu coach registre objetivos, observaciones o foco de entrenamiento, aparecerán
              aquí.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {progress.map((item) => (
              <article
                key={item.id}
                className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-5 shadow-[var(--shadow-sm)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-[var(--c-ocean)]">
                      {coachNameFor(item.coachId, bookings || [])}
                    </p>
                    <p className="mt-1 text-sm text-[var(--c-text-2)]">Nivel: {item.level}</p>
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--c-surface)] px-3 py-1 text-sm font-semibold text-[var(--c-ocean)]">
                    <FiTrendingUp aria-hidden="true" />
                    {item.coachAssessment}/5
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {item.goal && (
                    <ProgressNote
                      icon={<FiTarget aria-hidden="true" />}
                      label="Objetivo"
                      text={item.goal}
                    />
                  )}
                  {item.nextFocus && (
                    <ProgressNote
                      icon={<FiCalendar aria-hidden="true" />}
                      label="Próximo foco"
                      text={item.nextFocus}
                    />
                  )}
                </div>
                {item.lastNote && (
                  <p className="mt-4 rounded-[var(--r-sm)] bg-[var(--c-surface)] p-4 text-sm leading-6 text-[var(--c-text-2)]">
                    {item.lastNote}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

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
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 shadow-[var(--shadow-sm)]">
      <p className="text-sm font-semibold text-[var(--c-text-2)]">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-[var(--c-ocean)]">{value}</p>
    </div>
  )
}

function ProgressNote({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode
  label: string
  text: string
}) {
  return (
    <div className="flex gap-3 rounded-[var(--r-sm)] border border-[var(--c-border)] p-3">
      <span className="mt-0.5 text-[var(--c-ocean-mid)]">{icon}</span>
      <div>
        <p className="text-xs font-bold uppercase text-[var(--c-text-2)]">{label}</p>
        <p className="mt-1 text-sm text-[var(--c-ocean)]">{text}</p>
      </div>
    </div>
  )
}

function coachNameFor(coachId: string, bookings: Booking[]) {
  return bookings.find((booking) => booking.coachId === coachId)?.coachName || 'Coach de natación'
}
