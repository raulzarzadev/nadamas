'use client'

import { useMemo, useState } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { schoolMembershipHasRole } from '@/lib/school'
import CoachAgenda from './CoachAgenda'
import CoachScopeBar from './CoachScopeBar'
import ShareScheduleButton from './ShareScheduleButton'

const ALL_VIEW = 'all'
const PERSONAL_VIEW = 'personal'

export default function CoachAgendaWorkspace() {
  const tenant = useTenantSchool()
  const { schools, status, selectedId, isPersonal, selectSchool, selectPersonal } =
    useSchoolSelection({ includePersonal: true })
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
  const [view, setView] = useState<string | null>(null)
  const activeView = tenant
    ? `school:${tenant.id}`
    : view || (!isPersonal && selectedId ? `school:${selectedId}` : PERSONAL_VIEW)
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

  if (status === 'loading') return <ProfileLoadingSkeleton />
  if (status === 'error')
    return <p role="alert">No pudimos cargar tus datos. Inténtalo de nuevo.</p>

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
      {!tenant && (
        <div className="flex min-w-0 items-center gap-2">
          {coachSchools.length > 0 && (
            <CoachScopeBar
              options={[
                { id: ALL_VIEW, label: 'Todos mis horarios' },
                { id: PERSONAL_VIEW, label: 'Mis clases particulares' },
                ...coachSchools.map(({ school }) => ({
                  id: `school:${school.id}`,
                  label: school.name,
                })),
              ]}
              value={activeView}
              defaultValue={PERSONAL_VIEW}
              onChange={(id) => {
                setView(id)
                if (id === PERSONAL_VIEW) selectPersonal()
                else if (id.startsWith('school:')) selectSchool(id.slice('school:'.length))
                setScheduleEditorOpen(false)
              }}
            />
          )}
          <div className="ml-auto flex shrink-0 items-center">
            <ShareScheduleButton />
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h1 className="sr-only">{effectiveLabel}</h1>
        {effectiveAggregate ? (
          <CoachAgenda key="all" agendaSources={agendaSources} onScheduleEditorOpen={openEditor} />
        ) : (
          <CoachAgenda
            key={scheduleEditorOpen ? 'editor' : effectiveSchoolId || 'personal'}
            schoolId={effectiveSchoolId}
            scheduleEditorOpen={scheduleEditorOpen}
            onScheduleEditorClose={closeEditor}
            onScheduleEditorOpen={openEditor}
            scheduleTarget={scheduleEditorOpen ? tenant?.id || editorTarget : undefined}
            scheduleTargetOptions={scheduleEditorOpen ? targetOptions : undefined}
            onScheduleTargetChange={scheduleEditorOpen && !tenant ? setEditorTarget : undefined}
          />
        )}
      </section>
    </div>
  )
}
