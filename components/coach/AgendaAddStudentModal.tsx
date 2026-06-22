'use client'

import { useEffect, useState } from 'react'
import { getAuthed } from '@/lib/client/authed-api'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

interface CoachStudent {
  athleteId: string
  name: string
  email: string | null
  phone: string | null
}

export interface AddStudentPayload {
  athleteId?: string
  athleteName: string
  athleteEmail?: string | null
  athletePhone?: string | null
}

export default function AgendaAddStudentModal({
  slotLabel,
  busy,
  onClose,
  onSubmit,
}: {
  slotLabel: string
  busy: boolean
  onClose: () => void
  onSubmit: (payload: AddStudentPayload) => void
}) {
  const [students, setStudents] = useState<CoachStudent[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manualName, setManualName] = useState('')

  useEffect(() => {
    let active = true
    getAuthed('/api/coach/students')
      .then((response) => response.json())
      .then((data: { students?: CoachStudent[] }) => {
        if (active) setStudents(data.students || [])
      })
      .catch((err) => {
        reportInternalError('AGENDA_STUDENTS_LOAD', err)
        if (active) {
          setStudents([])
          setError(GENERIC_USER_ERROR)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const selected = students?.find((student) => student.athleteId === selectedId)
  const canSubmit = !busy && (Boolean(selected) || manualName.trim().length > 0)

  const submit = () => {
    if (selected) {
      onSubmit({
        athleteId: selected.athleteId,
        athleteName: selected.name,
        athleteEmail: selected.email,
        athletePhone: selected.phone,
      })
      return
    }
    const name = manualName.trim()
    if (name) onSubmit({ athleteName: name })
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
        <div className="mx-auto h-1 w-10 rounded-full bg-[var(--c-border)] sm:hidden" />
        <div>
          <h3 className="text-xl font-bold text-[var(--c-ocean)]">Agregar alumno</h3>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">{slotLabel}</p>
        </div>

        {error && <p className="text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

        {students === undefined ? (
          <p className="py-6 text-center text-sm text-[var(--c-text-2)]">Cargando alumnos…</p>
        ) : (
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {students.length === 0 && (
              <p className="text-sm text-[var(--c-text-2)]">
                Aún no tienes alumnos. Escribe un nombre abajo para agregar uno manualmente.
              </p>
            )}
            {students.map((student) => {
              const active = student.athleteId === selectedId
              return (
                <button
                  key={student.athleteId}
                  type="button"
                  onClick={() => {
                    setSelectedId(active ? null : student.athleteId)
                    setManualName('')
                  }}
                  className={`flex items-center gap-3 rounded-[var(--r-sm)] border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-[var(--c-aqua)] bg-[var(--c-aqua-light)]/40'
                      : 'border-[var(--c-border)] hover:bg-[var(--c-surface)]'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--c-aqua)] to-[var(--c-ocean)] text-xs font-bold text-white">
                    {initials(student.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[var(--c-ocean)]">
                      {student.name}
                    </span>
                    {student.email && (
                      <span className="block truncate text-xs text-[var(--c-text-2)]">
                        {student.email}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm font-semibold text-[var(--c-ocean)]">
          O agrega un nombre manual
          <input
            value={manualName}
            onChange={(event) => {
              setManualName(event.target.value)
              setSelectedId(null)
            }}
            placeholder="Nombre del alumno"
            className="min-h-11 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 font-normal"
          />
        </label>

        <div className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="min-h-12 rounded-full bg-[var(--c-aqua)] font-bold text-white transition-opacity hover:opacity-90 disabled:bg-slate-400 disabled:opacity-100"
          >
            Agregar alumno
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full font-semibold text-[var(--c-text-2)] hover:text-[var(--c-ocean)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
