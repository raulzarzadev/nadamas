'use client'

import { useId, useState } from 'react'
import { FiCheck, FiEdit2, FiRepeat, FiTrash2 } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import {
  blockDistance,
  formatTrainingDistance,
  formatTrainingSummaryDuration,
  normalizeClassTraining,
  workoutDuration,
} from '@/lib/class-training'
import type { ObjectiveWorkout } from '@/lib/training-planner'
import ClassTrainingEditor from './ClassTrainingEditor'
import { useTrainingSave } from './training-save-context'
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

function WorkoutTime({ workout }: { workout: ObjectiveWorkout }) {
  const duration = workoutDuration(workout.blocks)
  const meters = workout.blocks.reduce((total, block) => total + blockDistance(block), 0)
  if (!meters && !duration.seconds) return null
  return (
    <em className="ml-1 text-[10px] font-normal opacity-75">
      {meters > 0 && <> · {formatTrainingDistance(meters)}</>}
      {duration.seconds > 0 && (
        <>
          {' '}
          · {!duration.complete && '~'}
          {formatTrainingSummaryDuration(duration.seconds)}
        </>
      )}
    </em>
  )
}

export default function ObjectiveWorkouts({
  workouts,
  onChange,
  disabled,
  readOnly = false,
  onRequestEdit,
  sessionTitle,
}: {
  workouts: ObjectiveWorkout[]
  onChange: (workouts: ObjectiveWorkout[]) => void
  disabled: boolean
  readOnly?: boolean
  onRequestEdit?: () => void
  sessionTitle?: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTraining = useTrainingSave()
  const [transferOpen, setTransferOpen] = useState(false)
  const [newWorkout, setNewWorkout] = useState<ObjectiveWorkout | null>(null)
  const [editingSeries, setEditingSeries] = useState(false)
  const createSession = () =>
    setNewWorkout({
      id: crypto.randomUUID(),
      title: sessionTitle || '',
      blocks: ['Calentamiento', 'Enfoque', 'Afloje'].map((title) => ({
        id: crypto.randomUUID(),
        title,
        repetitions: 1,
        series: [],
      })),
    })
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
        Transferir
      </button>
    ) : null
  return (
    <section aria-label="Entrenos de la sesión" className="grid min-w-0 gap-4 px-2 py-2">
      {!workouts.length && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(!readOnly || onRequestEdit) && (
            <button
              type="button"
              disabled={disabled}
              className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-full bg-black px-4 text-xs font-semibold text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:cursor-not-allowed disabled:opacity-40"
              onClick={createSession}
            >
              + Agregar sesión
            </button>
          )}
          {transferAction}
        </div>
      )}
      {!workouts.length && (
        <p className="text-center text-xs text-(--c-text-2)">No hay entreno para este día.</p>
      )}
      {workouts.length > 0 && (
        <fieldset aria-label="Seleccionar entreno" className="flex min-w-0 flex-wrap gap-1.5">
          {!readOnly && (
            <button
              type="button"
              disabled={disabled}
              className="inline-flex min-h-7 items-center justify-center rounded-full border border-dashed border-(--c-aqua-strong) bg-white px-2.5 text-[10px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-40"
              onClick={createSession}
            >
              + Agregar sesión
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
              <WorkoutTime workout={workout} />
            </button>
          ))}
        </fieldset>
      )}
      {selected && (
        <section
          id={panelId}
          aria-label={selected.title?.trim() || `Entreno ${selectedIndex + 1}`}
          className="grid min-w-0 gap-3"
        >
          {/* Description and the session actions share one row. */}
          <div className="flex min-w-0 items-start gap-2">
            <p className="min-w-0 flex-1 whitespace-pre-wrap wrap-anywhere text-xs leading-relaxed text-(--c-text-2)">
              {selected.observations?.trim()}
            </p>
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {transferAction}
              {!readOnly && (
                <button
                  type="button"
                  disabled={disabled}
                  aria-haspopup="dialog"
                  className="inline-flex min-h-7 items-center justify-center gap-1 rounded-full border border-(--c-border) bg-white px-2 text-[10px] font-semibold text-(--c-ocean) focus-visible:outline-2 disabled:opacity-50"
                  onClick={() => setEditingId(selected.id)}
                >
                  <FiEdit2 aria-hidden="true" />
                  Editar
                </button>
              )}
            </div>
          </div>
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
            readOnly
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
      {isEditing && selected && (
        <Sheet
          open
          label="Editar sesión"
          keyboardAware
          onClose={() => setEditingId(null)}
          footer={
            editingSeries ? undefined : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  className="btn btn-ghost min-h-11 text-(--rose-tx)"
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
                <button
                  type="button"
                  className="btn btn-primary min-h-11"
                  disabled={disabled || saving}
                  onClick={async () => {
                    if (!saveTraining) return setEditingId(null)
                    setSaving(true)
                    const saved = await saveTraining()
                    setSaving(false)
                    if (saved) setEditingId(null)
                  }}
                >
                  <FiCheck aria-hidden="true" />
                  {saving ? 'Guardando…' : 'Guardar sesión'}
                </button>
              </div>
            )
          }
        >
          <div className="grid min-w-0 gap-4 pb-4">
            <h2 className="text-xl font-bold">Editar sesión</h2>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              Nombre
              <input
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
                className="box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)"
              />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              Descripción
              <textarea
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
                className="box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 py-2 outline-none [field-sizing:content] focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)"
              />
            </label>
            <ClassTrainingEditor
              blocks={selected.blocks}
              disabled={disabled}
              onEditingChange={setEditingSeries}
              onChange={(blocks) =>
                onChange(
                  workouts.map((workout) =>
                    workout.id === selected.id ? { ...workout, blocks } : workout
                  )
                )
              }
            />
          </div>
        </Sheet>
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
      {newWorkout && (
        <Sheet
          open
          label="Agregar sesión"
          keyboardAware
          onClose={() => setNewWorkout(null)}
          footer={
            editingSeries ? undefined : (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline min-h-11"
                  onClick={() => setNewWorkout(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary min-h-11"
                  disabled={disabled}
                  onClick={() => {
                    if (readOnly) onRequestEdit?.()
                    onChange([...workouts, newWorkout])
                    setSelectedId(newWorkout.id)
                    setEditingId(null)
                    setNewWorkout(null)
                  }}
                >
                  Agregar sesión
                </button>
              </div>
            )
          }
        >
          <div className="grid min-w-0 gap-4 pb-4">
            <h2 className="text-xl font-bold">Agregar sesión</h2>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              Nombre
              <input
                maxLength={100}
                value={newWorkout.title || ''}
                onChange={(event) => setNewWorkout({ ...newWorkout, title: event.target.value })}
                placeholder="Nombre de la sesión"
                className="box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)"
              />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              Descripción
              <textarea
                maxLength={2000}
                value={newWorkout.observations || ''}
                onChange={(event) =>
                  setNewWorkout({ ...newWorkout, observations: event.target.value })
                }
                className="box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 py-2 outline-none [field-sizing:content] focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)"
              />
            </label>
            <ClassTrainingEditor
              blocks={newWorkout.blocks}
              onChange={(blocks) => setNewWorkout({ ...newWorkout, blocks })}
              disabled={disabled}
              onEditingChange={setEditingSeries}
            />
          </div>
        </Sheet>
      )}
    </section>
  )
}
