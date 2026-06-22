'use client'

import { useState } from 'react'
import { patchAuthed } from '@/lib/client/authed-api'
import {
  STUDENT_LEVELS,
  type StudentLevel,
  type StudentProgress,
  type StudentProgressEntry,
} from '@/lib/coach-student-progress'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export default function StudentProgressModal({
  athleteId,
  studentName,
  initial,
  onClose,
  onSaved,
}: {
  athleteId: string
  studentName: string
  initial?: StudentProgress | null
  onClose: () => void
  onSaved: (entry: StudentProgressEntry, progress: StudentProgress) => void
}) {
  // Level/avance carry the student's current state as a starting point; the
  // session text fields start blank so each entry is a fresh log.
  const [level, setLevel] = useState<StudentLevel>(initial?.level || 'Inicial')
  const [coachAssessment, setCoachAssessment] = useState(initial?.coachAssessment || 1)
  const [goal, setGoal] = useState('')
  const [nextFocus, setNextFocus] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  async function save() {
    setStatus('saving')
    try {
      const response = await patchAuthed('/api/coach/students', {
        athleteId,
        level,
        coachAssessment,
        goal,
        nextFocus,
        lastNote: note,
      })
      const payload = (await response.json()) as {
        progress: StudentProgress
        entry: StudentProgressEntry
      }
      onSaved(payload.entry, payload.progress)
    } catch (err) {
      reportInternalError('COACH_STUDENT_PROGRESS_SAVE', err)
      setStatus('error')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Agregar progreso de ${studentName}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,37,64,0.55)] p-4 backdrop-blur-sm sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-[var(--r-md)] bg-white p-5 shadow-[var(--shadow-md)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-(--c-border) sm:hidden" />
        <div>
          <h3 className="text-xl font-bold text-(--c-ocean)">Agregar progreso</h3>
          <p className="mt-0.5 text-sm text-(--c-text-2)">{studentName}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Nivel
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value as StudentLevel)}
              className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-sm text-(--c-ocean)"
            >
              {STUDENT_LEVELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Avance
            <input
              type="number"
              min="1"
              max="5"
              value={coachAssessment}
              onChange={(event) => setCoachAssessment(Number(event.target.value))}
              className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-sm text-(--c-ocean)"
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Objetivo
          <input
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            maxLength={240}
            placeholder="Ej. mejorar respiración bilateral"
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-sm text-(--c-ocean)"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Próximo foco
          <input
            value={nextFocus}
            onChange={(event) => setNextFocus(event.target.value)}
            maxLength={240}
            placeholder="Ej. salida y patada constante"
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-sm text-(--c-ocean)"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Nota de la sesión
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={800}
            rows={3}
            placeholder="Observaciones de técnica, asistencia o tareas para la siguiente clase."
            className="rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 py-2 text-sm text-(--c-ocean)"
          />
        </label>

        {status === 'error' && (
          <p className="text-sm text-(--c-error,#b91c1c)">{GENERIC_USER_ERROR}</p>
        )}

        <div className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={save}
            disabled={status === 'saving'}
            className="min-h-12 rounded-full bg-(--c-ocean) font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === 'saving' ? 'Guardando…' : 'Guardar progreso'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full font-semibold text-(--c-text-2) hover:text-(--c-ocean)"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
