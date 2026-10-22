'use client'

import type { TodayTrainingSession } from '@/lib/today-training'
import ClassTrainingEditor from './ClassTrainingEditor'
import { normalizeObjectiveWorkout } from './ObjectiveWorkouts'

export default function TrainingSessionCard({ session }: { session: TodayTrainingSession }) {
  const workouts = (session.micro.objectiveWorkouts?.[session.sessionIndex] ?? [])
    .map(normalizeObjectiveWorkout)
    .filter((workout) => workout.blocks.some((block) => block.series.length > 0))
  return (
    <article className="grid min-w-0 gap-3 rounded-2xl border border-(--c-border) bg-white p-3 sm:p-4">
      <p className="wrap-anywhere text-[11px] text-(--c-text-2)">
        {session.macro.title} · {session.meso.title} · {session.micro.title}
      </p>
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
}
