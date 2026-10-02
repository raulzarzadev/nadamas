'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { useUser } from '@/context/UserContext'
import { getAuthed } from '@/lib/client/authed-api'
import { schoolMembershipHasRole } from '@/lib/school'
import CoachAgenda from './CoachAgenda'
import ShareScheduleButton from './ShareScheduleButton'

export default function CoachAgendaWorkspace() {
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)
  const { schools, selectedId, isPersonal, status } = useSchoolSelection({ includePersonal: true })
  const terminology = useSchoolTerminology()
  const hasSchoolSelection = useMemo(
    () =>
      schools.some(
        ({ school, membership }) =>
          school.id === selectedId &&
          membership.status === 'active' &&
          schoolMembershipHasRole(membership, 'teacher')
      ),
    [schools, selectedId]
  )
  const hasActiveSchool = !isPersonal && hasSchoolSelection
  const activeSchool = schools.find((item) => item.school.id === selectedId)

  if (status !== 'ready') return null

  if (hasActiveSchool) {
    return (
      <SchoolCoachAgenda
        key={selectedId}
        schoolId={selectedId || ''}
        schoolName={activeSchool?.school.name || 'la escuela'}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Mis horarios</h1>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setScheduleEditorOpen(true)}
            className="btn btn-primary min-h-11 gap-2"
          >
            <FiPlus aria-hidden="true" /> Agregar horarios
          </button>
          <ShareScheduleButton />
        </div>
      </div>
      <p className="text-[var(--c-text-2)] text-xs">
        Como {terminology.schoolId ? terminology.coachSingular : 'coach'}, aquí ves tus horarios
        publicados y clases agendadas.
      </p>
      <CoachAgenda
        scheduleEditorOpen={scheduleEditorOpen}
        onScheduleEditorClose={() => setScheduleEditorOpen(false)}
      />
    </div>
  )
}

function SchoolCoachAgenda({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const { user } = useUser() as { user: { uid?: string; id?: string } | null }
  const terminology = useSchoolTerminology()
  const selfId = user?.uid || user?.id
  const [coachFilter, setCoachFilter] = useState('mine')
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string; status: string }>>([])
  const [message, setMessage] = useState<string | null>(null)
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)
  const ownSchedule = coachFilter === 'mine' || coachFilter === selfId

  useEffect(() => {
    let active = true
    getAuthed(`/api/schools/${schoolId}/teachers`)
      .then((response) => response.json())
      .then((payload) => {
        if (active) setTeachers(payload.teachers || [])
      })
      .catch(() => {
        if (active) setMessage('No se pudo cargar la lista de responsables. Inténtalo de nuevo.')
      })
    return () => {
      active = false
    }
  }, [schoolId])

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Horarios</h1>
        <p className="mt-1 text-sm text-(--c-text-2)">Horarios y clases de {schoolName}.</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="grid gap-2 text-sm font-bold text-(--c-ocean)">
          Ver horarios de {terminology.coachSingular}
          <select
            className="select select-bordered min-h-11 w-full sm:w-64"
            value={coachFilter}
            onChange={(event) => {
              setCoachFilter(event.target.value)
              setScheduleEditorOpen(false)
            }}
          >
            <option value="">Todos los {terminology.coachPlural}</option>
            <option value="mine">Mis horarios</option>
            {teachers
              .filter((teacher) => teacher.status === 'active' && teacher.id !== selfId)
              .map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
          </select>
        </label>
        {ownSchedule && (
          <button
            type="button"
            onClick={() => setScheduleEditorOpen(true)}
            className="btn btn-primary min-h-11 gap-2"
          >
            <FiPlus aria-hidden="true" /> Agregar horarios
          </button>
        )}
      </div>
      {message && <p className="text-sm text-(--c-text-2)">{message}</p>}
      <CoachAgenda
        key={coachFilter}
        schoolId={schoolId}
        coachId={ownSchedule ? undefined : coachFilter || undefined}
        aggregateSchool={!ownSchedule}
        readOnly={!ownSchedule}
        scheduleEditorOpen={ownSchedule && scheduleEditorOpen}
        onScheduleEditorClose={() => setScheduleEditorOpen(false)}
      />
    </div>
  )
}
