'use client'

import { useMemo, useState } from 'react'
import { FiPlus } from 'react-icons/fi'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useRole } from '@/context/RoleContext'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { schoolMembershipHasRole } from '@/lib/school'
import CoachAgenda from './CoachAgenda'
import ShareScheduleButton from './ShareScheduleButton'

const ALL_VIEW = 'all'
const PERSONAL_VIEW = 'personal'

export default function CoachAgendaWorkspace() {
  const tenant = useTenantSchool()
  const { schools, status } = useSchoolSelection({ includePersonal: true })
  const { setActiveRole } = useRole()
  const coachSchools = useMemo(() => {
    const seen = new Set<string>()
    return schools.filter(({ school, membership }) => {
      if (
        seen.has(school.id) ||
        (tenant && school.id !== tenant.id) ||
        membership.status !== 'active' ||
        !schoolMembershipHasRole(membership, 'teacher')
      )
        return false
      seen.add(school.id)
      return true
    })
  }, [schools, tenant])
  const [view, setView] = useState(PERSONAL_VIEW)
  const activeView = tenant ? `school:${tenant.id}` : view
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
      ...(!tenant ? [{ id: PERSONAL_VIEW, label: 'Míos' }] : []),
      ...coachSchools.map(({ school }) => ({ id: school.id, label: school.name })),
    ],
    [coachSchools, tenant]
  )

  if (status !== 'ready') return null

  const openEditor = () => {
    setEditorTarget(
      tenant?.id ||
        (activeView === ALL_VIEW || activeView === PERSONAL_VIEW
          ? PERSONAL_VIEW
          : activeView.slice('school:'.length))
    )
    setScheduleEditorOpen(true)
  }
  const closeEditor = () => setScheduleEditorOpen(false)
  // While the hours editor is open, the agenda behind it follows the destination
  // picked inside the modal, so hours are saved to that target.
  const effectiveSchoolId =
    tenant?.id ||
    (scheduleEditorOpen
      ? editorTarget === PERSONAL_VIEW
        ? undefined
        : editorTarget
      : activeView === ALL_VIEW || activeView === PERSONAL_VIEW
        ? undefined
        : activeView.slice('school:'.length))
  const effectiveAggregate = !scheduleEditorOpen && activeView === ALL_VIEW
  const effectiveLabel = scheduleEditorOpen
    ? targetOptions.find((option) => option.id === editorTarget)?.label || 'Míos'
    : activeView === ALL_VIEW
      ? 'Todos mis horarios'
      : activeView === PERSONAL_VIEW
        ? 'Mis horarios personales'
        : `Mis horarios · ${coachSchools.find(({ school }) => school.id === activeView.slice('school:'.length))?.school.name || ''}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <nav
          aria-label="Filtrar mis horarios"
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1"
        >
          {[
            ...(!tenant
              ? [
                  { id: ALL_VIEW, label: 'Todos' },
                  { id: PERSONAL_VIEW, label: 'Míos' },
                ]
              : []),
            ...coachSchools.map(({ school, membership }) => ({
              id: `school:${school.id}`,
              label: school.name,
              directs: schoolMembershipHasRole(membership, 'director'),
            })),
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={activeView === option.id}
              title={'directs' in option && option.directs ? 'Abrir modo director' : undefined}
              onClick={() => {
                if (!tenant && 'directs' in option && option.directs) {
                  const schoolId = option.id.slice('school:'.length)
                  window.localStorage.setItem('nadamas.schoolId', schoolId)
                  setActiveRole('school')
                  return
                }
                setView(option.id)
                setScheduleEditorOpen(false)
              }}
              className={`min-h-11 shrink-0 rounded-full border px-5 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${activeView === option.id ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean) hover:border-(--c-aqua-strong) hover:bg-(--c-surface)'}`}
            >
              {option.label}
            </button>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 pb-1">
          {!tenant && <ShareScheduleButton />}
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
            scheduleTarget={scheduleEditorOpen ? tenant?.id || editorTarget : undefined}
            scheduleTargetOptions={scheduleEditorOpen ? targetOptions : undefined}
            onScheduleTargetChange={scheduleEditorOpen && !tenant ? setEditorTarget : undefined}
          />
        )}
      </section>
    </div>
  )
}
