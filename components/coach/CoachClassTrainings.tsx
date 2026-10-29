'use client'

import { useCallback, useEffect, useState } from 'react'
import { FiChevronDown, FiCopy, FiEdit2, FiRepeat } from 'react-icons/fi'
import LabelChip, { type ColorLabel } from '@/components/ui/label-chip'
import Sheet from '@/components/ui/sheet'
import {
  blockDistance,
  type ClassTrainingBlock,
  formatTrainingDistance,
  formatTrainingDuration,
  normalizeClassTraining,
  workoutDuration,
} from '@/lib/class-training'
import { getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import { copyTextToClipboard } from '@/lib/client/copy-to-clipboard'
import type { ObjectiveWorkout } from '@/lib/training-planner'
import { reportInternalError } from '@/lib/user-facing-error'
import ClassTrainingEditor from './ClassTrainingEditor'
import StudentLabelColorSelector from './StudentLabelColorSelector'
import WorkoutTransferSheet from './WorkoutTransferSheet'

type ClassTraining = {
  id: string
  schoolId: string | null
  date: string
  startTime: string
  title: string
  description: string
  tags: string[]
  training: ClassTrainingBlock[]
}

type Standalone = {
  id: string
  title: string
  description: string
  tags: string[]
  training: ClassTrainingBlock[]
  updatedAt: number
}
type Draft = {
  id?: string
  title: string
  description: string
  tags: string[]
  training: ClassTrainingBlock[]
}

function SessionTotals({ blocks }: { blocks: ClassTrainingBlock[] }) {
  const meters = blocks.reduce((total, block) => total + blockDistance(block), 0)
  const duration = workoutDuration(blocks)
  if (!blocks.length) return null
  return (
    <span className="text-xs font-normal text-(--c-text-2)">
      {formatTrainingDistance(meters)} ·{' '}
      {duration.seconds > 0
        ? `${duration.complete ? '' : '~'}${formatTrainingDuration(duration.seconds)} ${duration.seconds >= 3600 ? 'h' : 'min'}`
        : 'Tiempo sin calcular'}
    </span>
  )
}

export default function CoachClassTrainings({ createRequest }: { createRequest: number }) {
  const [items, setItems] = useState<ClassTraining[]>([])
  const [sessions, setSessions] = useState<Standalone[]>([])
  const [visibleCount, setVisibleCount] = useState(5)
  const [error, setError] = useState(false)
  const [editClass, setEditClass] = useState<ClassTraining | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [transfer, setTransfer] = useState<ObjectiveWorkout | null>(null)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [editingSeries, setEditingSeries] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tagColor, setTagColor] = useState('blue')
  const [tagColors, setTagColors] = useState<Record<string, string>>({})
  const [catalog, setCatalog] = useState<ColorLabel[]>([])
  async function shareSession() {
    const id = editClass?.id || draft?.id
    if (!id || sharing) return
    setSharing(true)
    setShareMessage('')
    try {
      const response = await postAuthed('/api/coach/session-share', {
        id,
        kind: editClass ? (editClass.schoolId ? 'schoolClass' : 'class') : 'standalone',
      })
      const payload = (await response.json()) as { token: string }
      await copyTextToClipboard(`${window.location.origin}/entreno/${payload.token}`)
      setShareMessage('Enlace copiado. Comparte la última versión guardada.')
    } catch {
      setShareMessage('No se pudo copiar el enlace. Inténtalo de nuevo.')
    } finally {
      setSharing(false)
    }
  }
  const addTag = (value: string) => {
    if (!draft) return
    const name = value.trim()
    if (
      !name ||
      draft.tags.length >= 20 ||
      draft.tags.some((tag) => tag.toLocaleLowerCase('es-MX') === name.toLocaleLowerCase('es-MX'))
    )
      return
    const existing = catalog.find(
      (label) => label.name.toLocaleLowerCase('es-MX') === name.toLocaleLowerCase('es-MX')
    )
    const selected = existing?.name || name
    setDraft({ ...draft, tags: [...draft.tags, selected] })
    setTagColors((colors) => ({ ...colors, [selected]: existing?.color || tagColor }))
    setTagInput('')
  }
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
    setCatalog(standalone.labels || [])
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
      setTagInput('')
      setEditClass(null)
      setDraft({ title: '', description: '', tags: [], training: [] })
    }
  }, [createRequest])
  const duplicate = (
    title: string,
    training: ClassTrainingBlock[],
    description = '',
    tags: string[] = []
  ) => {
    setSaveError('')
    setTagInput('')
    setEditClass(null)
    setDraft({
      title: `Copia de ${title}`.slice(0, 100),
      description,
      tags: [...tags],
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
      const pendingTag = tagInput.trim()
      const tags =
        pendingTag &&
        draft.tags.length < 20 &&
        !draft.tags.some(
          (tag) => tag.toLocaleLowerCase('es-MX') === pendingTag.toLocaleLowerCase('es-MX')
        )
          ? [...draft.tags, pendingTag]
          : draft.tags
      const payloadToSave = {
        ...draft,
        tags,
        tagColors: { ...tagColors, ...(pendingTag ? { [pendingTag]: tagColor } : {}) },
      }
      const response = editClass
        ? await patchAuthed('/api/coach/class-trainings', {
            ...payloadToSave,
            schoolId: editClass.schoolId,
            date: editClass.date,
            startTime: editClass.startTime,
          })
        : draft.id
          ? await patchAuthed('/api/coach/standalone-sessions', payloadToSave)
          : await postAuthed('/api/coach/standalone-sessions', payloadToSave)
      if (!response.ok) throw new Error('SESSION_SAVE_FAILED')
      if (!editClass) {
        const payload = (await response.json()) as { item: Standalone }
        setSessions((previous) => [
          payload.item,
          ...previous.filter((item) => item.id !== payload.item.id),
        ])
      }
      setDraft(null)
      setEditClass(null)
      void load().catch(() => setError(true))
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
                <span className="grid min-w-0 gap-1.5">
                  {item.title && <span>{item.title}</span>}
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
                  <SessionTotals blocks={item.training} />
                  {item.tags?.length > 0 && (
                    <span className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <LabelChip
                          key={tag}
                          label={
                            catalog.find(
                              (label) =>
                                label.name.toLocaleLowerCase('es-MX') ===
                                tag.toLocaleLowerCase('es-MX')
                            ) || { id: tag, name: tag }
                          }
                        />
                      ))}
                    </span>
                  )}
                </span>
                <FiChevronDown aria-hidden="true" className="shrink-0" />
              </summary>
              <div className="border-t border-(--c-border) py-3">
                {item.description && (
                  <p className="mb-2 whitespace-pre-wrap text-sm text-(--c-text-2)">
                    {item.description}
                  </p>
                )}
                <ClassTrainingEditor blocks={item.training} onChange={() => {}} readOnly />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() => {
                      setSaveError('')
                      setTagInput('')
                      setEditClass(item)
                      setDraft({
                        title: item.title || `Clase ${item.date} ${item.startTime}`,
                        description: item.description || '',
                        tags: item.tags || [],
                        training: item.training,
                      })
                    }}
                  >
                    <FiEdit2 aria-hidden="true" /> Editar
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() =>
                      duplicate(
                        item.title || `clase ${item.date} ${item.startTime}`,
                        item.training,
                        item.description,
                        item.tags
                      )
                    }
                  >
                    <FiCopy aria-hidden="true" /> Duplicar
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() =>
                      setTransfer({
                        id: item.id,
                        title: item.title || `Clase ${item.date} ${item.startTime}`,
                        observations: item.description,
                        blocks: item.training,
                      })
                    }
                  >
                    <FiRepeat aria-hidden="true" /> Transferir
                  </button>
                </div>
              </div>
            </details>
          ))}
          {sessions.slice(0, visibleCount).map((item) => (
            <details key={item.id} className="rounded-xl border border-(--c-border) bg-white px-4">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-semibold text-(--c-ocean)">
                <span className="grid min-w-0 gap-1.5">
                  <span>
                    {item.title}{' '}
                    <span className="text-xs font-normal text-(--c-text-2)">· Sesión suelta</span>
                  </span>
                  <SessionTotals blocks={item.training} />
                  {item.tags?.length > 0 && (
                    <span className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <LabelChip
                          key={tag}
                          label={
                            catalog.find(
                              (label) =>
                                label.name.toLocaleLowerCase('es-MX') ===
                                tag.toLocaleLowerCase('es-MX')
                            ) || { id: tag, name: tag }
                          }
                        />
                      ))}
                    </span>
                  )}
                </span>
                <FiChevronDown aria-hidden="true" />
              </summary>
              <div className="border-t border-(--c-border) py-3">
                {item.description && (
                  <p className="mb-2 whitespace-pre-wrap text-sm text-(--c-text-2)">
                    {item.description}
                  </p>
                )}
                <ClassTrainingEditor blocks={item.training} onChange={() => {}} readOnly />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() => {
                      setSaveError('')
                      setTagInput('')
                      setDraft({
                        id: item.id,
                        title: item.title,
                        description: item.description || '',
                        tags: item.tags || [],
                        training: item.training,
                      })
                    }}
                  >
                    <FiEdit2 aria-hidden="true" /> Editar
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() =>
                      duplicate(item.title, item.training, item.description, item.tags)
                    }
                  >
                    <FiCopy aria-hidden="true" /> Duplicar
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                    onClick={() =>
                      setTransfer({
                        id: item.id,
                        title: item.title,
                        observations: item.description,
                        blocks: item.training,
                      })
                    }
                  >
                    <FiRepeat aria-hidden="true" /> Transferir
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
      {transfer && (
        <WorkoutTransferSheet
          workout={transfer}
          allowImport
          disabled={false}
          onClose={() => setTransfer(null)}
          onImport={(workout) => {
            setTransfer(null)
            setSaveError('')
            setTagInput('')
            setEditClass(null)
            setDraft({
              title: workout.title || 'Entreno importado',
              description: workout.observations || '',
              tags: [],
              training: workout.blocks,
            })
          }}
        />
      )}
      {draft && (
        <Sheet
          open
          label={draft.id || editClass ? 'Editar sesión' : 'Nueva sesión'}
          keyboardAware
          showFooterClose={false}
          closeDisabled={saving}
          onClose={() => {
            setDraft(null)
            setEditClass(null)
          }}
          footer={
            editingSeries ? undefined : (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  className="btn btn-outline min-h-11"
                  onClick={() => {
                    setDraft(null)
                    setEditClass(null)
                  }}
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
            <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
              <h2 className="text-xl font-bold">
                {draft.id || editClass ? 'Editar sesión' : 'Nueva sesión'}
              </h2>
              {(draft.id || editClass) && (
                <button
                  type="button"
                  disabled={sharing}
                  onClick={() => void shareSession()}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-(--c-text-2) hover:bg-(--c-surface) disabled:opacity-50"
                >
                  <FiCopy aria-hidden="true" />
                  {sharing ? 'Copiando…' : 'Copiar enlace'}
                </button>
              )}
            </div>
            {shareMessage && (
              <p role="status" className="text-xs text-(--c-text-2)">
                {shareMessage}
              </p>
            )}
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              Nombre de la sesión
              <input
                className="box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 outline-none focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)"
                maxLength={100}
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </label>
            <label className="grid min-w-0 gap-2 text-sm font-semibold">
              Descripción <span className="sr-only">(opcional)</span>
              <textarea
                className="box-border min-h-20 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 py-2 outline-none [field-sizing:content] focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)"
                maxLength={2000}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="Describe el objetivo de esta sesión"
              />
            </label>
            <div className="grid min-w-0 gap-2">
              <label htmlFor="session-tag" className="text-sm font-semibold">
                Etiquetas
              </label>
              <div className="flex min-w-0 gap-2">
                <input
                  id="session-tag"
                  className="box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-(--c-border) bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)"
                  maxLength={40}
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  placeholder="Ej. Resistencia"
                />
                <StudentLabelColorSelector value={tagColor} onChange={setTagColor} modal square />
                <button
                  type="button"
                  className="btn btn-outline min-h-11"
                  disabled={!tagInput.trim() || draft.tags.length >= 20}
                  onClick={() => addTag(tagInput)}
                >
                  Agregar
                </button>
              </div>
              {catalog.some(
                (label) =>
                  !draft.tags.some(
                    (tag) =>
                      tag.toLocaleLowerCase('es-MX') === label.name.toLocaleLowerCase('es-MX')
                  ) &&
                  label.name
                    .toLocaleLowerCase('es-MX')
                    .includes(tagInput.trim().toLocaleLowerCase('es-MX'))
              ) && (
                <div className="grid gap-1">
                  <p className="text-xs text-(--c-text-2)">Sugerencias</p>
                  <div className="flex flex-wrap gap-2">
                    {catalog
                      .filter(
                        (label) =>
                          !draft.tags.some(
                            (tag) =>
                              tag.toLocaleLowerCase('es-MX') ===
                              label.name.toLocaleLowerCase('es-MX')
                          ) &&
                          label.name
                            .toLocaleLowerCase('es-MX')
                            .includes(tagInput.trim().toLocaleLowerCase('es-MX'))
                      )
                      .map((label) => (
                        <span key={label.id} className="inline-flex min-h-11 items-center">
                          <LabelChip label={label} onClick={() => addTag(label.name)} />
                        </span>
                      ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {draft.tags.map((tag) => (
                  <span key={tag} className="inline-flex min-h-11 items-center">
                    <LabelChip
                      label={
                        catalog.find(
                          (label) =>
                            label.name.toLocaleLowerCase('es-MX') === tag.toLocaleLowerCase('es-MX')
                        ) || { id: tag, name: tag, color: tagColors[tag] }
                      }
                      onRemove={() =>
                        setDraft({ ...draft, tags: draft.tags.filter((item) => item !== tag) })
                      }
                    />
                  </span>
                ))}
              </div>
            </div>
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
