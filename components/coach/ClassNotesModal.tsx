'use client'

import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState } from 'react'
import AttendanceModal from '@/components/coach/AttendanceModal'
import ClassQuickActions, { type ClassQuickAction } from '@/components/coach/ClassQuickActions'
import ClassTrainingEditor from '@/components/coach/ClassTrainingEditor'
import ScheduleTag from '@/components/ui/schedule-tag'
import Sheet from '@/components/ui/sheet'
import TrainingBrace from '@/components/ui/training-brace'
import { type ClassTrainingBlock, normalizeClassTraining } from '@/lib/class-training'
import { getAuthed, putAuthed } from '@/lib/client/authed-api'
import { UNASSIGNED_SCHOOL_COACH_ID } from '@/lib/school'

export type ClassNotesTarget = {
  schoolId?: string
  coachId: string
  coachName?: string | null
  date: string
  startTime: string
  endTime?: string
  enrolledCount?: number
  schoolClassId?: string
  groupType: 'particular' | 'grupal'
}

export function classNotesEndpoint(
  target: Pick<ClassNotesTarget, 'schoolId' | 'coachId' | 'date' | 'startTime'>
) {
  return `${target.schoolId ? `/api/schools/${encodeURIComponent(target.schoolId)}/class-notes` : '/api/coach/class-notes'}?coachId=${encodeURIComponent(target.coachId)}&date=${encodeURIComponent(target.date)}&time=${encodeURIComponent(target.startTime)}`
}

export function classDetailsHref(target: ClassNotesTarget) {
  return target.schoolId
    ? `/school/classes/details?${new URLSearchParams({ schoolId: target.schoolId, slots: JSON.stringify([{ coachId: target.coachId, date: target.date, startTime: target.startTime, groupType: target.groupType }]) })}`
    : `/coach/classes/details?${new URLSearchParams({ coachId: target.coachId, date: target.date, time: target.startTime, type: target.groupType })}`
}

function InlineClassDetails({ children, footer }: ComponentProps<typeof Sheet>) {
  return (
    <section className="grid gap-4 rounded-2xl border border-(--c-border) bg-white p-4">
      {children}
      {footer}
    </section>
  )
}

export default function ClassNotesModal({
  target,
  onClose,
  onUpdated,
  onConfigure,
  onAddStudents,
  addStudentsContent,
  suspended = false,
  embedded = false,
  initialAction,
}: {
  target: ClassNotesTarget
  onClose: () => void
  onUpdated?: () => void
  onConfigure?: () => void
  onAddStudents?: () => void
  addStudentsContent?: ReactNode
  suspended?: boolean
  embedded?: boolean
  /** Opens training, note editing or attendance as soon as the class loads. */
  initialAction?: ClassQuickAction
}) {
  const id = useId()
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [note, setNote] = useState('')
  const [editingNote, setEditingNote] = useState(false)
  const [original, setOriginal] = useState('')
  const [training, setTraining] = useState<ClassTrainingBlock[]>([])
  const [originalTraining, setOriginalTraining] = useState('[]')
  const [showTraining, setShowTraining] = useState(false)
  const [editingSeries, setEditingSeries] = useState(false)
  const changed = note !== original || JSON.stringify(training) !== originalTraining
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const classLink = classDetailsHref(target)
  const endpoint = classNotesEndpoint(target)
  useEffect(() => {
    let active = true
    setLoading(true)
    setLoaded(false)
    setNote('')
    setOriginal('')
    setTraining([])
    setOriginalTraining('[]')
    setShowTraining(false)
    setAttendanceOpen(false)
    setEditingNote(false)
    setEditingSeries(false)
    setError('')
    getAuthed(endpoint)
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return
        setNote(payload.note || '')
        setOriginal(payload.note || '')
        const blocks = normalizeClassTraining(payload.training || []) || []
        setTraining(blocks)
        setOriginalTraining(JSON.stringify(blocks))
        setLoaded(true)
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las notas. Cierra y vuelve a intentarlo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [endpoint])
  // Opened from a toolbar shortcut: show only that tool's modal, never the details panel.
  const direct =
    !embedded &&
    (initialAction === 'training' ||
      initialAction === 'note' ||
      (initialAction === 'attendance' && !onAddStudents))
  const runAction = (action: ClassQuickAction) => {
    if (action === 'configure') onConfigure?.()
    else if (action === 'training') setShowTraining(true)
    else if (action === 'note') setEditingNote(true)
    else if (onAddStudents) onAddStudents()
    else setAttendanceOpen(true)
  }
  const initialActionDone = useRef(false)
  useEffect(() => {
    if (!loaded || !initialAction || initialActionDone.current) return
    initialActionDone.current = true
    if (initialAction === 'training') setShowTraining(true)
    else if (initialAction === 'note') setEditingNote(!direct)
    else if (initialAction === 'attendance') {
      if (onAddStudents) onAddStudents()
      else setAttendanceOpen(true)
    }
  }, [loaded, initialAction, onAddStudents, direct])
  const save = async () => {
    if (!loaded || loading || saving || !changed) return
    const validTraining = normalizeClassTraining(training)
    if (!validTraining) {
      setError(
        'Completa el ejercicio y las repeticiones de cada serie. Cada bloque necesita al menos una serie y entre 1 y 99 repeticiones.'
      )
      setShowTraining(true)
      return
    }
    setSaving(true)
    setError('')
    try {
      await putAuthed(endpoint, { note, training: validTraining })
      setOriginal(note)
      setOriginalTraining(JSON.stringify(validTraining))
      setShowTraining(false)
      onUpdated?.()
      if (!embedded) onClose()
    } catch {
      setError('No pudimos guardar las notas. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }
  const closeTool = (close: () => void) => () => {
    close()
    if (direct) onClose()
  }
  const Container = embedded ? InlineClassDetails : Sheet
  return (
    <>
      <Container
        open={!suspended && (!direct || (Boolean(error) && !loaded))}
        onClose={onClose}
        closeDisabled={saving}
        keyboardAware
        fullBleedMobile
        label="Detalles del horario"
        footer={
          editingSeries ? undefined : (
            <div className="flex justify-end px-4 sm:px-0">
              <button
                type="button"
                disabled={!loaded || loading || saving || !changed}
                onClick={() => void save()}
                className="btn btn-primary min-h-11"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          )
        }
      >
        <div className="grid gap-4 px-4 pb-4 sm:px-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Detalles del horario</h2>
            <ClassQuickActions
              canConfigure={Boolean(onConfigure)}
              viewHref={embedded ? undefined : classLink}
              disabled={loading || saving || !loaded}
              onAction={runAction}
            />
          </div>
          <ScheduleTag
            date={new Date(`${target.date}T12:00:00`)
              .toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })
              .replaceAll(' de ', ' ')
              .replaceAll('.', '')
              .replace(/^./, (letter) => letter.toLocaleUpperCase())}
            time={target.startTime}
            coachName={target.coachName || 'Sin profe aún'}
            unassigned={target.coachId === UNASSIGNED_SCHOOL_COACH_ID}
            groupType={target.groupType}
            enrolledCount={target.enrolledCount}
          />
          {loading ? (
            <p role="status" className="text-sm">
              Cargando notas…
            </p>
          ) : editingNote ? (
            <div className="grid gap-2">
              <label htmlFor={id} className="text-sm font-semibold">
                Notas generales
              </label>
              <textarea
                id={id}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={saving || !loaded}
                maxLength={4000}
                rows={4}
                placeholder="Escribe observaciones generales sobre esta clase…"
                className="w-full resize-y rounded-xl border border-(--c-border) bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
              />
              <button
                type="button"
                className="btn btn-subtle note-edit-action w-fit justify-self-end"
                onClick={() => setEditingNote(false)}
              >
                Listo
              </button>
            </div>
          ) : (
            <div
              className={
                note.trim()
                  ? 'flex flex-col items-start gap-1'
                  : 'flex items-start justify-between gap-3'
              }
            >
              <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-(--c-text-2)">
                {note.trim() || 'Sin notas'}
              </p>
              <button
                type="button"
                className={`btn btn-subtle note-edit-action shrink-0 underline underline-offset-4 ${note.trim() ? 'self-end' : ''}`}
                disabled={saving || !loaded}
                onClick={() => setEditingNote(true)}
              >
                Editar nota
              </button>
            </div>
          )}

          {!loading && training.some((block) => block.series.length > 0) && (
            <section aria-label="Resumen del entrenamiento" className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Entrenamiento</h3>
                <button
                  type="button"
                  className="btn btn-subtle note-edit-action"
                  disabled={!loaded || saving}
                  aria-haspopup="dialog"
                  onClick={() => setShowTraining(true)}
                >
                  Editar entreno
                </button>
              </div>
              {training
                .filter((block) => block.series.length > 0)
                .map((block, index) => (
                  <div key={block.id} className="rounded-xl bg-(--c-surface) p-2.5">
                    <p className="mb-1 text-xs font-semibold">
                      <span className="font-normal text-(--c-text-2)">{index + 1} · </span>
                      {block.title || 'Bloque'}
                    </p>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-1.5">
                      <div className="flex items-center gap-1 self-stretch text-sm font-bold">
                        <span className="flex w-10 shrink-0 justify-center">
                          {block.repetitions}×
                        </span>
                        <TrainingBrace />
                      </div>
                      <ul className="min-w-0 self-center">
                        {block.series.map((series) => (
                          <li key={series.id} className="py-0.5 text-xs leading-tight">
                            <strong>
                              {series.repetitions}×
                              {series.distanceMeters !== null ? ` ${series.distanceMeters} m` : ''}
                            </strong>{' '}
                            {series.exercise}
                            {series.material && (
                              <span className="text-(--c-text-2)"> · {series.material}</span>
                            )}
                            {series.interval && (
                              <span className="text-(--c-text-2)"> · Cada {series.interval}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
            </section>
          )}
          {error && (
            <p role="alert" className="text-sm text-[var(--c-error,#b91c1c)]">
              {error}
            </p>
          )}
        </div>
      </Container>
      {showTraining && (
        <Sheet
          open
          onClose={closeTool(() => {
            setShowTraining(false)
            setEditingSeries(false)
          })}
          label="Entrenamiento"
          keyboardAware
          closeDisabled={saving}
          footer={
            editingSeries ? undefined : (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!loaded || saving || !changed}
                  onClick={() => void save()}
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            )
          }
        >
          <div className="grid gap-4 pb-4">
            <h2 className="text-xl font-bold">Entrenamiento</h2>
            <ClassTrainingEditor
              blocks={training}
              onChange={setTraining}
              disabled={saving}
              onEditingChange={setEditingSeries}
            />
            {error && (
              <p role="alert" className="text-sm text-[var(--c-error,#b91c1c)]">
                {error}
              </p>
            )}
          </div>
        </Sheet>
      )}
      {attendanceOpen && (
        <AttendanceModal
          schoolId={target.schoolId}
          date={target.date}
          occurrenceId={target.schoolClassId}
          bookingBased={Boolean(target.schoolId && !target.schoolClassId && target.enrolledCount)}
          initialSlot={{ coachId: target.coachId, startTime: target.startTime }}
          onClose={closeTool(() => setAttendanceOpen(false))}
          onUpdated={() => onUpdated?.()}
          onAddStudents={onAddStudents}
          addStudentsContent={addStudentsContent}
        />
      )}
      {direct && initialAction === 'note' && loaded && (
        <Sheet
          open
          onClose={onClose}
          label="Nota de la clase"
          keyboardAware
          closeDisabled={saving}
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || !changed}
                onClick={() => void save()}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          }
        >
          <div className="grid gap-3 pb-4">
            <h2 className="text-xl font-bold">Nota de la clase</h2>
            <textarea
              aria-label="Nota de la clase"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={saving}
              maxLength={4000}
              rows={5}
              placeholder="Escribe observaciones generales sobre esta clase…"
              className="w-full resize-y rounded-xl border border-(--c-border) bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
            />
            {error && (
              <p role="alert" className="text-sm text-[var(--c-error,#b91c1c)]">
                {error}
              </p>
            )}
          </div>
        </Sheet>
      )}
    </>
  )
}
