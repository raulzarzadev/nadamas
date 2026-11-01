'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { FiCheck, FiChevronRight } from 'react-icons/fi'
import ClassTrainingEditor from '@/components/coach/ClassTrainingEditor'
import CoachDirectoryList from '@/components/coach/CoachDirectoryList'
import { SearchField } from '@/components/Inputs/FormFields'
import SchoolWorkspaceTabs from '@/components/school/SchoolWorkspaceTabs'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import TrainingPlanCard from '@/components/training/TrainingPlanCard'
import TrainingPlanPreview from '@/components/training/TrainingPlanPreview'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { useUser } from '@/context/UserContext'
import { CoachCRUD } from '@/firebase/coaches/main'
import { TrainingPlanCRUD } from '@/firebase/training-plans/main'
import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import { getAuthed } from '@/lib/client/authed-api'
import type { TrainingSelection } from '@/lib/client/training-selection'
import { ensureAthleteBookings, useAppDispatch, useAppSelector } from '@/lib/store/athlete-bookings'
import { localCalendarDate } from '@/lib/today-training'
import { buildTrainingPlanSummary } from '@/lib/training-plan-summary'
import { reportInternalError } from '@/lib/user-facing-error'
import AthleteScheduleBrowser from './AthleteScheduleBrowser'
import RegisteredBadge from './RegisteredBadge'

type PublicSchool = { id: string; name: string; slug: string }
type PublicTrainingSession = {
  id: string
  authorId: string
  authorName: string
  title: string
  description: string
  training: import('@/lib/class-training').ClassTrainingBlock[]
  updatedAt: number
}
type Kind = 'coaches' | 'schools' | 'plans'

const schoolRowClassName =
  'flex min-h-12 w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-(--c-border) bg-white px-3 py-2 text-left text-sm font-bold text-(--c-ocean) transition-colors hover:border-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)'

const KIND_LABEL: Record<Kind, string> = {
  schools: 'Escuelas',
  coaches: 'Profes',
  plans: 'Entrenos',
}

export default function AthleteSearch({
  schoolId,
  initialTab,
  syncUrl = true,
  onSelectCoach,
  onSelectSchool,
  actionLabel,
  trainingRole,
  onSelectTraining,
  selectedTraining,
  active = true,
}: {
  schoolId?: string
  active?: boolean
  trainingRole?: 'athlete' | 'coach'
  onSelectTraining?: (selection: TrainingSelection | null) => void
  selectedTraining?: TrainingSelection | null
  // Start with only this kind selected; all are selected when omitted.
  initialTab?: Kind | 'schedules'
  // false when embedded (e.g. the Horarios search sheet) so filter changes don't rewrite the URL.
  syncUrl?: boolean
  // When set, picking a coach/school calls these instead of opening its schedule.
  onSelectCoach?: (coach: { id: string; name: string }) => void
  onSelectSchool?: (school: { id: string; name: string }) => void
  actionLabel?: string
}) {
  // Inside a school's own app (tenant subdomain) search only that school's profes and entrenos.
  const tenant = useTenantSchool()
  const scopeSchoolId = tenant?.id || schoolId
  // "Horarios" is exclusive: it swaps the lists for the available-hours calendar.
  const [showSchedules, setShowSchedules] = useState(initialTab === 'schedules')
  const startTab =
    initialTab === 'schedules' || (tenant && initialTab === 'schools') ? undefined : initialTab
  const [kinds, setKinds] = useState<Record<Kind, boolean>>({
    schools: !tenant && (!startTab || startTab === 'schools'),
    coaches: !startTab || startTab === 'coaches',
    plans: !onSelectCoach && !onSelectSchool && (!startTab || startTab === 'plans'),
  })
  // Embedded pickers (schedule sheet, payments) select a coach/school; plans don't apply there.
  const kindOptions = (
    onSelectCoach || onSelectSchool ? ['schools', 'coaches'] : ['schools', 'coaches', 'plans']
  ).filter((kind) => !tenant || kind !== 'schools') as Kind[]
  const plansEnabled = kindOptions.includes('plans')
  // Not inside pickers (payments / schedule coach pick): they need a coach or school back.
  const schedulesEnabled = !onSelectCoach && !onSelectSchool
  const [onlyMine, setOnlyMine] = useState(false)
  const [myPlans, setMyPlans] = useState<TrainingPlan[]>([])
  const [mySessions, setMySessions] = useState<PublicTrainingSession[]>([])
  const [myLoading, setMyLoading] = useState(false)
  const [myError, setMyError] = useState(false)
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [publicSessions, setPublicSessions] = useState<PublicTrainingSession[]>([])
  const [verifiedAuthors, setVerifiedAuthors] = useState<Set<string>>(new Set())
  // Tenant only: coaches of the school, whose plans are the only ones listed.
  const [tenantCoachIds, setTenantCoachIds] = useState<Set<string>>()
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState(false)
  const [today] = useState(() => localCalendarDate(new Date()))
  const [schools, setSchools] = useState<PublicSchool[]>([])
  const [query, setQuery] = useState('')
  const linkedPlan = useMemo(() => {
    try {
      const url = new URL(query.trim())
      if (!['http:', 'https:'].includes(url.protocol)) return null
      const id = url.pathname.match(/^\/athlete\/training\/plans\/([\w-]{1,128})\/?$/)?.[1]
      return id ? { id, invite: url.searchParams.get('invite') || undefined } : null
    } catch {
      return null
    }
  }, [query])
  const [linkedSession, setLinkedSession] = useState<PublicTrainingSession | null>(null)
  const [linkStatus, setLinkStatus] = useState('')
  useEffect(() => {
    setLinkedSession(null)
    setLinkStatus('')
    let token = ''
    try {
      const url = new URL(query.trim())
      if (!['http:', 'https:'].includes(url.protocol)) return
      token = url.pathname.match(/^\/entreno\/([\w-]{1,128})\/?$/)?.[1] || ''
    } catch {
      return
    }
    if (!token || !plansEnabled) return
    let active = true
    setKinds({ schools: false, coaches: false, plans: true })
    setLinkStatus('Cargando entreno compartido…')
    fetch(`/api/public/training-sessions?session=${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('SESSION_LINK_UNAVAILABLE')
        return response.json() as Promise<{ item: PublicTrainingSession }>
      })
      .then(({ item }) => {
        if (active) {
          setLinkedSession(item)
          setLinkStatus('')
        }
      })
      .catch(() => {
        if (active) setLinkStatus('Este entreno no está disponible o el enlace ya no es válido.')
      })
    return () => {
      active = false
    }
  }, [query, plansEnabled])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [coachMatches, setCoachMatches] = useState<number>()
  // The athlete's own schools (active memberships) and independent coaches (bookings) go first.
  const {
    schools: memberSchools,
    selected: selectedSchool,
    selectedId,
    selectSchool,
    selectPersonal,
  } = useSchoolSelection({
    includePersonal: true,
    athleteMode: true,
  })
  const mySchoolIds = useMemo(
    () => new Set(memberSchools.map((item) => item.school.id)),
    [memberSchools]
  )
  const { user } = useUser() as { user: { uid?: string; id?: string } | null | undefined }
  const uid = user?.uid || user?.id || ''
  const trainingPicker = Boolean(onSelectTraining)
  useEffect(() => {
    if (!active || !trainingPicker || !uid || !trainingRole) return
    let alive = true
    setMyLoading(true)
    setMyError(false)
    setMyPlans([])
    setMySessions([])
    const path =
      trainingRole === 'coach' ? '/api/coach/standalone-sessions' : '/api/athlete/training-sessions'
    Promise.all([TrainingPlanCRUD.list(uid), getAuthed(path).then((response) => response.json())])
      .then(([ownedPlans, payload]) => {
        if (!alive) return
        setMyPlans(
          ownedPlans.map((plan) => ({
            ...plan,
            summary:
              plan.summary ||
              buildTrainingPlanSummary(plan.cycles, {
                name: 'Tú',
                photo: '',
                role: trainingRole,
              }),
          }))
        )
        setMySessions(
          (payload.items || []).map((item: PublicTrainingSession) => ({
            ...item,
            authorId: uid,
            authorName: 'Tú',
          }))
        )
      })
      .catch((cause) => {
        reportInternalError('OWN_TRAININGS_LOAD', cause)
        if (alive) setMyError(true)
      })
      .finally(() => {
        if (alive) setMyLoading(false)
      })
    return () => {
      alive = false
    }
  }, [active, trainingPicker, uid, trainingRole])
  const dispatch = useAppDispatch()
  const bookingState = useAppSelector((state) => state.athleteBookings)
  useEffect(() => {
    if (uid) void dispatch(ensureAthleteBookings(uid)).catch(() => {})
  }, [uid, dispatch])
  const myCoachIds = useMemo(
    () =>
      new Set(
        bookingState.uid === uid
          ? bookingState.bookings
              .filter((booking) => !booking.schoolId && booking.coachId)
              .map((booking) => booking.coachId as string)
          : []
      ),
    [bookingState, uid]
  )
  useEffect(() => {
    let active = true
    fetch('/api/public/schools')
      .then(async (response) => {
        if (!response.ok) throw new Error('schools_unavailable')
        return response.json() as Promise<{ schools?: PublicSchool[] }>
      })
      .then((payload) => {
        if (active) setSchools(payload.schools || [])
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    if (!plansEnabled || !tenant) return
    let active = true
    getAuthed(`/api/schools/${encodeURIComponent(tenant.id)}/coaches`)
      .then((response) => response.json() as Promise<{ coaches?: { id: string }[] }>)
      .then((payload) => {
        if (active) setTenantCoachIds(new Set((payload.coaches || []).map((coach) => coach.id)))
      })
      .catch((cause) => {
        reportInternalError('TRAINING_PLANS_SCHOOL_COACHES', cause)
        if (active) setPlansError(true)
      })
    return () => {
      active = false
    }
  }, [plansEnabled, tenant])
  useEffect(() => {
    if (!plansEnabled) return
    let active = true
    TrainingPlanCRUD.listPublic()
      .then(async (items) => {
        if (!active) return
        setPlans(items)
        // Verification comes from the coach's own profile, never from the plan's client-set summary.
        const authors = [...new Set(items.map((item) => item.userId))]
        const profiles = await Promise.all(
          authors.map((author) => CoachCRUD.getPublic(author).catch(() => null))
        )
        if (!active) return
        setVerifiedAuthors(
          new Set(
            authors.filter((_, index) => profiles[index]?.verification?.status === 'verified')
          )
        )
      })
      .catch((cause) => {
        reportInternalError('TRAINING_PLANS_SEARCH', cause)
        if (active) setPlansError(true)
      })
      .finally(() => {
        if (active) setPlansLoading(false)
      })
    return () => {
      active = false
    }
  }, [plansEnabled])
  useEffect(() => {
    if (!plansEnabled) return
    let active = true
    fetch('/api/public/training-sessions')
      .then(async (response) => {
        if (!response.ok) throw new Error('training_sessions_unavailable')
        return response.json() as Promise<{ items?: PublicTrainingSession[] }>
      })
      .then((payload) => {
        if (active) setPublicSessions(payload.items || [])
      })
      .catch(() => {
        if (active) setSessionsError(true)
      })
      .finally(() => {
        if (active) setSessionsLoading(false)
      })
    return () => {
      active = false
    }
  }, [plansEnabled])
  const toggle = (kind: Kind) => {
    if (showSchedules) {
      setShowSchedules(false)
      setKinds({
        schools: kind === 'schools',
        coaches: kind === 'coaches',
        plans: kind === 'plans',
      })
      return
    }
    const next = { ...kinds, [kind]: !kinds[kind] }
    // Keep at least one kind selected.
    if (!next.schools && !next.coaches && !next.plans) return
    setKinds(next)
    if (syncUrl)
      window.history.replaceState(
        null,
        '',
        next.schools && !next.coaches && !next.plans
          ? '/athlete/search?school'
          : next.plans && !next.coaches && !next.schools
            ? '/athlete/search?plans'
            : '/athlete/search'
      )
  }
  const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const planRank = (plan: TrainingPlan) => {
    const start = plan.summary?.startDate ?? ''
    const end = plan.summary?.endDate ?? ''
    if (end && end < today) return 2
    return start && start > today ? 1 : 0
  }
  const searchablePlans = (
    onlyMine
      ? myPlans
      : onSelectTraining
        ? [...myPlans, ...plans.filter((plan) => plan.userId !== uid)]
        : plans
  ).filter(
    (plan) =>
      uid &&
      plan.summary &&
      (onlyMine
        ? plan.userId === uid
        : (plan.userId === uid ||
            !onSelectTraining ||
            !tenant ||
            tenantCoachIds?.has(plan.userId)) &&
          (!tenant || plan.userId === uid || tenantCoachIds?.has(plan.userId)))
  )
  const visiblePlans = searchablePlans
    .filter((plan) => {
      if (!plan.summary) return false
      const needle = normalize(query.trim())
      return [plan.summary.title, plan.summary.goal, plan.summary.authorName].some((field) =>
        normalize(field).includes(needle)
      )
    })
    .sort(
      (a, b) =>
        planRank(a) - planRank(b) ||
        (planRank(a) === 1
          ? (a.summary?.startDate ?? '').localeCompare(b.summary?.startDate ?? '')
          : 0)
    )
  const visibleSessions = (
    onlyMine
      ? mySessions
      : onSelectTraining
        ? [...mySessions, ...publicSessions.filter((session) => session.authorId !== uid)]
        : publicSessions
  ).filter((session) => {
    if ((!onlyMine && tenant && session.authorId !== uid) || !session.title) return false
    const needle = normalize(query.trim())
    return [session.title, session.description, session.authorName].some((field) =>
      normalize(field).includes(needle)
    )
  })
  const visible = schools
    .filter((school) => normalize(school.name).includes(normalize(query.trim())))
    .sort((a, b) => Number(mySchoolIds.has(b.id)) - Number(mySchoolIds.has(a.id)))
  const both = [kinds.schools, kinds.coaches, kinds.plans].filter(Boolean).length > 1
  // Sheet shows a short list: hide a section with no matches; one message if none match.
  const schoolsShown = kinds.schools && !loading && (error || visible.length > 0)
  const nothingMatches =
    !linkedPlan &&
    !linkedSession &&
    !linkStatus &&
    !loading &&
    !error &&
    (!kinds.schools || visible.length === 0) &&
    (!kinds.coaches || coachMatches === 0) &&
    (!kinds.plans ||
      ((onlyMine
        ? !myLoading && !myError
        : !plansLoading &&
          !plansError &&
          !sessionsLoading &&
          !sessionsError &&
          (!tenant || tenantCoachIds !== undefined)) &&
        visiblePlans.length === 0 &&
        visibleSessions.length === 0))
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      {!showSchedules && (
        <SearchField
          label={
            tenant
              ? 'Buscar profes o entrenos'
              : kinds.plans
                ? 'Buscar escuelas, profes o entrenos'
                : 'Buscar escuelas o profes'
          }
          placeholder={
            both
              ? tenant
                ? 'Profe, entreno o técnica…'
                : 'Escuela, profe, entreno, técnica o ciudad…'
              : kinds.schools
                ? 'Nombre de la escuela…'
                : kinds.plans
                  ? 'Nombre, objetivo o entrenador…'
                  : 'Técnica, triatlón, tu ciudad…'
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery('')}
          className="rounded-full px-6 text-base"
        />
      )}
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Mostrar</legend>
        {kindOptions.map((kind) => (
          <label
            key={kind}
            className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--c-aqua-strong) ${kinds[kind] && !showSchedules ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-text-2) hover:text-(--c-ocean)'}`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={kinds[kind] && !showSchedules}
              onChange={() => toggle(kind)}
            />
            {kinds[kind] && !showSchedules && <FiCheck aria-hidden="true" className="size-4" />}
            {KIND_LABEL[kind]}
          </label>
        ))}
        {schedulesEnabled && (
          <label
            className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--c-aqua-strong) ${showSchedules ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-text-2) hover:text-(--c-ocean)'}`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={showSchedules}
              onChange={() => setShowSchedules(true)}
            />
            {showSchedules && <FiCheck aria-hidden="true" className="size-4" />}
            Horarios
          </label>
        )}
      </fieldset>
      {onSelectTraining && kinds.plans && !showSchedules && (
        <label className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-(--c-ocean)">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(event) => setOnlyMine(event.target.checked)}
          />{' '}
          Mis entrenos
        </label>
      )}
      {onSelectTraining && myLoading && <p role="status">Cargando tus entrenos…</p>}
      {onSelectTraining && myError && (
        <p role="alert">No pudimos cargar tus entrenos. Inténtalo de nuevo.</p>
      )}
      {showSchedules && memberSchools.length > 0 && (
        <section aria-label="Filtrar horarios por escuela" className="grid gap-2">
          <h3 className="text-sm font-bold text-(--c-ocean)">Escuela</h3>
          <SchoolWorkspaceTabs
            schools={memberSchools.map(({ school }) => ({ id: school.id, name: school.name }))}
            selectedId={selectedId}
            personalLabel="Todos"
            description="Filtra los horarios disponibles."
            onChange={(id) => (id ? selectSchool(id) : selectPersonal())}
          />
        </section>
      )}
      {showSchedules && (
        <AthleteScheduleBrowser requestedSchoolId={selectedSchool?.school.id || null} />
      )}
      {!showSchedules && nothingMatches && (
        <p className="py-4 text-center text-sm text-(--c-text-2)">
          {tenant &&
          kinds.plans &&
          !kinds.coaches &&
          searchablePlans.length === 0 &&
          visibleSessions.length === 0
            ? 'Los entrenadores de esta escuela aún no han publicado entrenos.'
            : 'No encontramos coincidencias.'}
        </p>
      )}
      {!showSchedules && schoolsShown && (
        <section aria-label="Escuelas" className="grid min-w-0 grid-cols-1 gap-3">
          {both && <h3 className="text-xs font-semibold text-(--c-text-2)">Escuelas</h3>}
          {error ? (
            <p role="alert" className="text-sm">
              No pudimos cargar las escuelas. Inténtalo de nuevo más tarde.
            </p>
          ) : (
            <ul className="grid min-w-0 grid-cols-1 gap-2">
              {visible.slice(0, 3).map((school) => (
                <li key={school.id}>
                  {onSelectSchool ? (
                    <button
                      type="button"
                      aria-label={`${actionLabel || 'Ver escuela'}: ${school.name}`}
                      onClick={() => onSelectSchool({ id: school.id, name: school.name })}
                      className={schoolRowClassName}
                    >
                      <span className="min-w-0 flex-1 truncate">{school.name}</span>
                      {mySchoolIds.has(school.id) && <RegisteredBadge />}
                      <FiChevronRight aria-hidden="true" className="shrink-0 text-(--c-text-2)" />
                    </button>
                  ) : (
                    <Link
                      href={`/athlete/search/school/${encodeURIComponent(school.id)}`}
                      aria-label={`Ver escuela: ${school.name}`}
                      className={schoolRowClassName}
                    >
                      <span className="min-w-0 flex-1 truncate">{school.name}</span>
                      {mySchoolIds.has(school.id) && <RegisteredBadge />}
                      <FiChevronRight aria-hidden="true" className="shrink-0 text-(--c-text-2)" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {!showSchedules && kinds.coaches && (
        <section aria-label="Profes" className="grid min-w-0 grid-cols-1 empty:hidden">
          <CoachDirectoryList
            schoolId={scopeSchoolId}
            coachHrefBase="/athlete/search/coach"
            onSelectCoach={onSelectCoach}
            actionLabel={actionLabel}
            showSearch={false}
            query={query}
            compact
            limit={5}
            onMatchCount={setCoachMatches}
            mineIds={myCoachIds}
            heading={both && <h3 className="text-xs font-semibold text-(--c-text-2)">Profes</h3>}
          />
        </section>
      )}
      {!showSchedules && plansEnabled && linkedPlan && (
        <TrainingPlanPreview
          key={linkedPlan.id}
          planId={linkedPlan.id}
          invite={linkedPlan.invite}
        />
      )}
      {!showSchedules &&
        kinds.plans &&
        plansEnabled &&
        ((!onlyMine && (plansError || sessionsError)) ||
          visiblePlans.length > 0 ||
          visibleSessions.length > 0 ||
          linkedSession ||
          linkStatus) && (
          <section aria-label="Entrenos" className="grid min-w-0 grid-cols-1 gap-3">
            {both && <h3 className="text-xs font-semibold text-(--c-text-2)">Entrenos</h3>}
            {linkStatus && (
              <p role="status" className="text-sm text-(--c-text-2)">
                {linkStatus}
              </p>
            )}
            {!onlyMine && (plansError || sessionsError) && !onSelectTraining ? (
              <p role="alert" className="text-sm">
                No pudimos cargar los entrenos. Inténtalo de nuevo más tarde.
              </p>
            ) : (
              <ul className="grid min-w-0 grid-cols-1 gap-2">
                {visiblePlans.slice(0, both ? 5 : 20).map((plan) => (
                  <li key={plan.id}>
                    {onSelectTraining ? (
                      <div className="flex items-start justify-between gap-2 rounded-xl border border-(--c-border) bg-white p-3">
                        <div className="min-w-0 text-sm font-bold text-(--c-ocean)">
                          <span className="block wrap-anywhere">{plan.summary?.title}</span>
                          <span className="block text-xs font-normal text-(--c-text-2)">
                            MACRO-ciclo ·{' '}
                            {plan.userId === uid ? 'Tú' : plan.summary?.authorName || 'Entrenador'}
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-pressed={
                            selectedTraining?.type === 'plan' && selectedTraining.id === plan.id
                          }
                          aria-label={`${selectedTraining?.type === 'plan' && selectedTraining.id === plan.id ? 'Deseleccionar' : 'Seleccionar'} ${plan.summary?.title || 'macrociclo'}`}
                          onClick={() =>
                            onSelectTraining(
                              selectedTraining?.type === 'plan' && selectedTraining.id === plan.id
                                ? null
                                : { type: 'plan', id: plan.id }
                            )
                          }
                          className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-full border border-(--c-border) px-2 text-[10px] font-bold text-(--c-ocean) hover:bg-(--c-surface) aria-pressed:border-(--c-ocean) aria-pressed:bg-(--c-ocean) aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                        >
                          {selectedTraining?.type === 'plan' && selectedTraining.id === plan.id ? (
                            <>
                              <FiCheck aria-hidden="true" className="size-3.5" /> Seleccionado
                            </>
                          ) : (
                            'Seleccionar'
                          )}
                        </button>
                      </div>
                    ) : (
                      <TrainingPlanCard
                        plan={plan}
                        today={today}
                        verified={verifiedAuthors.has(plan.userId)}
                      />
                    )}
                  </li>
                ))}
                {(linkedSession ? [linkedSession] : visibleSessions.slice(0, both ? 5 : 20)).map(
                  (session) => (
                    <li key={`session-${session.id}`}>
                      {onSelectTraining ? (
                        <div className="flex items-start justify-between gap-2 rounded-xl border border-(--c-border) bg-white p-3">
                          <div className="min-w-0 text-sm font-bold text-(--c-ocean)">
                            <span className="block wrap-anywhere">{session.title}</span>
                            <span className="block text-xs font-normal text-(--c-text-2)">
                              Sesión suelta · {session.authorName}
                            </span>
                          </div>
                          <button
                            type="button"
                            aria-pressed={
                              (selectedTraining?.type === 'session' ||
                                selectedTraining?.type === 'public-session') &&
                              selectedTraining.id === session.id
                            }
                            aria-label={`${(selectedTraining?.type === 'session' || selectedTraining?.type === 'public-session') && selectedTraining.id === session.id ? 'Deseleccionar' : 'Seleccionar'} ${session.title}`}
                            onClick={() =>
                              onSelectTraining(
                                (selectedTraining?.type === 'session' ||
                                  selectedTraining?.type === 'public-session') &&
                                  selectedTraining.id === session.id
                                  ? null
                                  : {
                                      type: session.authorId === uid ? 'session' : 'public-session',
                                      id: session.id,
                                    }
                              )
                            }
                            className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-full border border-(--c-border) px-2 text-[10px] font-bold text-(--c-ocean) hover:bg-(--c-surface) aria-pressed:border-(--c-ocean) aria-pressed:bg-(--c-ocean) aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
                          >
                            {(selectedTraining?.type === 'session' ||
                              selectedTraining?.type === 'public-session') &&
                            selectedTraining.id === session.id ? (
                              <>
                                <FiCheck aria-hidden="true" className="size-3.5" /> Seleccionado
                              </>
                            ) : (
                              'Seleccionar'
                            )}
                          </button>
                        </div>
                      ) : (
                        <details
                          open={linkedSession?.id === session.id || undefined}
                          className="grid min-w-0 gap-2 rounded-xl border border-(--c-border) bg-white px-3 py-3"
                        >
                          <summary className="cursor-pointer list-none text-sm font-bold text-(--c-ocean)">
                            <span className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="wrap-anywhere">{session.title}</span>
                              <span className="text-xs font-normal text-(--c-text-2)">
                                Sesión suelta · {session.authorName}
                              </span>
                            </span>
                          </summary>
                          {session.description && (
                            <p className="whitespace-pre-wrap text-xs text-(--c-text-2)">
                              {session.description}
                            </p>
                          )}
                          <ClassTrainingEditor
                            blocks={session.training}
                            onChange={() => {}}
                            readOnly
                            allowTransfer={false}
                          />
                        </details>
                      )}
                    </li>
                  )
                )}
              </ul>
            )}
          </section>
        )}
    </div>
  )
}
