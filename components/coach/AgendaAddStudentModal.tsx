'use client'

import Sheet from '@comps/ui/sheet'
import { type ComponentProps, useEffect, useState } from 'react'
import { FiClipboard, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import PaymentBookingOptions from '@/components/payments/PaymentBookingOptions'
import { StudentForm } from '@/components/school/SchoolStudents'
import ScheduleTag from '@/components/ui/schedule-tag'
import StudentListRow from '@/components/ui/student-list-row'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import type { AttendanceCandidate } from '@/lib/attendance'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { CoachAvailableSlot } from '@/lib/coach-agenda'
import { entityNameMatches, normalizeEntitySearch } from '@/lib/entity-matching'
import { UNASSIGNED_SCHOOL_COACH_ID } from '@/lib/school'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import StudentLabels from './StudentLabels'
import type { LabelList } from './StudentLabelTools'
import StudentProfileModal from './StudentProfileModal'

interface CoachStudent {
  gender?: string
  birthDate?: string
  additionalProfileId?: string
  athleteId: string
  name: string
  email: string | null
  phone: string | null
}

export interface AddStudentPayload {
  allowPackage?: boolean
  paymentExceptionReason?: string
  athleteId?: string
  athleteName: string
  athleteEmail?: string | null
  athletePhone?: string | null
}

function InlineStudentForm({ children, footer }: ComponentProps<typeof Sheet>) {
  return (
    <div>
      {children}
      {footer}
    </div>
  )
}

export default function AgendaAddStudentModal({
  standalone = false,
  canOverridePayments = false,
  attendance,
  embedded = false,
  submitError,
  slotLabel,
  selectedSlots,
  promotionRequired = false,
  occupiedIndividual = false,
  schoolId,
  coachId,
  busy,
  allowCreate = true,
  takenAthleteIds = [],
  takenNames = [],
  onClose,
  onSubmit,
}: {
  standalone?: boolean
  canOverridePayments?: boolean
  attendance?: { date: string; startTime: string; schoolClassId?: string; onUpdated: () => void }
  embedded?: boolean
  submitError?: string
  slotLabel: string
  promotionRequired?: boolean
  occupiedIndividual?: boolean
  selectedSlots?: Array<
    Pick<CoachAvailableSlot, 'date' | 'startTime' | 'coachId' | 'coachName' | 'groupType'>
  >
  schoolId?: string
  coachId?: string
  busy: boolean
  allowCreate?: boolean
  /** Students already booked in this class — cannot be added again. */
  takenAthleteIds?: string[]
  takenNames?: string[]
  onClose: () => void
  onSubmit: (payloads: AddStudentPayload[]) => unknown
}) {
  const [creatingName, setCreatingName] = useState<string | null>(null)
  const terminology = useSchoolTerminology()
  const participantSingular =
    schoolId && terminology.schoolId ? terminology.participantSingular : 'alumno'
  const participantPlural =
    schoolId && terminology.schoolId ? terminology.participantPlural : 'alumnos'
  const [labelData, setLabelData] = useState<LabelList>({ labels: [], assignments: {} })
  const [profileStudent, setProfileStudent] = useState<{ studentId: string; name: string } | null>(
    null
  )
  const [roster, setRoster] = useState<AttendanceCandidate[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(Boolean(attendance))
  const [attendanceBusy, setAttendanceBusy] = useState(false)
  const [occurrenceId, setOccurrenceId] = useState('')
  const [attendanceRevision, setAttendanceRevision] = useState(0)
  const attendanceEndpoint =
    schoolId && attendance?.schoolClassId
      ? `/api/schools/${encodeURIComponent(schoolId)}/attendance`
      : schoolId
        ? `/api/coach/attendance?${new URLSearchParams({ schoolId, coachId: coachId || '' })}`
        : '/api/coach/attendance'
  const attendanceDate = attendance?.date
  const attendanceStart = attendance?.startTime
  const schoolClassId = attendance?.schoolClassId
  useEffect(() => {
    if (!attendanceDate) return
    let active = true
    setAttendanceLoading(true)
    const load = async () => {
      const join = attendanceEndpoint.includes('?') ? '&' : '?'
      let id = schoolClassId
      if (!id) {
        const response = await getAuthed(
          `${attendanceEndpoint}${join}${new URLSearchParams({ date: attendanceDate, revision: String(attendanceRevision) })}`
        )
        const data = await response.json()
        id = data.classes?.find(
          (item: { startTime: string; teacherIds: string[] }) =>
            item.startTime === attendanceStart &&
            (!coachId ||
              item.teacherIds.includes(coachId) ||
              (coachId === UNASSIGNED_SCHOOL_COACH_ID && !item.teacherIds.length))
        )?.id
      }
      if (!id) {
        if (active) {
          setOccurrenceId('')
          setRoster([])
        }
        return
      }
      const response = await getAuthed(
        `${attendanceEndpoint}${join}${new URLSearchParams({ date: attendanceDate, occurrenceId: id })}`
      )
      const data = await response.json()
      if (active) {
        setOccurrenceId(id)
        setRoster(data.roster || [])
      }
    }
    void load()
      .catch(() => {
        if (active) setError('No pudimos cargar la asistencia. Inténtalo de nuevo.')
      })
      .finally(() => {
        if (active) setAttendanceLoading(false)
      })
    return () => {
      active = false
    }
  }, [
    attendanceEndpoint,
    attendanceDate,
    attendanceStart,
    schoolClassId,
    coachId,
    attendanceRevision,
  ])

  async function recordAttendance(candidate: AttendanceCandidate, attended: boolean) {
    if (attendanceBusy || !occurrenceId) return
    setAttendanceBusy(true)
    setError(null)
    try {
      await postAuthed(attendanceEndpoint, {
        occurrenceId,
        studentId: candidate.studentId,
        method: 'name',
        attended,
      })
      setRoster((current) =>
        current.map((item) =>
          item.studentId === candidate.studentId ? { ...item, attended } : item
        )
      )
      attendance?.onUpdated()
    } catch {
      setError('No pudimos registrar la asistencia. Inténtalo de nuevo.')
    } finally {
      setAttendanceBusy(false)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload labels after returning from profile edits.
  useEffect(() => {
    let active = true
    setLabelData({ labels: [], assignments: {} })
    getAuthed(
      `/api/coach/student-tags?entity=students${schoolId ? `&schoolId=${encodeURIComponent(schoolId)}` : ''}&view=list`
    )
      .then((response) => response.json() as Promise<LabelList>)
      .then((data) => {
        if (active) setLabelData(data)
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las etiquetas. Inténtalo de nuevo.')
      })
    return () => {
      active = false
    }
  }, [schoolId, attendanceRevision])
  const renderLabels = (id: string) =>
    labelData.assignments[id]?.length ? (
      <StudentLabels
        studentId={id}
        schoolId={schoolId}
        readOnly
        tiny
        compact
        horizontal
        data={{ labels: labelData.labels, selected: labelData.assignments[id] || [] }}
      />
    ) : null

  const [students, setStudents] = useState<CoachStudent[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createNames, setCreateNames] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [payment, setPayment] = useState({ allowPackage: false, paymentExceptionReason: '' })

  // biome-ignore lint/correctness/useExhaustiveDependencies: reload student details after profile edits or enrollment changes.
  useEffect(() => {
    let active = true
    const agendaQuery = allowCreate
      ? `?includeAgendaStudents=true${coachId ? `&coachId=${encodeURIComponent(coachId)}` : ''}`
      : ''
    getAuthed(
      schoolId
        ? `/api/schools/${encodeURIComponent(schoolId)}/students${agendaQuery}`
        : '/api/coach/students'
    )
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
                  guardianEmail?: string
                  gender?: string
                  birthDate?: string
                  additionalProfileId?: string
                }
                return {
                  athleteId: schoolStudent.id || '',
                  name: schoolStudent.name,
                  email: schoolStudent.studentEmail || schoolStudent.guardianEmail || null,
                  gender: schoolStudent.gender,
                  birthDate: schoolStudent.birthDate,
                  additionalProfileId: schoolStudent.additionalProfileId,
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
  }, [schoolId, coachId, allowCreate, attendanceRevision])

  const takenIds = new Set(takenAthleteIds)
  const takenNamesNormalized = new Set(takenNames.map((name) => normalizeEntitySearch(name)))
  const trimmedQuery = query.trim()
  const normalizedQuery = normalizeEntitySearch(trimmedQuery)
  const matches =
    students
      ?.filter((student) => {
        if (!normalizedQuery) return true
        return (
          entityNameMatches(student.name, trimmedQuery) ||
          [student.email || '', student.phone || '']
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        )
      })
      .slice(0, 5) || []
  // Only offer "create" when the typed name doesn't match an existing student,
  // someone already in the class, or a pending new name.
  const hasExactMatch =
    students?.some((student) => normalizeEntitySearch(student.name) === normalizedQuery) ||
    takenNamesNormalized.has(normalizedQuery) ||
    createNames.some((name) => normalizeEntitySearch(name) === normalizedQuery)
  const canCreate =
    allowCreate &&
    students !== undefined &&
    !error &&
    trimmedQuery.length > 1 &&
    !hasExactMatch &&
    (!attendance || matches.length === 0)

  const selectedStudents = (students || []).filter((student) => selectedIds.has(student.athleteId))
  const totalSelected = selectedStudents.length + createNames.length
  const canSubmit = !busy && !occupiedIndividual && totalSelected > 0

  const toggleStudent = (athleteId: string) =>
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(athleteId)) next.delete(athleteId)
      else next.add(athleteId)
      return next
    })

  const addCreateName = () => {
    if (!canCreate || busy) return
    setCreatingName(trimmedQuery)
  }

  const submit = async () => {
    if (!canSubmit) return
    const saved = await onSubmit([
      ...selectedStudents.map((student) => ({
        ...payment,
        athleteId: student.athleteId,
        athleteName: student.name,
        athleteEmail: student.email,
        athletePhone: student.phone,
      })),
      ...createNames.map((name) => ({ ...payment, athleteName: name })),
    ])
    if (saved && attendance) {
      setSelectedIds(new Set())
      setCreateNames([])
      setQuery('')
      setAttendanceRevision((current) => current + 1)
    }
  }

  if (creatingName !== null) {
    const selectCreated = (student: CoachStudent) => {
      setStudents((current) => [
        ...(current || []).filter((item) => item.athleteId !== student.athleteId),
        student,
      ])
      setSelectedIds((current) => new Set([...current, student.athleteId]))
      setQuery('')
      setCreatingName(null)
    }
    return (
      <StudentForm
        schoolId={schoolId}
        canInvite
        initialName={creatingName}
        onClose={() => setCreatingName(null)}
        onPersonalCreated={(student) => selectCreated({ ...student, phone: student.phone || null })}
        onCreated={(student) => {
          if (student)
            selectCreated({
              athleteId: student.id,
              name: student.name,
              email: student.studentEmail || null,
              phone: student.guardianPhone || null,
            })
          else setCreatingName(null)
        }}
      />
    )
  }

  const Container = embedded ? InlineStudentForm : Sheet
  return (
    <Container
      open
      onClose={onClose}
      label={attendance ? 'Pase de lista' : `Agregar ${participantPlural}`}
      keyboardAware
      closeDisabled={busy || attendanceBusy}
      fullBleedMobile
      showFooterClose
      footer={
        (!attendance || totalSelected > 0) && (
          <div className="shrink-0 bg-white px-4 pb-3 pt-3 sm:px-0 sm:pb-0">
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              {(!attendance || totalSelected > 0) && (
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={submit}
                  className="min-h-12 rounded-full bg-[var(--c-aqua)] px-4 font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:bg-slate-400 disabled:opacity-100"
                >
                  {promotionRequired
                    ? 'Cambiar a grupal y agregar'
                    : totalSelected > 1
                      ? `Agregar ${totalSelected} ${participantPlural}`
                      : `Agregar ${participantSingular}`}
                </button>
              )}
            </div>
          </div>
        )
      }
    >
      <div className="flex w-full flex-col">
        <div className="shrink-0 px-4 pt-3 sm:px-0 sm:pt-0">
          <h3 className="text-xl font-bold text-[var(--c-ocean)]">
            {attendance ? 'Pase de lista' : `Agregar ${participantPlural}`}
          </h3>
          {selectedSlots?.length ? (
            <ul className="mt-3 grid gap-2" aria-label="Horarios seleccionados">
              {[...selectedSlots]
                .sort((a, b) =>
                  `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
                )
                .map((slot) => (
                  <li key={`${slot.date}:${slot.startTime}:${slot.coachId}:${slot.groupType}`}>
                    <ScheduleTag
                      date={new Date(`${slot.date}T12:00:00`).toLocaleDateString('es-MX', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                      time={slot.startTime}
                      coachName={
                        slot.coachName ||
                        (slot.coachId === UNASSIGNED_SCHOOL_COACH_ID ? 'Sin profe aún' : undefined)
                      }
                      unassigned={slot.coachId === UNASSIGNED_SCHOOL_COACH_ID}
                      groupType={slot.groupType}
                    />
                  </li>
                ))}
            </ul>
          ) : slotLabel ? (
            <p className="mt-1 text-sm text-[var(--c-text-2)]">{slotLabel}</p>
          ) : null}
        </div>

        <div className="flex flex-col px-4 py-4 sm:px-0">
          {!standalone && (
            <PaymentBookingOptions
              value={payment}
              onChange={setPayment}
              canOverride={!schoolId || canOverridePayments}
            />
          )}
          {(promotionRequired || occupiedIndividual) && (
            <p
              role="status"
              className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              {occupiedIndividual
                ? 'Esta clase particular ya tiene un alumno. Cambia su tipo a grupal antes de agregar otro.'
                : 'Hay clases particulares que ya tienen un alumno. Al agregar otro, esas clases cambiarán a grupales.'}
            </p>
          )}
          {(error || submitError) && (
            <p className="mb-3 text-sm text-[var(--c-error,#b91c1c)]">{submitError || error}</p>
          )}

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

            {attendance && !trimmedQuery ? (
              <ul
                className="overflow-hidden rounded-[var(--r-md)] border border-(--c-border) bg-white shadow-[var(--shadow-sm)]"
                aria-label="Alumnos de la clase"
              >
                {attendanceLoading ? (
                  <li role="status">Cargando alumnos…</li>
                ) : roster.length ? (
                  roster.map((candidate) => {
                    const student = students?.find(
                      (item) =>
                        item.athleteId === (candidate.athleteId || candidate.studentId) ||
                        normalizeEntitySearch(item.name) === normalizeEntitySearch(candidate.name)
                    )
                    return (
                      <li
                        key={candidate.studentId}
                        className="border-b border-(--c-border) last:border-b-0"
                      >
                        <StudentListRow
                          student={{ ...student, name: candidate.name }}
                          labels={renderLabels(
                            student?.athleteId || candidate.athleteId || candidate.studentId || ''
                          )}
                          action={
                            <div className="flex shrink-0 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={candidate.attended}
                                disabled={busy || attendanceBusy || candidate.pending}
                                onChange={(event) =>
                                  void recordAttendance(candidate, event.target.checked)
                                }
                                className="h-5 w-5 shrink-0 accent-(--c-ocean)"
                                aria-label={`Asistencia de ${candidate.name}`}
                              />
                              <button
                                type="button"
                                aria-label={`Ver detalles de ${candidate.name}`}
                                title="Ver detalles del alumno"
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-sm)] border border-(--c-border) text-base text-(--c-ocean) transition hover:bg-(--c-surface) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
                                onClick={() =>
                                  setProfileStudent({
                                    studentId:
                                      student?.athleteId ||
                                      candidate.athleteId ||
                                      candidate.studentId ||
                                      '',
                                    name: candidate.name,
                                  })
                                }
                              >
                                <FiClipboard aria-hidden="true" />
                              </button>
                            </div>
                          }
                        />
                      </li>
                    )
                  })
                ) : (
                  <li className="text-sm text-(--c-text-2)">
                    Esta clase aún no tiene alumnos. Escribe un nombre para agregar o crear uno.
                  </li>
                )}
              </ul>
            ) : students === undefined ? (
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
                      <div className="min-w-0 max-w-[40%] shrink-0">
                        {renderLabels(student.athleteId)}
                      </div>
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
                    disabled={busy || attendanceBusy}
                    className={`flex min-h-14 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--c-aqua-strong)] ${
                      matches.length > 0 ? 'border-t border-[var(--c-border)]' : ''
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--c-aqua)] text-[var(--c-aqua-strong)]">
                      <FiPlus aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-[var(--c-ocean)]">
                        {attendance ? 'Crear y agregar a la clase' : `Crear «${trimmedQuery}»`}
                      </span>
                      <span className="block truncate text-xs text-[var(--c-text-2)]">
                        {attendance ? trimmedQuery : `Nuevo ${participantSingular}`}
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
      {profileStudent && (
        <StudentProfileModal
          {...profileStudent}
          schoolId={schoolId}
          onUpdated={() => {
            setAttendanceRevision((current) => current + 1)
            attendance?.onUpdated()
          }}
          onClose={() => {
            setProfileStudent(null)
            setAttendanceRevision((current) => current + 1)
          }}
        />
      )}
    </Container>
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
