'use client'

import { useState } from 'react'
import { type ClassNotesTarget, classNotesEndpoint } from '@/components/coach/ClassNotesModal'
import ClassTrainingEditor from '@/components/coach/ClassTrainingEditor'
import Sheet from '@/components/ui/sheet'
import { type ClassTrainingBlock, normalizeClassTraining } from '@/lib/class-training'
import { getAuthed, putAuthed } from '@/lib/client/authed-api'

type BatchTarget = Pick<ClassNotesTarget, 'schoolId' | 'coachId' | 'date' | 'startTime'>

/** Writes one note or one training to every selected class. */
export default function ClassBatchNotesSheet({
  mode,
  targets,
  onClose,
  onSaved,
}: {
  mode: 'note' | 'training'
  targets: BatchTarget[]
  onClose: () => void
  onSaved?: () => void
}) {
  const [note, setNote] = useState('')
  const [training, setTraining] = useState<ClassTrainingBlock[]>([])
  const [editingSeries, setEditingSeries] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const title = mode === 'note' ? 'Nota de las clases' : 'Entrenamiento de las clases'
  const canSave = mode === 'note' ? note.trim().length > 0 : training.length > 0

  const save = async () => {
    if (saving || !canSave) return
    const validTraining = mode === 'training' ? normalizeClassTraining(training) : undefined
    if (validTraining === null) {
      setError(
        'Completa el ejercicio y las repeticiones de cada serie. Cada bloque necesita al menos una serie y entre 1 y 99 repeticiones.'
      )
      return
    }
    setSaving(true)
    setError('')
    try {
      await Promise.all(
        targets.map(async (target) => {
          const endpoint = classNotesEndpoint(target)
          if (mode === 'note') return putAuthed(endpoint, { note })
          // The API requires the note on every write: keep each class's current note.
          const current = await (await getAuthed(endpoint)).json()
          return putAuthed(endpoint, { note: current.note || '', training: validTraining })
        })
      )
      onSaved?.()
      onClose()
    } catch {
      setError('No pudimos guardar en todas las clases. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      label={title}
      keyboardAware
      closeDisabled={saving}
      footer={
        editingSeries ? undefined : (
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || !canSave}
              onClick={() => void save()}
            >
              {saving ? 'Guardando…' : `Aplicar a ${targets.length}`}
            </button>
          </div>
        )
      }
    >
      <div className="grid gap-3 pb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <BatchNotice count={targets.length} />
        {mode === 'note' && (
          <p className="text-xs text-(--c-text-2)">Reemplaza la nota actual de cada clase.</p>
        )}
        {mode === 'note' ? (
          <textarea
            aria-label={title}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={saving}
            maxLength={4000}
            rows={5}
            placeholder="Escribe observaciones generales para estas clases…"
            className="w-full resize-y rounded-xl border border-(--c-border) bg-white p-3 text-sm focus-visible:outline-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
          />
        ) : (
          <ClassTrainingEditor
            blocks={training}
            onChange={setTraining}
            disabled={saving}
            onEditingChange={setEditingSeries}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}

/** Reminder shown on every multi-class edit. */
export function BatchNotice({ count }: { count: number }) {
  return (
    <p role="note" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
      Estos cambios se aplicarán a{' '}
      {count === 1 ? 'la clase seleccionada' : `las ${count} clases seleccionadas`}.
    </p>
  )
}
