'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiCalendar, FiMail, FiPhone, FiSearch, FiUser } from 'react-icons/fi'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { getAuthed } from '@/lib/client/authed-api'
import type { SchoolClassOccurrence, SchoolStudent } from '@/lib/school'
import { capitalizeSchoolTerm, schoolMembershipHasRole } from '@/lib/school'

export default function CoachSchoolStudents() {
  const { schools, selectedId, status } = useSchoolSelection({ includePersonal: true })
  const terminology = useSchoolTerminology()
  const participantSingular = terminology.schoolId ? terminology.participantSingular : 'alumno'
  const participantPlural = terminology.schoolId ? terminology.participantPlural : 'alumnos'
  const coachSchools = useMemo(
    () =>
      schools.filter(
        ({ membership }) =>
          membership.status === 'active' && schoolMembershipHasRole(membership, 'teacher')
      ),
    [schools]
  )
  const selected = useMemo(
    () => coachSchools.find(({ school }) => school.id === selectedId) || coachSchools[0] || null,
    [coachSchools, selectedId]
  )
  const [students, setStudents] = useState<SchoolStudent[]>([])
  const [classes, setClasses] = useState<SchoolClassOccurrence[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!selected) return
    let active = true
    setLoading(true)
    setMessage(null)
    Promise.all([
      getAuthed(`/api/schools/${selected.school.id}/students`),
      getAuthed(`/api/schools/${selected.school.id}/classes`),
    ])
      .then(async ([studentResponse, classResponse]) => {
        const [studentPayload, classPayload] = await Promise.all([
          studentResponse.json() as Promise<{ students?: SchoolStudent[] }>,
          classResponse.json() as Promise<{ classes?: SchoolClassOccurrence[] }>,
        ])
        if (!active) return
        setStudents(studentPayload.students || [])
        setClasses(classPayload.classes || [])
      })
      .catch(() => {
        if (active) setMessage(`No se pudieron cargar ${participantPlural} de esta escuela.`)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [selected, participantPlural])

  if (status === 'loading' || !selected) return null

  const normalizedQuery = query.trim().toLowerCase()
  const classesByStudent = new Map<string, number>()
  for (const item of classes) {
    for (const studentId of item.studentIds) {
      classesByStudent.set(studentId, (classesByStudent.get(studentId) || 0) + 1)
    }
  }
  const visibleStudents = students.filter((student) =>
    [student.name, student.studentEmail || '', student.guardianName, student.guardianEmail || '']
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  )

  return (
    <section className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-(--c-aqua-strong)">
            {capitalizeSchoolTerm(participantPlural)}
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-(--c-ocean)">
            {capitalizeSchoolTerm(participantPlural)} de la escuela
          </h2>
          <p className="mt-1 text-sm text-(--c-text-2)">{selected.school.name}</p>
        </div>
        {!loading && students.length > 0 && (
          <label className="relative min-w-56">
            <FiSearch
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--c-text-2)"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Buscar ${participantSingular}`}
              aria-label={`Buscar ${participantSingular}`}
              className="min-h-11 w-full rounded-full border border-(--c-border) bg-white pl-10 pr-3 text-sm text-(--c-ocean) outline-none focus:border-(--c-aqua) focus:ring-4 focus:ring-[rgba(0,180,216,0.16)]"
            />
          </label>
        )}
      </div>

      {message && (
        <p className="mt-4 rounded-[var(--r-sm)] bg-(--c-surface) p-3 text-sm text-(--c-text-2)">
          {message}
        </p>
      )}
      {loading ? (
        <p className="py-8 text-center text-sm text-(--c-text-2)">Cargando {participantPlural}…</p>
      ) : visibleStudents.length ? (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {visibleStudents.map((student) => (
            <li key={student.id} className="rounded-[var(--r-sm)] border border-(--c-border) p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-(--c-surface) text-(--c-ocean)">
                  <FiUser aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-(--c-ocean)">{student.name}</h3>
                  <p className="mt-1 text-xs text-(--c-text-2)">
                    {classesByStudent.get(student.id) || 0} clase
                    {(classesByStudent.get(student.id) || 0) === 1 ? '' : 's'} asignadas
                  </p>
                </div>
              </div>
              {student.studentEmail && (
                <p className="mt-4 flex items-center gap-2 text-sm text-(--c-text-2)">
                  <FiMail aria-hidden="true" /> {student.studentEmail}
                </p>
              )}
              {student.guardianName && (
                <p className="mt-2 text-sm text-(--c-text-2)">
                  Contacto: <span className="font-semibold">{student.guardianName}</span>
                </p>
              )}
              {student.guardianPhone && (
                <p className="mt-2 flex items-center gap-2 text-sm text-(--c-text-2)">
                  <FiPhone aria-hidden="true" /> {student.guardianPhone}
                </p>
              )}
              <p className="mt-2 flex items-center gap-2 text-xs text-(--c-text-2)">
                <FiCalendar aria-hidden="true" />
                {student.status === 'active'
                  ? `${capitalizeSchoolTerm(participantSingular)} activo`
                  : `${capitalizeSchoolTerm(participantSingular)} inactivo`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-[var(--r-sm)] border border-dashed border-(--c-border) bg-(--c-surface) p-8 text-center">
          <FiUser className="mx-auto text-3xl text-(--c-aqua-strong)" aria-hidden="true" />
          <p className="mt-3 font-bold text-(--c-ocean)">
            {students.length ? 'No hay coincidencias' : `Aún no hay ${participantPlural}`}
          </p>
          <p className="mt-1 text-sm text-(--c-text-2)">
            {students.length
              ? 'Prueba con otro nombre o correo.'
              : `Cuando la escuela registre ${participantPlural}, aparecerán aquí.`}
          </p>
        </div>
      )}
    </section>
  )
}
