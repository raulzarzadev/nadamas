'use client'

import { type ReactNode, useState } from 'react'
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
  onChangeApproval,
  pending = false,
  progressSaved = false,
  classTag,
  onProfile,
}: {
  student: AgendaStudentAction
  busy: boolean
  error: string | null
  onClose: () => void
  onSave: (attended: boolean, note: string) => void
  onMove: () => void
  onRemove: () => void
  onProgress?: () => void
  onChangeApproval?: () => void
  pending?: boolean
  progressSaved?: boolean
  classTag?: ReactNode
  onProfile?: () => void
}) {
  const [note, setNote] = useState(student.note)
  const [confirmRemove, setConfirmRemove] = useState(false)

  if (confirmRemove) {
    return (
      <Sheet
        open
        label="Eliminar de la clase"
        closeDisabled={busy}
        onClose={() => setConfirmRemove(false)}
        footer={
          <div className="flex gap-2 px-4 sm:px-0">
            <button
              type="button"
              onClick={() => setConfirmRemove(false)}
              disabled={busy}
              className="btn btn-outline min-h-11 flex-1"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="min-h-11 flex-1 rounded-full bg-[var(--rose-tx)] px-3 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rose-tx)] disabled:opacity-50"
            >
              {busy ? 'Eliminando…' : 'Eliminar de la clase'}
            </button>
          </div>
        }
      >
        <div className="grid gap-3 px-4 pb-4 sm:px-0">
          <h3 className="text-xl font-bold text-(--c-ocean)">Eliminar de la clase</h3>
          <p className="text-sm text-(--c-text-2)">
            ¿Quieres retirar a <strong>{student.studentName}</strong> de la clase del {student.date}{' '}
            a las {student.startTime}?
          </p>
          {error && (
            <p role="alert" className="text-sm text-[var(--c-error,#b91c1c)]">
              {error}
            </p>
          )}
        </div>
      </Sheet>
    )
  }

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
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xl font-extrabold text-[var(--c-ocean)]">{student.studentName}</h3>
            {onProfile && (
              <button
                type="button"
                onClick={onProfile}
                disabled={busy}
                className="btn btn-outline shrink-0 h-8 min-h-8 border px-3 text-xs"
              >
                Ver perfil
              </button>
            )}
          </div>
          <div className="mt-2">
            {classTag || (
              <p className="text-sm text-[var(--c-text-2)]">
                {student.date} · {student.startTime}
              </p>
            )}
          </div>
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

        {onChangeApproval && (
          <button
            type="button"
            onClick={onChangeApproval}
            disabled={busy}
            className="btn btn-outline min-h-11"
          >
            {pending ? 'Aprobar inscripción' : 'Cambiar a pendiente'}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setConfirmRemove(true)}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-slate-400 bg-white px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-50"
          >
            <FiTrash2 aria-hidden="true" className="shrink-0" /> Cancelar clase
          </button>
          <button
            type="button"
            onClick={onMove}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--c-border)] px-2 text-sm font-bold text-[var(--c-ocean)] hover:bg-[var(--c-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:opacity-50"
          >
            <FiArrowRight aria-hidden="true" className="shrink-0" /> Cambiar clase
          </button>
        </div>
      </div>
    </Sheet>
  )
}
