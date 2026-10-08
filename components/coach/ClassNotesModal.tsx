'use client'

import { useEffect, useId, useState } from 'react'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import ClassTrainingEditor from '@/components/coach/ClassTrainingEditor'
import ScheduleTag from '@/components/ui/schedule-tag'
import Sheet from '@/components/ui/sheet'
import { type ClassTrainingBlock, normalizeClassTraining } from '@/lib/class-training'
import { getAuthed, putAuthed } from '@/lib/client/authed-api'
import { UNASSIGNED_SCHOOL_COACH_ID } from '@/lib/school'

export type ClassNotesTarget = {
  schoolId: string
  coachId: string
  coachName?: string | null
  date: string
  startTime: string
  endTime: string
  groupType: 'particular' | 'grupal'
}

export default function ClassNotesModal({
  target,
  onClose,
}: {
  target: ClassNotesTarget
  onClose: () => void
}) {
  const id = useId()
  const [note, setNote] = useState('')
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
  const endpoint = `/api/schools/${encodeURIComponent(target.schoolId)}/class-notes?coachId=${encodeURIComponent(target.coachId)}&date=${encodeURIComponent(target.date)}&time=${encodeURIComponent(target.startTime)}`
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
      open
      onClose={onClose}
      closeDisabled={saving}
      keyboardAware
      label="Notas de la clase"
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
        <h2 className="text-xl font-bold">Notas de la clase</h2>
        <ScheduleTag
          date={new Date(`${target.date}T12:00:00`).toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
          time={`${target.startTime}–${target.endTime}`}
          coachName={target.coachName || 'Sin profe aún'}
          unassigned={target.coachId === UNASSIGNED_SCHOOL_COACH_ID}
          groupType={target.groupType}
        />
        <label htmlFor={id} className="text-sm font-semibold">
          Notas generales
        </label>
        {loading ? (
          <p role="status" className="text-sm">
            Cargando notas…
          </p>
        ) : (
          <textarea
            id={id}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={saving || !loaded}
            maxLength={4000}
            rows={6}
            placeholder="Escribe observaciones generales sobre esta clase…"
            className="min-h-40 w-full resize-y rounded-xl border border-(--c-border) bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
          />
        )}
        <button
          type="button"
          disabled={!loaded || saving}
          aria-expanded={showTraining}
          aria-controls={`${id}-training`}
          onClick={() => setShowTraining(!showTraining)}
          className="btn btn-outline min-h-11 justify-between"
        >
          Entrenamiento{' '}
          {showTraining ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
        </button>
        {showTraining && (
          <div id={`${id}-training`}>
            <ClassTrainingEditor
              blocks={training}
              onChange={setTraining}
              disabled={saving}
              onEditingChange={setEditingSeries}
            />
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-[var(--c-error,#b91c1c)]">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}
