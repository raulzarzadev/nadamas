'use client'

import { useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import type { ObjectiveWorkout, TrainingCycle } from '@/lib/training-planner'
import ObjectiveWorkouts, { normalizeObjectiveWorkout } from './ObjectiveWorkouts'

type Details = Pick<TrainingCycle, 'goal' | 'content' | 'objectives' | 'objectiveWorkouts'>
const addClass =
  'relative inline-flex cursor-pointer items-center rounded-full border border-(--c-aqua-strong)/30 px-2 py-1 text-[10px] font-medium leading-none text-(--c-aqua-strong) before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:cursor-not-allowed disabled:opacity-40'

export default function CycleDetails({
  value,
  onChange,
  disabled,
  readOnly = false,
}: {
  value: Details
  onChange: (value: Details) => void
  disabled: boolean
  readOnly?: boolean
}) {
  const objectives = value.objectives ?? [
    ...new Set(
      value.goal
        .split('\n')
        .map((goal) => goal.trim())
        .filter(Boolean)
    ),
  ]
  const workouts = (index: number) =>
    (value.objectiveWorkouts?.[index] ?? []).map(normalizeObjectiveWorkout)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [text, setText] = useState('')
  const [draftWorkouts, setDraftWorkouts] = useState<ObjectiveWorkout[]>([])
  const open = (index: number | 'new') => {
    setText(index === 'new' ? '' : objectives[index])
    setDraftWorkouts(index === 'new' ? [] : workouts(index))
    setEditing(index)
  }
  const save = () => {
    if (!text.trim() || disabled || readOnly || editing === null) return
    const next =
      editing === 'new'
        ? [...objectives, text.trim()]
        : objectives.map((goal, index) => (index === editing ? text.trim() : goal))
    onChange({
      ...value,
      goal: next.join('\n'),
      objectives: next,
      objectiveWorkouts: next.map((_, index) =>
        index === (editing === 'new' ? next.length - 1 : editing) ? draftWorkouts : workouts(index)
      ),
    })
    setEditing(null)
  }
  return (
    <div className="my-3 grid min-w-0 gap-2 rounded-xl bg-(--c-surface) p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold">Objetivos</h3>
        {!readOnly && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => open('new')}
            className={addClass}
          >
            + Agregar objetivo
          </button>
        )}
      </div>
      {objectives.length ? (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-2">
          {objectives.map((goal, index) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: Stateless cards support repeated goal text.
              key={index}
              className="flex min-w-0 flex-col gap-3 rounded-lg border border-[#258575]/25 bg-white p-3"
            >
              <p className="whitespace-pre-wrap wrap-anywhere text-xs">{goal}</p>
              <ObjectiveWorkouts
                workouts={workouts(index)}
                disabled={disabled}
                readOnly={readOnly}
                onChange={(next) =>
                  onChange({
                    ...value,
                    objectives,
                    objectiveWorkouts: objectives.map((_, position) =>
                      position === index ? next : workouts(position)
                    ),
                  })
                }
              />
              {!readOnly && (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Editar objetivo ${index + 1}`}
                    onClick={() => open(index)}
                    className="grid size-11 place-items-center rounded-full text-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2"
                  >
                    <FiEdit2 aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Eliminar objetivo ${index + 1}`}
                    onClick={() =>
                      onChange({
                        ...value,
                        goal: objectives.filter((_, position) => position !== index).join('\n'),
                        objectives: objectives.filter((_, position) => position !== index),
                        objectiveWorkouts: objectives.flatMap((_, position) =>
                          position === index ? [] : [workouts(position)]
                        ),
                      })
                    }
                    className="grid size-11 place-items-center rounded-full text-(--c-text-2) hover:bg-(--c-surface) focus-visible:outline-2"
                  >
                    ×
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-(--c-text-2)">Aún no hay objetivos.</p>
      )}
      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        label={editing === 'new' ? 'Agregar objetivo' : 'Editar objetivo'}
        keyboardAware
        footer={
          <button
            type="button"
            disabled={disabled || !text.trim()}
            onClick={save}
            className="min-h-11 w-full rounded-full bg-(--c-ocean) px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
          >
            Listo
          </button>
        }
      >
        <div className="grid min-w-0 gap-4 pb-4">
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Objetivo
            <textarea
              required
              rows={4}
              placeholder="Describe el objetivo de esas sesiones"
              maxLength={500}
              disabled={disabled}
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-32 w-full min-w-0 resize-y rounded-xl border border-(--c-border) bg-white px-3 py-3 text-base leading-relaxed font-normal placeholder:text-(--c-text-2) outline-none focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset"
            />
          </label>
          <ObjectiveWorkouts
            workouts={draftWorkouts}
            onChange={setDraftWorkouts}
            disabled={disabled}
          />
        </div>
      </Sheet>
    </div>
  )
}
