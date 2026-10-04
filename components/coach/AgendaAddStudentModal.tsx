'use client'

import Sheet from '@comps/ui/sheet'
import { useEffect, useState } from 'react'
import { FiPlus, FiSearch, FiX } from 'react-icons/fi'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
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
  schoolId,
  busy,
  allowCreate = true,
  takenAthleteIds = [],
  takenNames = [],
  onClose,
  onSubmit,
}: {
  slotLabel: string
  schoolId?: string
  busy: boolean
  allowCreate?: boolean
  /** Students already booked in this class — cannot be added again. */
  takenAthleteIds?: string[]
  takenNames?: string[]
  onClose: () => void
  onSubmit: (payloads: AddStudentPayload[]) => void
}) {
  const terminology = useSchoolTerminology()
  const participantSingular =
    schoolId && terminology.schoolId ? terminology.participantSingular : 'alumno'
  const participantPlural =
    schoolId && terminology.schoolId ? terminology.participantPlural : 'alumnos'
  const [students, setStudents] = useState<CoachStudent[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createNames, setCreateNames] = useState<string[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    getAuthed(schoolId ? `/api/schools/${schoolId}/students` : '/api/coach/students')
      .then((response) => response.json())
      .then(
        (data: {
          students?:
            | CoachStudent[]
            | Array<{ id: string; name: string; studentEmail?: string; guardianPhone?: string }>
        }) => {
          if (!active) return
          if (!schoolId) {
            setStudents((data.students as CoachStudent[]) || [])
            return
          }
          setStudents(
            (data.students || [])
              .map((student) => {
                const schoolStudent = student as {
                  id?: string
                  name: string
                  studentEmail?: string
                  guardianPhone?: string
                }
                return {
                  athleteId: schoolStudent.id || '',
                  name: schoolStudent.name,
                  email: schoolStudent.studentEmail || null,
                  phone: schoolStudent.guardianPhone || null,
                }
              })
              .filter((student) => student.athleteId)
          )
        }
      )
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
  }, [schoolId])

  const takenIds = new Set(takenAthleteIds)
  const takenNamesNormalized = new Set(takenNames.map((name) => name.trim().toLowerCase()))
  const trimmedQuery = query.trim()
  const normalizedQuery = trimmedQuery.toLowerCase()
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
  // Only offer "create" when the typed name doesn't match an existing student,
  // someone already in the class, or a pending new name.
  const hasExactMatch =
    matches.some((student) => student.name.trim().toLowerCase() === normalizedQuery) ||
    takenNamesNormalized.has(normalizedQuery) ||
    createNames.some((name) => name.toLowerCase() === normalizedQuery)
  const canCreate = allowCreate && trimmedQuery.length > 1 && !hasExactMatch

  const selectedStudents = (students || []).filter((student) => selectedIds.has(student.athleteId))
  const totalSelected = selectedStudents.length + createNames.length
  const canSubmit = !busy && totalSelected > 0

  const toggleStudent = (athleteId: string) =>
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(athleteId)) next.delete(athleteId)
      else next.add(athleteId)
      return next
    })

  const addCreateName = () => {
    if (!canCreate) return
    setCreateNames((current) => [...current, trimmedQuery])
    setQuery('')
  }

  const submit = () => {
    if (!canSubmit) return
    onSubmit([
      ...selectedStudents.map((student) => ({
        athleteId: student.athleteId,
        athleteName: student.name,
        athleteEmail: student.email,
        athletePhone: student.phone,
      })),
      ...createNames.map((name) => ({ athleteName: name })),
    ])
  }

  return (
    <Sheet
      open
      onClose={onClose}
      label={`Agregar ${participantPlural}`}
      keyboardAware
      fullBleedMobile
      showFooterClose={false}
      footer={
        <div className="shrink-0 border-t border-[var(--c-border)] bg-white px-4 pb-3 pt-3 sm:px-0 sm:pb-0">
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="min-h-12 rounded-full bg-[var(--c-aqua)] px-4 font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:bg-slate-400 disabled:opacity-100"
            >
              {totalSelected > 1
                ? `Agregar ${totalSelected} ${participantPlural}`
                : `Agregar ${participantSingular}`}
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
      }
    >
      <div className="flex w-full flex-col">
        <div className="shrink-0 px-4 pt-3 sm:px-0 sm:pt-0">
          <h3 className="text-xl font-bold text-[var(--c-ocean)]">Agregar {participantPlural}</h3>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">{slotLabel}</p>
        </div>

        <div className="flex flex-col px-4 py-4 sm:px-0">
          {error && <p className="mb-3 text-sm text-[var(--c-error,#b91c1c)]">{error}</p>}

          <div className="flex flex-col gap-3">
            <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-[var(--c-ocean)]">
              Nombre de {participantSingular}
              <span className="relative">
                <FiSearch
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text-2)]"
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    allowCreate ? 'Escribe para buscar o crear' : 'Buscar alumno de la escuela'
                  }
                  className="min-h-12 w-full rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white pl-10 pr-3 font-normal text-[var(--c-ocean)] outline-none transition focus:border-[var(--c-aqua)] focus:ring-4 focus:ring-[rgba(0,180,216,0.16)]"
                />
              </span>
            </label>

            {totalSelected > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {selectedStudents.map((student) => (
                  <SelectedChip
                    key={student.athleteId}
                    label={student.name}
                    onRemove={() => toggleStudent(student.athleteId)}
                  />
                ))}
                {createNames.map((name) => (
                  <SelectedChip
                    key={`create-${name}`}
                    label={`${name} (nuevo)`}
                    onRemove={() =>
                      setCreateNames((current) => current.filter((item) => item !== name))
                    }
                  />
                ))}
              </ul>
            )}

            {students === undefined ? (
              <div className="flex min-h-40 items-center justify-center rounded-[var(--r-sm)] border border-[var(--c-border)] text-sm text-[var(--c-text-2)]">
                Cargando {participantPlural}...
              </div>
            ) : (
              <div className="flex max-h-[min(40dvh,20rem)] min-h-0 flex-col overflow-y-auto rounded-[var(--r-sm)] border border-[var(--c-border)] sm:max-h-72">
                {matches.map((student) => {
                  const taken = takenIds.has(student.athleteId)
                  const active = selectedIds.has(student.athleteId)
                  return (
                    <button
                      key={student.athleteId}
                      type="button"
                      onClick={() => !taken && toggleStudent(student.athleteId)}
                      disabled={taken}
                      className={`flex min-h-14 items-center gap-3 border-b border-[var(--c-border)] px-3 py-2.5 text-left transition-colors last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--c-aqua-strong)] ${
                        taken
                          ? 'cursor-not-allowed opacity-55'
                          : active
                            ? 'bg-[var(--c-aqua-light)]/45'
                            : 'hover:bg-[var(--c-surface)]'
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
                      {taken ? (
                        <span className="shrink-0 text-xs font-semibold text-[var(--c-text-2)]">
                          Ya en la clase
                        </span>
                      ) : (
                        active && (
                          <span className="shrink-0 text-xs font-bold text-[var(--c-aqua-strong)]">
                            ✓
                          </span>
                        )
                      )}
                    </button>
                  )
                })}

                {matches.length === 0 && !canCreate && (
                  <p className="px-3 py-6 text-center text-sm text-[var(--c-text-2)]">
                    {normalizedQuery
                      ? `No encontramos ${participantSingular} con esa búsqueda.`
                      : `No hay ${participantPlural} disponibles para agregar.`}
                  </p>
                )}

                {canCreate && (
                  <button
                    type="button"
                    onClick={addCreateName}
                    className={`flex min-h-14 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--c-aqua-strong)] ${
                      matches.length > 0 ? 'border-t border-[var(--c-border)]' : ''
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--c-aqua)] text-[var(--c-aqua-strong)]">
                      <FiPlus aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[var(--c-ocean)]">
                        Crear «{trimmedQuery}»
                      </span>
                      <span className="block truncate text-xs text-[var(--c-text-2)]">
                        Nuevo {participantSingular}
                      </span>
                    </span>
                  </button>
                )}

                {matches.length === 0 && !canCreate && (
                  <p className="px-3 py-4 text-sm text-[var(--c-text-2)]">
                    {trimmedQuery
                      ? `Escribe un nombre más largo para crear ${participantSingular}.`
                      : `Escribe un nombre para buscar o crear ${participantSingular}.`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

function SelectedChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li className="inline-flex items-center gap-1 rounded-full bg-[var(--c-aqua-light)]/45 py-1 pl-3 pr-1 text-xs font-semibold text-[var(--c-ocean)]">
      {label}
      <button
        type="button"
        aria-label={`Quitar ${label}`}
        onClick={onRemove}
        className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--c-ocean)] transition-colors hover:bg-white/70"
      >
        <FiX aria-hidden="true" />
      </button>
    </li>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
