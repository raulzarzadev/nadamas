'use client'

import { useState } from 'react'
import { FiArrowRight, FiCheck, FiEdit2, FiTrash2 } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'

export type AgendaStudentAction = {
  studentId: string
  studentName: string
  attended: boolean
  note: string
  date: string
  startTime: string
}

export default function AgendaStudentActions({
  student,
  busy,
  error,
  onClose,
  onSave,
  onMove,
  onRemove,
  onProgress,
  progressSaved = false,
}: {
  student: AgendaStudentAction
  busy: boolean
  error: string | null
  onClose: () => void
  onSave: (attended: boolean, note: string) => void
  onMove: () => void
  onRemove: () => void
  onProgress?: () => void
  progressSaved?: boolean
}) {
  const [note, setNote] = useState(student.note)
  const [confirmRemove, setConfirmRemove] = useState(false)

  return (
    <Sheet
      open
      keyboardAware
      fullBleedMobile
      label={`Ficha de ${student.studentName}`}
      closeDisabled={busy}
      onClose={onClose}
    >
      <div className="flex flex-col gap-5 px-4 pb-4 sm:px-0">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--c-ocean)]">{student.studentName}</h3>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">
            {student.date} · {student.startTime}
          </p>
        </div>

        {error && <p className="text-sm font-semibold text-[var(--c-error,#b91c1c)]">{error}</p>}

        <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--c-ocean)]">
          Nota de esta clase
          <textarea
            value={note}
            onChange={(event) => setNote(event.currentTarget.value)}
            maxLength={1000}
            rows={4}
            disabled={busy}
            placeholder="Escribe una observación sobre este alumno…"
            className="w-full resize-y rounded-[var(--r-sm)] border border-[var(--c-border)] p-3 text-sm font-normal text-[var(--c-ocean)] focus-visible:outline-none focus-visible:border-[var(--c-aqua-strong)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--c-aqua-strong)] disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          onClick={() => onSave(student.attended, note)}
          disabled={busy || note === student.note}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--c-aqua)] px-5 text-sm font-bold text-white hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100"
        >
          <FiCheck aria-hidden="true" /> {busy ? 'Guardando…' : 'Guardar nota'}
        </button>

        {onProgress && student.attended && (
          <button
            type="button"
            onClick={onProgress}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--c-border)] px-4 text-sm font-bold text-[var(--c-ocean)] hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:opacity-50"
          >
            <FiEdit2 aria-hidden="true" /> {progressSaved ? 'Progreso guardado' : 'Progreso'}
          </button>
        )}

        <div>
          <button
            type="button"
            onClick={onMove}
            disabled={busy}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--c-border)] px-4 text-sm font-bold text-[var(--c-ocean)] hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:opacity-50"
          >
            <FiArrowRight aria-hidden="true" /> Cambiar de clase
          </button>
        </div>

        {confirmRemove ? (
          <div className="rounded-[var(--r-sm)] border border-[var(--rose-bd)] bg-[var(--rose-bg)] p-3">
            <p className="text-sm font-semibold text-[var(--rose-tx)]">
              ¿Eliminar a {student.studentName} de esta clase?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                disabled={busy}
                className="min-h-11 flex-1 rounded-full border border-[var(--c-border)] bg-white px-3 text-sm font-bold"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={onRemove}
                disabled={busy}
                className="min-h-11 flex-1 rounded-full bg-[var(--rose-tx)] px-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-center px-4 text-sm font-bold text-[var(--rose-tx)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rose-tx)] disabled:opacity-50"
          >
            <FiTrash2 aria-hidden="true" /> Eliminar de la clase
          </button>
        )}
      </div>
    </Sheet>
  )
}
