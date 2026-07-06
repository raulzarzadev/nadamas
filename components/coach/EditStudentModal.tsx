'use client'

import { useKeyboardSafeArea } from '@comps/hooks/useKeyboardSafeArea'
import { useState } from 'react'
import { putAuthed } from '@/lib/client/authed-api'
import type { StudentProgress } from '@/lib/coach-student-progress'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export interface EditableStudentDetails {
  athleteId: string
  name: string
  email: string | null
  phone?: string
  address?: string
  location?: string
  progress?: StudentProgress | null
}

export interface UpdatedStudentPayload {
  athleteId: string
  name: string
  email: string | null
  phone?: string
  address?: string
  location?: string
  progress: StudentProgress
}

export default function EditStudentModal({
  student,
  onClose,
  onSaved,
}: {
  student: EditableStudentDetails
  onClose: () => void
  onSaved: (student: UpdatedStudentPayload) => void
}) {
  const [name, setName] = useState(student.name)
  const [email, setEmail] = useState(student.email || '')
  const [phone, setPhone] = useState(student.phone || '')
  const [address, setAddress] = useState(student.address || '')
  const [location, setLocation] = useState(student.location || '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const keyboardSafeArea = useKeyboardSafeArea()
  const canSubmit = name.trim().length > 1 && status !== 'saving'

  async function save() {
    if (!canSubmit) return

    setStatus('saving')
    try {
      const response = await putAuthed('/api/coach/students', {
        athleteId: student.athleteId,
        name,
        email,
        phone,
        address,
        location,
      })
      const payload = (await response.json()) as { student: UpdatedStudentPayload }
      onSaved(payload.student)
    } catch (err) {
      reportInternalError('COACH_STUDENT_UPDATE', err)
      setStatus('error')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Editar datos de ${student.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(10,37,64,0.55)] p-4 backdrop-blur-sm"
      style={keyboardSafeArea ? { paddingBottom: `calc(${keyboardSafeArea}px + 1rem)` } : undefined}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-[var(--r-md)] bg-white p-5 shadow-[var(--shadow-md)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-(--c-border) sm:hidden" />
        <div>
          <h3 className="text-xl font-bold text-(--c-ocean)">Editar alumno</h3>
          <p className="mt-0.5 text-sm text-(--c-text-2)">
            Actualiza los datos de contacto y ubicación de este alumno.
          </p>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Nombre
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
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

        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Dirección
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            maxLength={240}
            placeholder="Opcional"
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) bg-white px-3 text-sm text-(--c-ocean)"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Ubicación
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            maxLength={500}
            placeholder="Link de Google Maps o referencia"
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
            {status === 'saving' ? 'Guardando...' : 'Guardar cambios'}
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
