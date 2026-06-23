'use client'

import { useState } from 'react'
import { postAuthed } from '@/lib/client/authed-api'
import type { StudentProgress } from '@/lib/coach-student-progress'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export interface CreatedStudentPayload {
  athleteId: string
  name: string
  email: string | null
  phone?: string
  totalClasses: number
  progress: StudentProgress
  entries: []
}

export default function AddStudentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (student: CreatedStudentPayload) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const canSubmit = name.trim().length > 1 && status !== 'saving'

  async function save() {
    if (!canSubmit) return

    setStatus('saving')
    try {
      const response = await postAuthed('/api/coach/students', {
        name,
        email,
        phone,
      })
      const payload = (await response.json()) as { student: CreatedStudentPayload }
      onCreated(payload.student)
    } catch (err) {
      reportInternalError('COACH_STUDENT_CREATE', err)
      setStatus('error')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agregar alumno"
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
          <h3 className="text-xl font-bold text-(--c-ocean)">Agregar alumno</h3>
          <p className="mt-0.5 text-sm text-(--c-text-2)">
            Crea un alumno para registrar progreso aunque todavía no tenga reservas.
          </p>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Nombre
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="Ej. Ana López"
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-sm text-(--c-ocean)"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Correo
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={160}
            placeholder="Opcional"
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-sm text-(--c-ocean)"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Teléfono
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={40}
            placeholder="Opcional"
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-sm text-(--c-ocean)"
          />
        </label>

        {status === 'error' && (
          <p className="text-sm text-(--c-error,#b91c1c)">{GENERIC_USER_ERROR}</p>
        )}

        <div className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={save}
            className="min-h-12 rounded-full bg-(--c-ocean) font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === 'saving' ? 'Guardando...' : 'Agregar alumno'}
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
