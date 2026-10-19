'use client'

import { useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import {
  getTrainingDateNeighbors,
  getTrainingSessionsForDate,
  localCalendarDate,
  sessionHasTraining,
} from '@/lib/today-training'
import ClassTrainingEditor from './ClassTrainingEditor'
import { normalizeObjectiveWorkout } from './ObjectiveWorkouts'

export default function TodayTrainingSummary({
  plans,
  loading,
  loadError,
}: {
  plans: TrainingPlan[]
  loading: boolean
  loadError: boolean
}) {
  const [today, setToday] = useState(() => localCalendarDate(new Date()))
  useEffect(() => {
    const refresh = () => setToday(localCalendarDate(new Date()))
    const timer = setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const activeDate = selectedDate ?? today
  const sessions = getTrainingSessionsForDate(plans, activeDate).filter(sessionHasTraining)
  const { previous, next } = getTrainingDateNeighbors(plans, activeDate)
  const shortDate = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    })
  return (
    <section aria-label="Qué toca hoy" className="grid min-w-0 gap-3 pb-6">
      <nav
        aria-label="Entrenos programados"
        className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-start gap-2 py-5 sm:gap-6"
      >
        <div className="text-center">
          {!loading && !loadError && previous && (
            <button
              type="button"
              onClick={() => setSelectedDate(previous)}
              className="inline-flex min-h-11 max-w-full flex-col items-center gap-1 rounded-lg px-1 text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2"
            >
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                <FiChevronLeft aria-hidden="true" />
                Último
              </span>
              <span className="text-[11px] sm:text-xs">{shortDate(previous)}</span>
            </button>
          )}
        </div>
        <div className="grid min-w-0 justify-items-center gap-1 text-center">
          <h2 className="text-base font-bold">
            {activeDate === today ? 'Para hoy' : 'Entreno seleccionado'}
          </h2>
          <time dateTime={activeDate} className="text-xs text-(--c-text-2)">
            {shortDate(activeDate)}
          </time>
          {!loading && !loadError && !sessions.length && (
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              {activeDate === today
                ? 'No hay entreno programado para hoy'
                : 'No hay entreno programado para este día'}
            </p>
          )}
          {activeDate !== today && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="mt-1 min-h-9 rounded-full border border-(--c-border) px-3 text-xs font-semibold focus-visible:outline-2"
            >
              Volver a hoy
            </button>
          )}
        </div>
        <div className="text-center">
          {!loading && !loadError && next && (
            <button
              type="button"
              onClick={() => setSelectedDate(next)}
              className="inline-flex min-h-11 max-w-full flex-col items-center gap-1 rounded-lg px-1 text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2"
            >
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                Próximo
                <FiChevronRight aria-hidden="true" />
              </span>
              <span className="text-[11px] sm:text-xs">{shortDate(next)}</span>
            </button>
          )}
        </div>
      </nav>
      {loading ? (
        <p role="status" className="py-4 text-sm text-(--c-text-2)">
          Cargando el entreno de hoy…
        </p>
      ) : loadError ? (
        <p className="py-4 text-sm text-(--c-text-2)">
          No pudimos cargar lo que toca hoy. Reintenta desde Planeación.
        </p>
      ) : (
        sessions.map((session) => {
          const workouts = (session.micro.objectiveWorkouts?.[session.sessionIndex] ?? [])
            .map(normalizeObjectiveWorkout)
            .filter((workout) => workout.blocks.some((block) => block.series.length > 0))
          return (
            <article
              key={`${session.planId}-${session.micro.id}-${session.sessionIndex}`}
              className="grid min-w-0 gap-3 rounded-2xl border border-(--c-border) bg-white p-3 sm:p-4"
            >
              <p className="wrap-anywhere text-[11px] text-(--c-text-2)">
                {session.macro.title} · {session.meso.title} · {session.micro.title}
              </p>
              <h2 className="wrap-anywhere text-base font-bold">{session.title}</h2>
              {session.description.trim() && (
                <p className="whitespace-pre-wrap wrap-anywhere text-sm text-(--c-text-2)">
                  {session.description}
                </p>
              )}
              {!workouts.length ? (
                <p className="text-xs text-(--c-text-2)">Esta sesión todavía no tiene entrenos.</p>
              ) : (
                workouts.map((workout, index) => (
                  <section
                    key={workout.id}
                    aria-label={workout.title || `Entreno ${index + 1}`}
                    className="grid min-w-0 gap-2 border-t border-(--c-border) pt-3"
                  >
                    <h3 className="wrap-anywhere text-sm font-bold">
                      {workout.title?.trim() || `Entreno ${index + 1}`}
                    </h3>
                    {workout.observations?.trim() && (
                      <p className="whitespace-pre-wrap wrap-anywhere text-xs text-(--c-text-2)">
                        {workout.observations}
                      </p>
                    )}
                    <ClassTrainingEditor blocks={workout.blocks} onChange={() => {}} readOnly />
                  </section>
                ))
              )}
            </article>
          )
        })
      )}
    </section>
  )
}
