'use client'

import { useState } from 'react'
import { FiCheck, FiChevronRight, FiTrash2 } from 'react-icons/fi'
import type { TrainingCycle } from '@/lib/training-planner'
import ObjectiveWorkouts, { normalizeObjectiveWorkout } from './ObjectiveWorkouts'

type Details = Pick<
  TrainingCycle,
  'goal' | 'content' | 'objectives' | 'objectiveWorkouts' | 'objectiveTitles'
>
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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const updateGoals = (next: string[]) =>
    onChange({ ...value, objectives: next, goal: next.join('\n') })
  const add = () => {
    const next = [...objectives, '']
    onChange({
      ...value,
      objectives: next,
      objectiveTitles: [
        ...objectives.map((goal, index) => value.objectiveTitles?.[index] ?? goal.split('\n')[0]),
        '',
      ],
      goal: next.join('\n'),
      objectiveWorkouts: [...objectives.map((_, index) => workouts(index)), []],
    })
    setExpandedIndex(next.length - 1)
    setEditingIndex(next.length - 1)
  }
  return (
    <div className="my-3 grid min-w-0 gap-2 rounded-xl bg-(--c-surface) p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold">Objetivos</h3>
        {!readOnly && (
          <button type="button" disabled={disabled} onClick={add} className={addClass}>
            + Agregar objetivo
          </button>
        )}
      </div>
      {objectives.length ? (
        <ol className="grid min-w-0 gap-1">
          {objectives.map((_, selected) => {
            const isEditing = !readOnly && editingIndex === selected
            return (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: Objectives and their workouts are stored by position.
                key={selected}
                className="min-w-0 border-t border-(--c-border)"
              >
                <button
                  type="button"
                  aria-expanded={expandedIndex === selected}
                  onClick={() => setExpandedIndex(expandedIndex === selected ? null : selected)}
                  className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg px-1 text-left text-xs font-semibold text-(--c-ocean) hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                >
                  <FiChevronRight
                    aria-hidden="true"
                    className={`size-4 shrink-0 ${expandedIndex === selected ? 'rotate-90' : ''}`}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {value.objectiveTitles?.[selected]?.trim() ||
                      (value.objectiveTitles
                        ? `Objetivo ${selected + 1}`
                        : objectives[selected].split('\n')[0]) ||
                      `Objetivo ${selected + 1}`}
                  </span>
                  <span className="shrink-0 text-[10px] font-normal text-(--c-text-2)">
                    {workouts(selected).length} entrenos
                  </span>
                </button>
                {expandedIndex === selected && (
                  <div className="grid min-w-0 gap-3 pb-3">
                    {isEditing && (
                      <label className="grid min-w-0 gap-2 text-sm font-semibold">
                        Título
                        <input
                          type="text"
                          maxLength={100}
                          disabled={disabled}
                          placeholder={`Objetivo ${selected + 1}`}
                          value={
                            value.objectiveTitles?.[selected] ?? objectives[selected].split('\n')[0]
                          }
                          onChange={(event) =>
                            onChange({
                              ...value,
                              objectiveTitles: objectives.map((goal, index) =>
                                index === selected
                                  ? event.target.value
                                  : (value.objectiveTitles?.[index] ?? goal.split('\n')[0])
                              ),
                            })
                          }
                          className="box-border min-h-11 w-full min-w-0 rounded-xl border border-(--c-border) bg-white px-3 text-base font-normal outline-none focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset"
                        />
                      </label>
                    )}
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                      {isEditing ? (
                        <textarea
                          aria-label="Descripción del objetivo"
                          rows={4}
                          placeholder="Describe el objetivo de esas sesiones"
                          maxLength={500}
                          disabled={disabled}
                          value={objectives[selected]}
                          onChange={(event) =>
                            updateGoals(
                              objectives.map((goal, index) =>
                                index === selected ? event.target.value : goal
                              )
                            )
                          }
                          className="box-border min-h-32 w-full min-w-0 flex-[1_1_14rem] resize-y rounded-xl border border-(--c-border) bg-white p-3 text-base leading-relaxed outline-none focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset"
                        />
                      ) : (
                        <p className="min-w-0 flex-1 whitespace-pre-wrap wrap-anywhere text-sm">
                          {objectives[selected] || `Objetivo ${selected + 1}`}
                        </p>
                      )}
                      {!readOnly && (
                        <div className="flex shrink-0 items-center gap-2">
                          {isEditing && (
                            <button
                              type="button"
                              disabled={disabled}
                              aria-label={`Eliminar objetivo ${selected + 1}`}
                              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-xs font-semibold text-(--c-ocean) hover:bg-white focus-visible:outline-2 disabled:opacity-50"
                              onClick={() => {
                                const next = objectives.filter((_, index) => index !== selected)
                                onChange({
                                  ...value,
                                  objectives: next,
                                  objectiveTitles: objectives.flatMap((goal, index) =>
                                    index === selected
                                      ? []
                                      : [value.objectiveTitles?.[index] ?? goal.split('\n')[0]]
                                  ),
                                  goal: next.join('\n'),
                                  objectiveWorkouts: objectives.flatMap((_, index) =>
                                    index === selected ? [] : [workouts(index)]
                                  ),
                                })
                                setEditingIndex(null)
                                setExpandedIndex(null)
                              }}
                            >
                              <FiTrash2 aria-hidden="true" />
                              Eliminar
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => setEditingIndex(isEditing ? null : selected)}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs font-semibold focus-visible:outline-2 disabled:opacity-50 ${isEditing ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean)'}`}
                          >
                            {isEditing && <FiCheck aria-hidden="true" />}
                            {isEditing ? 'Listo' : 'Editar'}
                          </button>
                        </div>
                      )}
                    </div>
                    <ObjectiveWorkouts
                      workouts={workouts(selected)}
                      disabled={disabled}
                      readOnly={readOnly || !isEditing}
                      onChange={(next) =>
                        onChange({
                          ...value,
                          objectives,
                          objectiveWorkouts: objectives.map((_, index) =>
                            index === selected ? next : workouts(index)
                          ),
                        })
                      }
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-[10px] text-(--c-text-2)">Aún no hay objetivos.</p>
      )}
    </div>
  )
}
