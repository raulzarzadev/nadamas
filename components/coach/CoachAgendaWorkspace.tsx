'use client'

import { useMemo, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { schoolMembershipHasRole } from '@/lib/school'
import CoachAgenda from './CoachAgenda'
import ShareScheduleButton from './ShareScheduleButton'

export default function CoachAgendaWorkspace() {
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)
  const { schools, selectedId, isPersonal, status } = useSchoolSelection({ includePersonal: true })
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
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Horarios</h1>
            <p className="mt-1 text-sm text-(--c-text-2)">
              Horarios y clases de {activeSchool?.school.name || 'la escuela'}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScheduleEditorOpen(true)}
            className="btn btn-primary min-h-11 gap-2"
          >
            <FiPlus aria-hidden="true" /> Agregar horarios
          </button>
        </div>
        <CoachAgenda
          schoolId={selectedId || undefined}
          scheduleEditorOpen={scheduleEditorOpen}
          onScheduleEditorClose={() => setScheduleEditorOpen(false)}
        />
      </div>
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
        Como coach, aquí ves tus horarios publicados y clases agendadas.
      </p>
      <CoachAgenda
        scheduleEditorOpen={scheduleEditorOpen}
        onScheduleEditorClose={() => setScheduleEditorOpen(false)}
      />
    </div>
  )
}
