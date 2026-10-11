'use client'

import { useEffect, useId, useState } from 'react'
import { FiActivity, FiCheckSquare, FiSettings } from 'react-icons/fi'
import AttendanceModal from '@/components/coach/AttendanceModal'
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
  groupType: 'particular' | 'grupal'
}

export default function ClassNotesModal({
  target,
  onClose,
  onUpdated,
  onConfigure,
  suspended = false,
}: {
  target: ClassNotesTarget
  onClose: () => void
  onUpdated?: () => void
  onConfigure?: () => void
  suspended?: boolean
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
  const endpoint = `${target.schoolId ? `/api/schools/${encodeURIComponent(target.schoolId)}/class-notes` : '/api/coach/class-notes'}?coachId=${encodeURIComponent(target.coachId)}&date=${encodeURIComponent(target.date)}&time=${encodeURIComponent(target.startTime)}`
  useEffect(() => {
    let active = true
    getAuthed(endpoint)
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return
        setNote(payload.note || '')
        setOriginal(payload.note || '')
        const blocks = normalizeClassTraining(payload.training || []) || []
        setTraining(blocks)
        setOriginalTraining(JSON.stringify(blocks))
        setShowTraining(blocks.length > 0)
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
      onClose()
    } catch {
      setError('No pudimos guardar las notas. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Sheet
      open={!suspended}
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
        <h2 className="text-xl font-bold">Detalles del horario</h2>
        <ScheduleTag
          date={new Date(`${target.date}T12:00:00`).toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
          time={target.endTime ? `${target.startTime}–${target.endTime}` : target.startTime}
          coachName={target.coachName || 'Sin profe aún'}
          unassigned={target.coachId === UNASSIGNED_SCHOOL_COACH_ID}
          groupType={target.groupType}
        />
        <div className="class-detail-actions flex items-center gap-2">
          {onConfigure && (
            <button
              type="button"
              onClick={onConfigure}
              disabled={saving}
              className="btn btn-outline min-h-11 w-fit"
            >
              <FiSettings aria-hidden="true" /> Configurar
            </button>
          )}
          <button
            type="button"
            onClick={() => setAttendanceOpen(true)}
            disabled={loading || saving || !loaded}
            className="btn btn-outline min-h-11 w-fit"
          >
            <FiCheckSquare aria-hidden="true" /> Pasar lista
          </button>
          {!training.some((block) => block.series.length > 0) && (
            <button
              type="button"
              disabled={!loaded || saving}
              aria-haspopup="dialog"
              onClick={() => setShowTraining(true)}
              className="btn btn-outline min-h-11 w-fit"
            >
              <FiActivity aria-hidden="true" /> Entrenamiento
            </button>
          )}
        </div>
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
                  <p className="mb-1 text-xs font-semibold">Bloque {index + 1}</p>
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
      {showTraining && (
        <Sheet
          open
          onClose={() => {
            setShowTraining(false)
            setEditingSeries(false)
          }}
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
          initialSlot={{ coachId: target.coachId, startTime: target.startTime }}
          onClose={() => setAttendanceOpen(false)}
          onUpdated={() => onUpdated?.()}
        />
      )}
    </Sheet>
  )
}
