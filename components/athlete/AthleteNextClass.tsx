'use client'

import { useEffect, useState } from 'react'
import { FiCalendar, FiClock, FiMapPin } from 'react-icons/fi'
import ClassTrainingEditor from '@/components/coach/ClassTrainingEditor'
import CoachBadge from '@/components/ui/coach-badge'
import { type ClassTrainingBlock, normalizeClassTraining } from '@/lib/class-training'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'
import { reportInternalError } from '@/lib/user-facing-error'

function classDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

export default function AthleteNextClass({ booking }: { booking: Booking }) {
  const [training, setTraining] = useState<ClassTrainingBlock[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    setTraining(null)
    setLoadError(false)
    const query = new URLSearchParams({ bookingId: booking.id })
    if (booking.schoolId) query.set('schoolId', booking.schoolId)
    if (booking.schoolClassId) query.set('schoolClassId', booking.schoolClassId)
    if (booking.coachId) query.set('coachId', booking.coachId)
    if (booking.date) query.set('date', booking.date)
    if (booking.startTime) query.set('startTime', booking.startTime)

    getAuthed(`/api/athlete/class-training?${query.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('ATHLETE_CLASS_TRAINING_LOAD_FAILED')
        return (await response.json()) as { training?: unknown }
      })
      .then((payload) => {
        if (active) setTraining(normalizeClassTraining(payload.training || []) || [])
      })
      .catch((cause) => {
        reportInternalError('ATHLETE_CLASS_TRAINING_LOAD', cause)
        if (active) setLoadError(true)
      })

    return () => {
      active = false
    }
  }, [
    booking.coachId,
    booking.date,
    booking.id,
    booking.schoolClassId,
    booking.schoolId,
    booking.startTime,
  ])

  return (
    <article className="grid min-w-0 gap-3 p-4">
      <div className="grid min-w-0 gap-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-(--c-aqua-strong)">
            <FiCalendar aria-hidden="true" />
            Próxima clase
          </div>
          {booking.coachName && <CoachBadge name={booking.coachName} />}
        </div>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <time
            dateTime={`${booking.date}T${booking.startTime}`}
            className="font-extrabold text-(--c-ocean) first-letter:uppercase"
          >
            {classDate(booking.date)}
          </time>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-(--c-text-2)">
            <FiClock aria-hidden="true" />
            {booking.startTime}
          </span>
          <span className="ml-auto text-sm font-semibold text-(--c-text-2)">
            {booking.groupType === 'grupal' ? 'Grupal' : 'Particular'}
          </span>
        </div>
        {booking.schoolClassTitle?.trim() && (
          <p className="text-sm font-semibold text-(--c-ocean)">{booking.schoolClassTitle}</p>
        )}
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm text-(--c-text-2)">
          {booking.locationName?.trim() &&
            booking.locationName.trim().toLocaleLowerCase('es-MX') !== 'lugar por definir' && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <FiMapPin aria-hidden="true" className="shrink-0" />
                <span className="truncate">{booking.locationName}</span>
              </span>
            )}
        </div>
      </div>

      <section className="grid min-w-0 gap-2 border-t border-(--c-border) pt-3">
        <h2 className="font-bold text-(--c-ocean)">Entreno programado</h2>
        {training === null && !loadError ? (
          <p role="status" className="text-sm text-(--c-text-2)">
            Cargando entreno…
          </p>
        ) : loadError ? (
          <p className="text-sm text-(--c-text-2)">No pudimos cargar el entreno de esta clase.</p>
        ) : training?.length ? (
          <ClassTrainingEditor blocks={training} onChange={() => {}} readOnly />
        ) : (
          <p className="text-sm text-(--c-text-2)">
            Tu entrenador todavía no agrega el entreno de esta clase.
          </p>
        )}
      </section>
    </article>
  )
}
