'use client'

import { useMemo, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { schoolMembershipHasRole } from '@/lib/school'
import CoachAgenda from './CoachAgenda'
import ShareScheduleButton from './ShareScheduleButton'

const ALL_VIEW = 'all'
const PERSONAL_VIEW = 'personal'

export default function CoachAgendaWorkspace() {
  const { schools, status } = useSchoolSelection({ includePersonal: true })
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
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)
  const [editorTarget, setEditorTarget] = useState<string>(PERSONAL_VIEW)
  const agendaSources = useMemo(
    () => [
      { label: 'Míos' },
      ...coachSchools.map(({ school }) => ({ schoolId: school.id, label: school.name })),
    ],
    [coachSchools]
  )
  const targetOptions = useMemo(
    () => [
      { id: PERSONAL_VIEW, label: 'Míos' },
      ...coachSchools.map(({ school }) => ({ id: school.id, label: school.name })),
    ],
    [coachSchools]
  )

  if (status !== 'ready') return null

  const openEditor = () => {
    setEditorTarget(
      view === ALL_VIEW || view === PERSONAL_VIEW ? PERSONAL_VIEW : view.slice('school:'.length)
    )
    setScheduleEditorOpen(true)
  }
  const closeEditor = () => setScheduleEditorOpen(false)
  // While the hours editor is open, the agenda behind it follows the destination
  // picked inside the modal, so hours are saved to that target.
  const effectiveSchoolId = scheduleEditorOpen
    ? editorTarget === PERSONAL_VIEW
      ? undefined
      : editorTarget
    : view === ALL_VIEW || view === PERSONAL_VIEW
      ? undefined
      : view.slice('school:'.length)
  const effectiveAggregate = !scheduleEditorOpen && view === ALL_VIEW
  const effectiveLabel = scheduleEditorOpen
    ? targetOptions.find((option) => option.id === editorTarget)?.label || 'Míos'
    : view === ALL_VIEW
      ? 'Todos mis horarios'
      : view === PERSONAL_VIEW
        ? 'Mis horarios personales'
        : `Mis horarios · ${coachSchools.find(({ school }) => school.id === view.slice('school:'.length))?.school.name || ''}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <nav
          aria-label="Filtrar mis horarios"
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1"
        >
          {[
            { id: ALL_VIEW, label: 'Todos' },
            { id: PERSONAL_VIEW, label: 'Míos' },
            ...coachSchools.map(({ school }) => ({
              id: `school:${school.id}`,
              label: school.name,
            })),
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={view === option.id}
              onClick={() => {
                setView(option.id)
                setScheduleEditorOpen(false)
              }}
              className={`min-h-11 shrink-0 rounded-full border px-5 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${view === option.id ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean) hover:border-(--c-aqua-strong) hover:bg-(--c-surface)'}`}
            >
              {option.label}
            </button>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 pb-1">
          <ShareScheduleButton />
          <button
            type="button"
            onClick={openEditor}
            aria-label="Agregar horarios"
            title="Agregar horarios"
            className="btn btn-primary min-h-11 shrink-0 gap-2 px-3 sm:px-4"
          >
            <FiPlus aria-hidden="true" /> <span className="hidden sm:inline">Agregar horarios</span>
            <span className="sm:hidden">Agregar</span>
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h1 className="sr-only">{effectiveLabel}</h1>
        {effectiveAggregate ? (
          <CoachAgenda key="all" agendaSources={agendaSources} />
        ) : (
          <CoachAgenda
            key={scheduleEditorOpen ? 'editor' : effectiveSchoolId || 'personal'}
            schoolId={effectiveSchoolId}
            scheduleEditorOpen={scheduleEditorOpen}
            onScheduleEditorClose={closeEditor}
            scheduleTarget={scheduleEditorOpen ? editorTarget : undefined}
            scheduleTargetOptions={scheduleEditorOpen ? targetOptions : undefined}
            onScheduleTargetChange={scheduleEditorOpen ? setEditorTarget : undefined}
          />
        )}
      </section>
    </div>
  )
}
