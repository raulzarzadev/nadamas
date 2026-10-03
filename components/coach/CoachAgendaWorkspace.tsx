'use client'

import { useMemo, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { schoolMembershipHasRole } from '@/lib/school'
import CoachAgenda from './CoachAgenda'
import ShareScheduleButton from './ShareScheduleButton'

const ALL_VIEW = 'all'
const PERSONAL_VIEW = 'personal'

export default function CoachAgendaWorkspace() {
  const { schools, status } = useSchoolSelection({ includePersonal: true })
  const terminology = useSchoolTerminology()
  const coachSchools = useMemo(() => {
    const seen = new Set<string>()
    return schools.filter(({ school, membership }) => {
      if (
        seen.has(school.id) ||
        membership.status !== 'active' ||
        !schoolMembershipHasRole(membership, 'teacher')
      )
        return false
      seen.add(school.id)
      return true
    })
  }, [schools])
  const [view, setView] = useState(ALL_VIEW)
  const agendaSources = useMemo(
    () => [
      { label: 'Míos' },
      ...coachSchools.map(({ school }) => ({ schoolId: school.id, label: school.name })),
    ],
    [coachSchools]
  )

  if (status !== 'ready') return null

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filtrar mis horarios" className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: ALL_VIEW, label: 'Todos' },
          { id: PERSONAL_VIEW, label: 'Míos' },
          ...coachSchools.map(({ school }) => ({ id: `school:${school.id}`, label: school.name })),
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={view === option.id}
            onClick={() => setView(option.id)}
            className={`min-h-11 shrink-0 rounded-full border px-5 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${view === option.id ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean) hover:border-(--c-aqua-strong) hover:bg-(--c-surface)'}`}
          >
            {option.label}
          </button>
        ))}
      </nav>

      {view === ALL_VIEW && (
        <section className="flex flex-col gap-3">
          <header>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-(--c-aqua-strong)">
              Modo entrenador
            </p>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Todos mis horarios</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-(--c-text-2)">
              Gestiona tu agenda, publica tus horarios y organiza las clases de tus alumnos desde
              aquí.
            </p>
          </header>
          <CoachAgenda key="all" agendaSources={agendaSources} />
        </section>
      )}

      {view === PERSONAL_VIEW && <PersonalAgendaSection terminology={terminology} />}

      {view.startsWith('school:') && (
        <SchoolAgendaSection
          schoolId={view.slice('school:'.length)}
          schoolName={
            coachSchools.find(({ school }) => school.id === view.slice('school:'.length))?.school
              .name || ''
          }
        />
      )}
    </div>
  )
}

function PersonalAgendaSection({
  terminology,
}: {
  terminology: ReturnType<typeof useSchoolTerminology>
}) {
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Mis horarios personales</h1>
          <p className="mt-1 text-sm text-(--c-text-2)">
            Horarios publicados y clases agendadas como {terminology.coachSingular}.
          </p>
        </div>
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
      </header>
      <CoachAgenda
        scheduleEditorOpen={scheduleEditorOpen}
        onScheduleEditorClose={() => setScheduleEditorOpen(false)}
      />
    </section>
  )
}

function SchoolAgendaSection({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Mis horarios · {schoolName}</h1>
          <p className="mt-1 text-sm text-(--c-text-2)">Tus horarios y clases asignadas.</p>
        </div>
        <button
          type="button"
          onClick={() => setScheduleEditorOpen(true)}
          className="btn btn-primary min-h-11 gap-2"
        >
          <FiPlus aria-hidden="true" /> Agregar horarios
        </button>
      </header>
      <CoachAgenda
        key={schoolId}
        schoolId={schoolId}
        scheduleEditorOpen={scheduleEditorOpen}
        onScheduleEditorClose={() => setScheduleEditorOpen(false)}
      />
    </section>
  )
}
