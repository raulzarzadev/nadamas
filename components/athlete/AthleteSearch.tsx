'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { FiCheck, FiChevronRight } from 'react-icons/fi'
import CoachDirectoryList from '@/components/coach/CoachDirectoryList'
import { SearchField } from '@/components/Inputs/FormFields'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import TrainingPlanCard from '@/components/training/TrainingPlanCard'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { useUser } from '@/context/UserContext'
import { CoachCRUD } from '@/firebase/coaches/main'
import { TrainingPlanCRUD } from '@/firebase/training-plans/main'
import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import { getAuthed } from '@/lib/client/authed-api'
import { ensureAthleteBookings, useAppDispatch, useAppSelector } from '@/lib/store/athlete-bookings'
import { localCalendarDate } from '@/lib/today-training'
import { reportInternalError } from '@/lib/user-facing-error'
import RegisteredBadge from './RegisteredBadge'

type PublicSchool = { id: string; name: string; slug: string }
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
}: {
  schoolId?: string
  // Start with only this kind selected; all are selected when omitted.
  initialTab?: Kind
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
  const startTab = tenant && initialTab === 'schools' ? undefined : initialTab
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
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [verifiedAuthors, setVerifiedAuthors] = useState<Set<string>>(new Set())
  // Tenant only: coaches of the school, whose plans are the only ones listed.
  const [tenantCoachIds, setTenantCoachIds] = useState<Set<string>>()
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState(false)
  const [today] = useState(() => localCalendarDate(new Date()))
  const [schools, setSchools] = useState<PublicSchool[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [coachMatches, setCoachMatches] = useState<number>()
  // The athlete's own schools (active memberships) and independent coaches (bookings) go first.
  const { schools: memberSchools } = useSchoolSelection({
    includePersonal: true,
    athleteMode: true,
  })
  const mySchoolIds = useMemo(
    () => new Set(memberSchools.map((item) => item.school.id)),
    [memberSchools]
  )
  const { user } = useUser() as { user: { uid?: string; id?: string } | null | undefined }
  const uid = user?.uid || user?.id || ''
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
  const toggle = (kind: Kind) => {
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
  const searchablePlans = plans.filter(
    (plan) =>
      uid && plan.summary && plan.userId !== uid && (!tenant || tenantCoachIds?.has(plan.userId))
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
  const visible = schools
    .filter((school) => normalize(school.name).includes(normalize(query.trim())))
    .sort((a, b) => Number(mySchoolIds.has(b.id)) - Number(mySchoolIds.has(a.id)))
  const both = [kinds.schools, kinds.coaches, kinds.plans].filter(Boolean).length > 1
  // Sheet shows a short list: hide a section with no matches; one message if none match.
  const schoolsShown = kinds.schools && !loading && (error || visible.length > 0)
  const nothingMatches =
    !loading &&
    !error &&
    (!kinds.schools || visible.length === 0) &&
    (!kinds.coaches || coachMatches === 0) &&
    (!kinds.plans ||
      (!plansLoading &&
        !plansError &&
        (!tenant || tenantCoachIds !== undefined) &&
        visiblePlans.length === 0))
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
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
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Mostrar</legend>
        {kindOptions.map((kind) => (
          <label
            key={kind}
            className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--c-aqua-strong) ${kinds[kind] ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-text-2) hover:text-(--c-ocean)'}`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={kinds[kind]}
              onChange={() => toggle(kind)}
            />
            {kinds[kind] && <FiCheck aria-hidden="true" className="size-4" />}
            {KIND_LABEL[kind]}
          </label>
        ))}
      </fieldset>
      {nothingMatches && (
        <p className="py-4 text-center text-sm text-(--c-text-2)">
          {tenant && kinds.plans && !kinds.coaches && searchablePlans.length === 0
            ? 'Los entrenadores de esta escuela aún no han publicado entrenos.'
            : 'No encontramos coincidencias.'}
        </p>
      )}
      {schoolsShown && (
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
      {kinds.coaches && (
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
      {kinds.plans && plansEnabled && (plansError || visiblePlans.length > 0) && (
        <section aria-label="Entrenos" className="grid min-w-0 grid-cols-1 gap-3">
          {both && <h3 className="text-xs font-semibold text-(--c-text-2)">Entrenos</h3>}
          {plansError ? (
            <p role="alert" className="text-sm">
              No pudimos cargar los entrenos. Inténtalo de nuevo más tarde.
            </p>
          ) : (
            <ul className="grid min-w-0 grid-cols-1 gap-2">
              {visiblePlans.slice(0, both ? 5 : 20).map((plan) => (
                <li key={plan.id}>
                  <TrainingPlanCard
                    plan={plan}
                    today={today}
                    verified={verifiedAuthors.has(plan.userId)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
