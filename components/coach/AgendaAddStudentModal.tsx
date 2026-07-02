'use client'

import { useKeyboardSafeArea } from '@comps/hooks/useKeyboardSafeArea'
import { useEffect, useState } from 'react'
import { FiPlus, FiSearch } from 'react-icons/fi'
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
  // null = nothing chosen, 'create' = create new with current query, otherwise an athleteId
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const keyboardSafeArea = useKeyboardSafeArea()

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

  const trimmedQuery = query.trim()
  const normalizedQuery = trimmedQuery.toLowerCase()
  const selected = students?.find((student) => student.athleteId === selectedId)
  const matches =
    students
      ?.filter((student) => {
        if (!normalizedQuery) return true
        return [student.name, student.email || '', student.phone || '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .slice(0, 5) || []
  // Only offer "create" when the typed name doesn't exactly match an existing student.
  const hasExactMatch = matches.some(
    (student) => student.name.trim().toLowerCase() === normalizedQuery
  )
  const canCreate = trimmedQuery.length > 1 && !hasExactMatch
  const creating = selectedId === 'create'

  const canSubmit = !busy && (Boolean(selected) || (creating && canCreate))

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
    if (creating && canCreate) onSubmit({ athleteName: trimmedQuery })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agregar alumno"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[rgba(10,37,64,0.55)] p-4 backdrop-blur-sm"
      style={keyboardSafeArea ? { paddingBottom: `calc(${keyboardSafeArea}px + 1rem)` } : undefined}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--r-md)] bg-white shadow-[var(--shadow-md)] sm:max-h-[min(86dvh,38rem)]">
        <div className="shrink-0 px-4 pt-3 sm:px-5 sm:pt-5">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--c-border)] sm:hidden" />
          <h3 className="text-xl font-bold text-[var(--c-ocean)]">Agregar alumno</h3>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">{slotLabel}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {error && <p className="mb-3 text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

          <div className="flex flex-col gap-3">
            <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-[var(--c-ocean)]">
              Nombre del alumno
              <span className="relative">
                <FiSearch
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-2)]"
                />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setSelectedId(null)
                  }}
                  placeholder="Escribe para buscar o crear"
                  className="min-h-12 w-full rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white pl-10 pr-3 font-normal text-[var(--c-ocean)] outline-none transition focus:border-[var(--c-aqua)] focus:ring-4 focus:ring-[rgba(0,180,216,0.16)]"
                />
              </span>
            </label>

            {students === undefined ? (
              <div className="flex h-40 items-center justify-center rounded-[var(--r-sm)] border border-[var(--c-border)] text-sm text-[var(--c-text-2)] sm:h-56">
                Cargando alumnos...
              </div>
            ) : (
              <div className="flex h-40 flex-col overflow-y-auto rounded-[var(--r-sm)] border border-[var(--c-border)] sm:h-56">
                {matches.map((student) => {
                  const active = student.athleteId === selectedId
                  return (
                    <button
                      key={student.athleteId}
                      type="button"
                      onClick={() => setSelectedId(active ? null : student.athleteId)}
                      className={`flex min-h-14 items-center gap-3 border-b border-[var(--c-border)] px-3 py-2.5 text-left transition-colors last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--c-aqua-strong)] ${
                        active ? 'bg-[var(--c-aqua-light)]/45' : 'hover:bg-[var(--c-surface)]'
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--c-aqua)] to-[var(--c-ocean)] text-xs font-bold text-white">
                        {initials(student.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-[var(--c-ocean)]">
                          {student.name}
                        </span>
                        {student.email && (
                          <span className="block truncate text-xs text-[var(--c-text-2)]">
                            {student.email}
                          </span>
                        )}
                      </span>
                      {active && (
                        <span className="shrink-0 text-xs font-bold text-[var(--c-aqua-strong)]">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}

                {canCreate && (
                  <button
                    type="button"
                    onClick={() => setSelectedId('create')}
                    className={`flex min-h-14 items-center gap-3 px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--c-aqua-strong)] ${
                      matches.length > 0 ? 'border-t border-[var(--c-border)]' : ''
                    } ${creating ? 'bg-[var(--c-aqua-light)]/45' : 'hover:bg-[var(--c-surface)]'}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--c-aqua)] text-[var(--c-aqua-strong)]">
                      <FiPlus aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[var(--c-ocean)]">
                        Crear «{trimmedQuery}»
                      </span>
                      <span className="block truncate text-xs text-[var(--c-text-2)]">
                        Nuevo alumno
                      </span>
                    </span>
                    {creating && (
                      <span className="shrink-0 text-xs font-bold text-[var(--c-aqua-strong)]">
                        ✓
                      </span>
                    )}
                  </button>
                )}

                {matches.length === 0 && !canCreate && (
                  <p className="px-3 py-4 text-sm text-[var(--c-text-2)]">
                    {trimmedQuery
                      ? 'Escribe un nombre más largo para crear un alumno.'
                      : 'Escribe un nombre para buscar o crear un alumno.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--c-border)] bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-5">
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="min-h-12 rounded-full bg-[var(--c-aqua)] px-4 font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:bg-slate-400 disabled:opacity-100"
            >
              {creating ? 'Crear y agregar' : 'Agregar alumno'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-full px-4 font-semibold text-[var(--c-text-2)] hover:text-[var(--c-ocean)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
            >
              Cancelar
            </button>
          </div>
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
