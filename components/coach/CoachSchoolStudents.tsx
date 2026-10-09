'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiSearch, FiUser } from 'react-icons/fi'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import ClassStudentRow from '@/components/ui/class-student-row'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { getAuthed } from '@/lib/client/authed-api'
import type { SchoolClassOccurrence, SchoolStudent } from '@/lib/school'
import { capitalizeSchoolTerm, schoolMembershipHasRole } from '@/lib/school'
import { coachVisibleSchoolStudentIds } from '@/lib/school-coach-students'
import type { SchoolStudentHistory } from '@/lib/school-student-history'
import StudentLabels from './StudentLabels'
import StudentLabelTools from './StudentLabelTools'
import StudentProfileModal from './StudentProfileModal'

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
  const [counts, setCounts] = useState<Record<string, { taken: number; scheduled: number } | null>>(
    {}
  )
  const [filteredIds, setFilteredIds] = useState<string[] | null>(null)
  const [labelRevision, setLabelRevision] = useState(0)
  const [query, setQuery] = useState('')
  const [profileStudent, setProfileStudent] = useState<SchoolStudent | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!selected) return
    let active = true
    setLoading(true)
    setMessage(null)
    setCounts({})
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
        const queue = [...(studentPayload.students || [])]
        const schoolId = selected.school.id
        await Promise.all(
          Array.from({ length: Math.min(4, queue.length) }, async () => {
            while (active && queue.length) {
              const student = queue.shift()
              if (!student) break
              try {
                const response = await getAuthed(
                  `/api/schools/${encodeURIComponent(schoolId)}/students/${encodeURIComponent(student.id)}/history`
                )
                const history = (await response.json()) as SchoolStudentHistory
                if (active)
                  setCounts((current) => ({
                    ...current,
                    [student.id]: {
                      taken: history.classes.filter((item) => item.status === 'taken').length,
                      scheduled: history.classes.filter((item) => item.status === 'scheduled')
                        .length,
                    },
                  }))
              } catch {
                if (active) setCounts((current) => ({ ...current, [student.id]: null }))
              }
            }
          })
        )
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

  const includedStudentIds = coachVisibleSchoolStudentIds(classes, selected.school.timezone)
  const normalizedQuery = query.trim().toLowerCase()
  const visibleStudents = students.filter(
    (student) =>
      includedStudentIds.has(student.id) &&
      (filteredIds === null || filteredIds.includes(student.id)) &&
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

      {students.length > 0 && (
        <StudentLabelTools
          key={selected.school.id}
          schoolId={selected.school.id}
          students={students.filter((student) => includedStudentIds.has(student.id))}
          revision={labelRevision}
          onFilter={setFilteredIds}
          onUpdated={() => setLabelRevision((current) => current + 1)}
        />
      )}
      {message && (
        <p className="mt-4 rounded-[var(--r-sm)] bg-(--c-surface) p-3 text-sm text-(--c-text-2)">
          {message}
        </p>
      )}
      {loading ? (
        <p className="py-8 text-center text-sm text-(--c-text-2)">Cargando {participantPlural}…</p>
      ) : visibleStudents.length ? (
        <ul className="mt-4 grid gap-2">
          {visibleStudents.map((student) => (
            <li key={student.id} className="rounded-xl border border-(--c-border)">
              <ClassStudentRow
                name={student.name}
                labels={
                  <StudentLabels
                    key={`${student.id}:${labelRevision}`}
                    studentId={student.id}
                    schoolId={selected.school.id}
                    readOnly
                  />
                }
                onEdit={() => setProfileStudent(student)}
                editLabel={`Ver perfil de ${student.name}`}
                actions={
                  <span className="text-right text-xs text-(--c-text-2)">
                    {counts[student.id]
                      ? `${counts[student.id]?.taken} ${counts[student.id]?.taken === 1 ? 'tomada' : 'tomadas'} · ${counts[student.id]?.scheduled} ${counts[student.id]?.scheduled === 1 ? 'agendada' : 'agendadas'}`
                      : counts[student.id] === null
                        ? 'Historial no disponible'
                        : 'Cargando historial…'}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 rounded-[var(--r-sm)] border border-dashed border-(--c-border) bg-(--c-surface) p-8 text-center">
          <FiUser className="mx-auto text-3xl text-(--c-aqua-strong)" aria-hidden="true" />
          <p className="mt-3 font-bold text-(--c-ocean)">
            {normalizedQuery
              ? 'No hay coincidencias'
              : 'Todavía no tienes atletas con clases asignadas'}
          </p>
          <p className="mt-1 text-sm text-(--c-text-2)">
            {normalizedQuery
              ? 'Prueba con otro nombre o correo.'
              : 'Aquí aparecen atletas con clases próximas contigo y a quienes ya les diste clase.'}
          </p>
        </div>
      )}
      {profileStudent && (
        <StudentProfileModal
          key={profileStudent.id}
          studentId={profileStudent.id}
          schoolId={selected.school.id}
          name={profileStudent.name}
          onClose={() => {
            setProfileStudent(null)
            setLabelRevision((current) => current + 1)
          }}
        />
      )}
    </section>
  )
}
