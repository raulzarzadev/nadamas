'use client'

import { useCallback, useEffect, useState } from 'react'
import { FiChevronDown, FiCopy, FiEdit2 } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { useUser } from '@/context/UserContext'
import { type ClassTrainingBlock, normalizeClassTraining } from '@/lib/class-training'
import { getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import type { ObjectiveWorkout } from '@/lib/training-planner'
import { reportInternalError } from '@/lib/user-facing-error'
import ClassNotesModal from './ClassNotesModal'
import ClassTrainingEditor from './ClassTrainingEditor'
import WorkoutTransferSheet from './WorkoutTransferSheet'

type ClassTraining = {
  id: string
  schoolId: string | null
  date: string
  startTime: string
  training: ClassTrainingBlock[]
}

type Standalone = { id: string; title: string; training: ClassTrainingBlock[]; updatedAt: number }
type Draft = { id?: string; title: string; training: ClassTrainingBlock[] }

export default function CoachClassTrainings({ createRequest }: { createRequest: number }) {
  const { user } = useUser()
  const uid = user?.uid || user?.id
  const [items, setItems] = useState<ClassTraining[]>([])
  const [sessions, setSessions] = useState<Standalone[]>([])
  const [visibleCount, setVisibleCount] = useState(5)
  const [error, setError] = useState(false)
  const [editClass, setEditClass] = useState<ClassTraining | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [transfer, setTransfer] = useState<ObjectiveWorkout | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingSeries, setEditingSeries] = useState(false)
  const [saveError, setSaveError] = useState('')
  const load = useCallback(async () => {
    const [classResponse, sessionResponse] = await Promise.all([
      getAuthed('/api/coach/class-trainings'),
      getAuthed('/api/coach/standalone-sessions'),
    ])
    if (!classResponse.ok || !sessionResponse.ok) throw new Error('CLASS_TRAININGS_LOAD_FAILED')
    const [classes, standalone] = await Promise.all([classResponse.json(), sessionResponse.json()])
    setItems(
      (classes.items as ClassTraining[]).map((item) => ({
        ...item,
        training: normalizeClassTraining(item.training) || [],
      }))
    )
    setSessions(standalone.items as Standalone[])
    setError(false)
  }, [])
  useEffect(() => {
    void load().catch((cause) => {
      reportInternalError('COACH_CLASS_TRAININGS_LOAD', cause)
      setError(true)
    })
  }, [load])
  useEffect(() => {
    if (createRequest) {
      setSaveError('')
      setDraft({ title: '', training: [] })
    }
  }, [createRequest])
  const duplicate = (title: string, training: ClassTrainingBlock[]) => {
    setSaveError('')
    setDraft({
      title: `Copia de ${title}`.slice(0, 100),
      training: training.map((block) => ({
        ...block,
        id: crypto.randomUUID(),
        series: block.series.map((series) => ({ ...series, id: crypto.randomUUID() })),
      })),
    })
  }
  const save = async () => {
    if (!draft || saving || !draft.title.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      const response = draft.id
        ? await patchAuthed('/api/coach/standalone-sessions', draft)
        : await postAuthed('/api/coach/standalone-sessions', draft)
      if (!response.ok) throw new Error('SESSION_SAVE_FAILED')
      const payload = (await response.json()) as { item: Standalone }
      setSessions((previous) => [
        payload.item,
        ...previous.filter((item) => item.id !== payload.item.id),
      ])
      setDraft(null)
    } catch (cause) {
      reportInternalError('COACH_SESSION_SAVE', cause)
      setSaveError('No pudimos guardar la sesión. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <>
      {(items.length > 0 || sessions.length > 0 || error) && (
        <section
          className="mx-auto grid w-full max-w-4xl gap-3 px-3 pb-5"
          aria-labelledby="class-trainings-title"
        >
          <h2 id="class-trainings-title" className="text-lg font-bold text-(--c-ocean)">
            Tus entrenos
          </h2>
          {error && (
            <p className="text-sm text-(--c-text-2)">
              No pudimos cargar los entrenos de tus clases.
            </p>
          )}
          {items.slice(0, Math.max(0, visibleCount - sessions.length)).map((item) => (
            <details
              key={`${item.schoolId || 'personal'}-${item.id}`}
              className="rounded-xl border border-(--c-border) bg-white px-4"
            >
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-semibold text-(--c-ocean)">
                <span>
                  <span className="capitalize">
                    {new Date(`${item.date}T12:00:00`).toLocaleDateString('es-MX', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>{' '}
                  · {item.startTime}
                  <span className="ml-2 text-xs font-normal text-(--c-text-2)">
                    {item.schoolId ? 'Escuela' : 'Clase personal'}
                  </span>
                </span>
                <FiChevronDown aria-hidden="true" className="shrink-0" />
              </summary>
              <div className="border-t border-(--c-border) py-3">
                <ClassTrainingEditor blocks={item.training} onChange={() => {}} readOnly />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() => setEditClass(item)}
                  >
                    <FiEdit2 aria-hidden="true" /> Editar
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() => duplicate(`clase ${item.date} ${item.startTime}`, item.training)}
                  >
                    <FiCopy aria-hidden="true" /> Duplicar
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() =>
                      setTransfer({
                        id: item.id,
                        title: `Clase ${item.date} ${item.startTime}`,
                        blocks: item.training,
                      })
                    }
                  >
                    <FiCopy aria-hidden="true" /> Importar / exportar entreno
                  </button>
                </div>
              </div>
            </details>
          ))}
          {sessions.slice(0, visibleCount).map((item) => (
            <details key={item.id} className="rounded-xl border border-(--c-border) bg-white px-4">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-semibold text-(--c-ocean)">
                <span>
                  {item.title}{' '}
                  <span className="text-xs font-normal text-(--c-text-2)">· Sesión suelta</span>
                </span>
                <FiChevronDown aria-hidden="true" />
              </summary>
              <div className="border-t border-(--c-border) py-3">
                <ClassTrainingEditor blocks={item.training} onChange={() => {}} readOnly />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() => {
                      setSaveError('')
                      setDraft({ id: item.id, title: item.title, training: item.training })
                    }}
                  >
                    <FiEdit2 aria-hidden="true" /> Editar
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() => duplicate(item.title, item.training)}
                  >
                    <FiCopy aria-hidden="true" /> Duplicar
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() =>
                      setTransfer({ id: item.id, title: item.title, blocks: item.training })
                    }
                  >
                    <FiCopy aria-hidden="true" /> Importar / exportar entreno
                  </button>
                </div>
              </div>
            </details>
          ))}
          {items.length + sessions.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 5)}
              className="min-h-11 justify-self-center rounded-full px-4 text-sm font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
            >
              Ver más
            </button>
          )}
        </section>
      )}
      {editClass && uid && (
        <ClassNotesModal
          target={{
            schoolId: editClass.schoolId || undefined,
            coachId: uid,
            date: editClass.date,
            startTime: editClass.startTime,
            groupType: 'particular',
          }}
          initialAction="training"
          onClose={() => setEditClass(null)}
          onUpdated={() => {
            void load().catch(() => setError(true))
          }}
        />
      )}
      {transfer && (
        <WorkoutTransferSheet
          workout={transfer}
          allowImport
          disabled={false}
          onClose={() => setTransfer(null)}
          onImport={(workout) => {
            setTransfer(null)
            setSaveError('')
            setDraft({ title: workout.title || 'Entreno importado', training: workout.blocks })
          }}
        />
      )}
      {draft && (
        <Sheet
          open
          label={draft.id ? 'Editar sesión' : 'Crear sesión suelta'}
          keyboardAware
          closeDisabled={saving}
          onClose={() => setDraft(null)}
          footer={
            editingSeries ? undefined : (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  className="btn btn-outline min-h-11"
                  onClick={() => setDraft(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving || !draft.title.trim()}
                  className="btn btn-primary min-h-11"
                  onClick={() => void save()}
                >
                  {saving ? 'Guardando…' : 'Guardar sesión'}
                </button>
              </div>
            )
          }
        >
          <div className="grid min-w-0 gap-4 pb-4">
            <h2 className="text-xl font-bold">
              {draft.id ? 'Editar sesión' : 'Crear sesión suelta'}
            </h2>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              Nombre de la sesión
              <input
                className="box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)"
                maxLength={100}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>
            <ClassTrainingEditor
              blocks={draft.training}
              onChange={(training) => setDraft({ ...draft, training })}
              disabled={saving}
              onEditingChange={setEditingSeries}
            />
            {saveError && (
              <p role="alert" className="text-sm text-(--rose-tx)">
                {saveError}
              </p>
            )}
          </div>
        </Sheet>
      )}
    </>
  )
}
