'use client'

import Loading from '@comps/Loading'
import Avatar from '@comps/ui/avatar'
import { useSearchParams } from 'next/navigation'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  FiCalendar,
  FiChevronDown,
  FiEdit3,
  FiExternalLink,
  FiMail,
  FiMapPin,
  FiNavigation,
  FiPhone,
  FiPlus,
  FiSearch,
  FiTrendingUp,
} from 'react-icons/fi'
import { getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'
import type { StudentProgress, StudentProgressEntry } from '@/lib/coach-student-progress'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import AddStudentModal, { type CreatedStudentPayload } from './AddStudentModal'
import EditStudentModal, { type UpdatedStudentPayload } from './EditStudentModal'
import StudentProgressModal from './StudentProgressModal'

interface StudentSummary {
  athleteId: string
  name: string
  email: string | null
  phone?: string
  address?: string
  location?: string
  totalClasses: number
  nextClass?: Booking
  upcomingClasses?: Booking[]
  lastClass?: Booking
  progress?: StudentProgress | null
  entries: StudentProgressEntry[]
}

const ENTRY_PREVIEW = 4

export default function CoachStudents() {
  const [students, setStudents] = useState<StudentSummary[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  // Deep link from the agenda ("ver perfil") to open a student's card directly.
  const focusId = useSearchParams().get('student')

  useEffect(() => {
    getAuthed('/api/coach/students')
      .then((response) => response.json())
      .then((payload: { students?: StudentSummary[] }) => setStudents(payload.students || []))
      .catch((err) => {
        reportInternalError('COACH_STUDENTS_LOAD', err)
        setError(GENERIC_USER_ERROR)
        setStudents([])
      })
  }, [])

  if (students === undefined) return <Loading />

  const addStudent = (student: CreatedStudentPayload) => {
    setStudents((current) =>
      [...(current || []), student].sort((a, b) => a.name.localeCompare(b.name))
    )
    setAddModalOpen(false)
  }

  if (!students.length) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-(--c-text-2)">
            {error || 'Aún no tienes alumnos. Agrega uno para empezar a registrar progreso.'}
          </p>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-(--c-aqua) px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <FiPlus aria-hidden="true" /> Agregar alumno
          </button>
        </div>

        <div className="rounded-[var(--r-md)] border border-dashed border-(--c-border) bg-(--c-surface) p-10 text-center text-sm text-(--c-text-2)">
          Cuando tengas alumnos, aparecerán aquí.
        </div>

        {addModalOpen && (
          <AddStudentModal onClose={() => setAddModalOpen(false)} onCreated={addStudent} />
        )}
      </>
    )
  }

  const updateStudent = (
    athleteId: string,
    entry: StudentProgressEntry,
    progress: StudentProgress
  ) =>
    setStudents((current) =>
      current?.map((item) =>
        item.athleteId === athleteId
          ? { ...item, progress, entries: [entry, ...item.entries] }
          : item
      )
    )

  const updateStudentDetails = (updated: UpdatedStudentPayload) =>
    setStudents((current) =>
      current
        ?.map((item) =>
          item.athleteId === updated.athleteId
            ? {
                ...item,
                name: updated.name,
                email: updated.email,
                phone: updated.phone,
                address: updated.address,
                location: updated.location,
                progress: updated.progress,
              }
            : item
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    )

  const normalizedQuery = query.trim().toLowerCase()
  const visibleStudents = normalizedQuery
    ? students.filter((student) =>
        [
          student.name,
          student.email || '',
          student.phone || '',
          student.address || '',
          student.location || '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : students

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <FiSearch
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--c-text-2)"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar alumno"
            aria-label="Buscar alumno"
            className="min-h-11 w-full rounded-full border border-(--c-border) bg-white pl-10 pr-3 text-sm text-(--c-ocean) outline-none transition focus:border-(--c-aqua) focus:ring-4 focus:ring-[rgba(0,180,216,0.16)]"
          />
        </label>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-(--c-aqua) px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <FiPlus aria-hidden="true" /> Agregar alumno
        </button>
      </div>

      {visibleStudents.length === 0 ? (
        <p className="rounded-[var(--r-md)] border border-dashed border-(--c-border) bg-(--c-surface) p-6 text-center text-sm text-(--c-text-2)">
          No hay alumnos que coincidan con “{query.trim()}”.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleStudents.map((student) => (
            <StudentCard
              key={student.athleteId}
              student={student}
              focused={student.athleteId === focusId}
              onProgressSaved={(entry, progress) =>
                updateStudent(student.athleteId, entry, progress)
              }
              onDetailsSaved={updateStudentDetails}
            />
          ))}
        </ul>
      )}

      {addModalOpen && (
        <AddStudentModal onClose={() => setAddModalOpen(false)} onCreated={addStudent} />
      )}
    </>
  )
}

function StudentCard({
  student,
  focused = false,
  onProgressSaved,
  onDetailsSaved,
}: {
  student: StudentSummary
  focused?: boolean
  onProgressSaved: (entry: StudentProgressEntry, progress: StudentProgress) => void
  onDetailsSaved: (student: UpdatedStudentPayload) => void
}) {
  const [open, setOpen] = useState(focused)
  const [showAll, setShowAll] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const ref = useRef<HTMLLIElement>(null)

  // When deep-linked from the agenda, open and scroll this card into view.
  useEffect(() => {
    if (focused) {
      setOpen(true)
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focused])

  const level = student.progress?.level || 'Inicial'
  const assessment = student.progress?.coachAssessment
  const summary = `${student.totalClasses} ${student.totalClasses === 1 ? 'clase' : 'clases'} · Nivel ${level}`
  const visibleEntries = showAll ? student.entries : student.entries.slice(0, ENTRY_PREVIEW)

  return (
    <li
      ref={ref}
      className={`overflow-hidden rounded-[var(--r-md)] border bg-white shadow-[var(--shadow-sm)] ${
        focused ? 'border-(--c-aqua)' : 'border-(--c-border)'
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-(--c-surface)"
      >
        <Avatar name={student.name} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-(--c-ocean)">{student.name}</p>
          <p className="mt-0.5 truncate text-xs text-(--c-text-2)">{summary}</p>
        </div>
        <FiChevronDown
          aria-hidden="true"
          className={`shrink-0 text-(--c-ocean-mid) transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-(--c-border) p-4 sm:p-5">
          <div className="flex flex-col gap-1.5">
            {student.email && (
              <p className="flex items-center gap-2 text-sm text-(--c-text-2)">
                <FiMail aria-hidden="true" /> {student.email}
              </p>
            )}
            {student.phone && (
              <p className="flex items-center gap-2 text-sm text-(--c-text-2)">
                <FiPhone aria-hidden="true" /> {student.phone}
              </p>
            )}
            {student.address && (
              <p className="flex items-center gap-2 text-sm text-(--c-text-2)">
                <FiMapPin aria-hidden="true" /> {student.address}
              </p>
            )}
            {student.location &&
              (isWebUrl(student.location) ? (
                <a
                  href={student.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold text-(--c-aqua-strong) hover:underline"
                >
                  <FiNavigation aria-hidden="true" /> Ver ubicación
                  <FiExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="flex items-center gap-2 text-sm text-(--c-text-2)">
                  <FiNavigation aria-hidden="true" /> {student.location}
                </p>
              ))}
            {student.upcomingClasses && student.upcomingClasses.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-bold uppercase tracking-wide text-(--c-text-2)">
                  Próximas clases ({student.upcomingClasses.length})
                </p>
                {student.upcomingClasses.map((booking) => (
                  <p key={booking.id} className="flex items-center gap-2 text-sm text-(--c-text-2)">
                    <FiCalendar aria-hidden="true" className="shrink-0" /> {booking.date} ·{' '}
                    {booking.startTime}
                    {booking.locationName ? ` · ${booking.locationName}` : ''}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricPill
              icon={<FiCalendar aria-hidden="true" />}
              label="Clases"
              value={student.totalClasses}
            />
            <MetricPill
              icon={<FiTrendingUp aria-hidden="true" />}
              label="Avance"
              value={assessment ? `${assessment}/5` : '—'}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-(--c-border) bg-white px-4 py-2 text-sm font-bold text-(--c-ocean) transition-colors hover:bg-(--c-surface)"
            >
              <FiEdit3 aria-hidden="true" /> Editar datos
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-(--c-ocean) px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <FiPlus aria-hidden="true" /> Agregar progreso
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-(--c-ocean)">Progresos registrados</h4>
            {student.entries.length === 0 ? (
              <p className="rounded-[var(--r-sm)] border border-dashed border-(--c-border) bg-(--c-surface) p-4 text-sm text-(--c-text-2)">
                Aún no registras progreso. Agrega el primero.
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {visibleEntries.map((entry) => (
                    <EntryItem key={entry.id} entry={entry} />
                  ))}
                </ul>
                {student.entries.length > ENTRY_PREVIEW && (
                  <button
                    type="button"
                    onClick={() => setShowAll((current) => !current)}
                    className="self-start text-sm font-semibold text-(--c-aqua-strong) hover:underline"
                  >
                    {showAll
                      ? 'Mostrar menos'
                      : `Mostrar más (${student.entries.length - ENTRY_PREVIEW})`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <StudentProgressModal
          athleteId={student.athleteId}
          studentName={student.name}
          initial={student.progress}
          onClose={() => setModalOpen(false)}
          onSaved={(entry, progress) => {
            onProgressSaved(entry, progress)
            setModalOpen(false)
          }}
        />
      )}

      {editModalOpen && (
        <EditStudentModal
          student={student}
          onClose={() => setEditModalOpen(false)}
          onSaved={(updated) => {
            onDetailsSaved(updated)
            setEditModalOpen(false)
          }}
        />
      )}
    </li>
  )
}

function isWebUrl(value: string) {
  return /^https?:\/\//i.test(value.trim())
}

function EntryItem({ entry }: { entry: StudentProgressEntry }) {
  const [open, setOpen] = useState(false)
  const date = new Date(entry.createdAt).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <li className="rounded-[var(--r-sm)] border border-(--c-border)">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-start gap-2 p-3 text-left transition-colors hover:bg-(--c-surface)"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-(--c-ocean)">{date}</span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-(--c-surface) px-2.5 py-0.5 text-xs font-semibold text-(--c-ocean)">
              {entry.level} · {entry.coachAssessment}/5
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <DetailCol label="Objetivo" text={entry.goal} truncate={!open} />
            <DetailCol label="Próximo foco" text={entry.nextFocus} truncate={!open} />
          </div>
        </div>
        <FiChevronDown
          aria-hidden="true"
          className={`mt-0.5 shrink-0 text-(--c-ocean-mid) transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && entry.note && (
        <div className="px-3 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-(--c-text-2)">Nota</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-(--c-ocean)">{entry.note}</p>
        </div>
      )}
    </li>
  )
}

function DetailCol({ label, text, truncate }: { label: string; text: string; truncate: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-(--c-text-2)">{label}</p>
      <p className={`text-sm text-(--c-ocean) ${truncate ? 'truncate' : 'whitespace-pre-wrap'}`}>
        {text || '—'}
      </p>
    </div>
  )
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--r-sm)] bg-(--c-surface) px-3 py-2 text-sm text-(--c-ocean)">
      <span className="text-(--c-ocean-mid)">{icon}</span>
      <span className="text-(--c-text-2)">{label}</span>
      <strong className="ml-auto">{value}</strong>
    </div>
  )
}
