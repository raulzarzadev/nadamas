'use client'

import { useId, useState } from 'react'
import { FiCheck, FiEdit2, FiRepeat, FiTrash2 } from 'react-icons/fi'
import { normalizeClassTraining } from '@/lib/class-training'
import type { ObjectiveWorkout } from '@/lib/training-planner'
import ClassTrainingEditor from './ClassTrainingEditor'
import WorkoutTransferSheet from './WorkoutTransferSheet'

const actionClass =
  'min-h-7 rounded-full border border-(--c-border) px-2.5 text-[10px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'

export function normalizeObjectiveWorkout(
  value: string | ObjectiveWorkout,
  index: number
): ObjectiveWorkout {
  if (typeof value !== 'string') return value
  return {
    id: `legacy-workout-${index}`,
    blocks:
      normalizeClassTraining([{ id: `legacy-block-${index}`, repetitions: 1, series: [value] }]) ??
      [],
  }
}

export default function ObjectiveWorkouts({
  workouts,
  onChange,
  disabled,
  readOnly = false,
}: {
  workouts: ObjectiveWorkout[]
  onChange: (workouts: ObjectiveWorkout[]) => void
  disabled: boolean
  readOnly?: boolean
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const panelId = useId()
  const selected = workouts.find((workout) => workout.id === selectedId) ?? workouts[0]
  const selectedIndex = workouts.findIndex((workout) => workout.id === selected?.id)
  const isEditing = !readOnly && editingId === selected?.id
  const transferAction =
    !readOnly || selected ? (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setTransferOpen(true)}
        className={`${actionClass} inline-flex items-center gap-1`}
      >
        <FiRepeat aria-hidden="true" />
        Exportar / importar
      </button>
    ) : null
  return (
    <section aria-label="Entrenos de la sesión" className="grid min-w-0 gap-4 px-2 py-2">
      {!workouts.length && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!readOnly && (
            <button
              type="button"
              disabled={disabled}
              className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-full bg-black px-4 text-xs font-semibold text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                const workout = { id: crypto.randomUUID(), blocks: [] }
                onChange([...workouts, workout])
                setSelectedId(workout.id)
                setEditingId(workout.id)
              }}
            >
              + Agregar entreno
            </button>
          )}
          {transferAction}
        </div>
      )}
      {!workouts.length && (
        <p className="text-center text-xs text-(--c-text-2)">
          No hay entrenos. Crea un entreno para este día.
        </p>
      )}
      {workouts.length > 0 && (
        <fieldset aria-label="Seleccionar entreno" className="flex min-w-0 flex-wrap gap-1.5">
          {!readOnly && (
            <button
              type="button"
              disabled={disabled}
              className="inline-flex min-h-7 items-center justify-center rounded-full border border-dashed border-(--c-aqua-strong) bg-white px-2.5 text-[10px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-40"
              onClick={() => {
                const workout = { id: crypto.randomUUID(), blocks: [] }
                onChange([...workouts, workout])
                setSelectedId(workout.id)
                setEditingId(workout.id)
              }}
            >
              + Entreno
            </button>
          )}
          {workouts.map((workout, index) => (
            <button
              key={workout.id}
              type="button"
              aria-pressed={selected?.id === workout.id}
              aria-controls={panelId}
              onClick={() => {
                setSelectedId(workout.id)
              }}
              className={`${actionClass} max-w-full wrap-anywhere text-left ${selected?.id === workout.id ? 'border-(--c-ocean)! bg-(--c-ocean)! text-white! hover:bg-(--c-ocean)!' : 'bg-white'}`}
            >
              {workout.title?.trim() || `Entreno ${index + 1}`}
            </button>
          ))}
          <span className="ml-auto inline-flex items-center">{transferAction}</span>
        </fieldset>
      )}
      {selected && (
        <section
          id={panelId}
          aria-label={selected.title?.trim() || `Entreno ${selectedIndex + 1}`}
          className="grid min-w-0 gap-3"
        >
          {!readOnly && (
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              {isEditing && (
                <input
                  type="text"
                  aria-label="Título del entreno"
                  maxLength={100}
                  disabled={disabled}
                  value={selected.title ?? ''}
                  placeholder={`Entreno ${selectedIndex + 1}`}
                  onChange={(event) =>
                    onChange(
                      workouts.map((workout) =>
                        workout.id === selected.id
                          ? { ...workout, title: event.target.value }
                          : workout
                      )
                    )
                  }
                  className="box-border min-h-8 w-full min-w-0 max-w-full flex-[1_1_10rem] rounded-lg border border-(--c-border) bg-white px-3 text-base font-normal text-(--c-ocean) outline-none focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset"
                />
              )}
              {!readOnly && (
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  {isEditing && (
                    <button
                      type="button"
                      disabled={disabled}
                      className="inline-flex min-h-7 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
                      onClick={() => {
                        const next = workouts.filter((workout) => workout.id !== selected.id)
                        onChange(next)
                        setSelectedId(next[Math.min(selectedIndex, next.length - 1)]?.id ?? null)
                        setEditingId(null)
                      }}
                    >
                      <FiTrash2 aria-hidden="true" />
                      Eliminar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    className={`inline-flex min-h-7 items-center justify-center gap-1 rounded-full border border-(--c-border) bg-white px-2 text-[10px] font-semibold text-(--c-ocean) focus-visible:outline-2 disabled:opacity-50 ${isEditing ? 'border-(--c-ocean)! bg-(--c-ocean)! text-white! hover:bg-(--c-ocean)!' : ''}`}
                    onClick={() => setEditingId(isEditing ? null : selected.id)}
                  >
                    {isEditing ? <FiCheck aria-hidden="true" /> : <FiEdit2 aria-hidden="true" />}
                    {isEditing ? 'Listo' : 'Editar'}
                  </button>
                </div>
              )}
            </div>
          )}
          {isEditing ? (
            <textarea
              aria-label="Observaciones del entreno"
              placeholder="Observaciones"
              rows={1}
              maxLength={2000}
              disabled={disabled}
              value={selected.observations ?? ''}
              onChange={(event) =>
                onChange(
                  workouts.map((workout) =>
                    workout.id === selected.id
                      ? { ...workout, observations: event.target.value }
                      : workout
                  )
                )
              }
              className="box-border min-h-9 max-h-64 w-full min-w-0 max-w-full resize-none overflow-y-auto rounded-lg [field-sizing:content] border border-(--c-border) bg-white px-3 py-2 text-base font-normal text-(--c-ocean) placeholder:text-(--c-text-2) outline-none focus:border-(--c-aqua-strong) focus:ring-2 focus:ring-(--c-aqua-strong) focus:ring-inset"
            />
          ) : selected.observations?.trim() ? (
            <p className="whitespace-pre-wrap wrap-anywhere text-xs leading-relaxed text-(--c-text-2)">
              {selected.observations}
            </p>
          ) : null}
          <ClassTrainingEditor
            key={selected.id}
            onCreateFirstBlock={
              readOnly
                ? undefined
                : () => {
                    const block = { id: crypto.randomUUID(), repetitions: 1, series: [] }
                    onChange(
                      workouts.map((workout) =>
                        workout.id === selected.id ? { ...workout, blocks: [block] } : workout
                      )
                    )
                    setEditingId(selected.id)
                  }
            }
            blocks={selected.blocks}
            disabled={disabled}
            readOnly={!isEditing}
            onChange={(blocks) =>
              onChange(
                workouts.map((workout) =>
                  workout.id === selected.id ? { ...workout, blocks } : workout
                )
              )
            }
          />
        </section>
      )}
      {transferOpen && (
        <WorkoutTransferSheet
          workout={selected}
          allowImport={!readOnly}
          disabled={disabled}
          onClose={() => setTransferOpen(false)}
          onImport={(workout) => {
            if (disabled || readOnly) return
            onChange([...workouts, workout])
            setSelectedId(workout.id)
            setEditingId(null)
            setTransferOpen(false)
          }}
        />
      )}
    </section>
  )
}
