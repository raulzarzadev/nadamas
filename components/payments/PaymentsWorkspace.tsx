'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import AthleteSearchBar from '@/components/athlete/AthleteSearchBar'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { useTenantSchool } from '@/context/TenantSchoolContext'
import { useUser } from '@/context/UserContext'
import { ensureAthleteBookings, useAppDispatch } from '@/lib/store/athlete-bookings'
import MyPlansList, { type NamedPaymentScope } from './MyPlansList'
import PaymentsPanel from './PaymentsPanel'
import PopularPlansList from './PopularPlansList'

export default function PaymentsWorkspace({ mode }: { mode: 'school' | 'coach' | 'athlete' }) {
  const { selectedId, isPersonal, status, schools, selectSchool, selectPersonal } =
    useSchoolSelection({
      includePersonal: mode !== 'school',
      athleteMode: mode === 'athlete',
    })
  const { user } = useUser() as { user: { uid?: string; id?: string } | undefined | null }
  const dispatch = useAppDispatch()
  const uid = user?.uid || user?.id || ''
  const tenant = useTenantSchool()
  const params = useSearchParams()
  const [coaches, setCoaches] = useState<Array<{ id: string; name: string }>>([])
  const [scopeChoice, setScopeChoice] = useState<string | null>(null)
  const [coachId, setCoachId] = useState(params.get('coachId') || '')
  const [loadingCoaches, setLoadingCoaches] = useState(mode === 'athlete')
  const [error, setError] = useState('')
  // School picked from search that the athlete isn't enrolled in (shown read-only).
  const [guestSchool, setGuestSchool] = useState<{ id: string; name: string } | null>(null)
  // 'mine' = "Mis planes" across every coach/school; 'search' = search + popular plans;
  // 'scope' = one picked coach/school.
  const [view, setView] = useState<'mine' | 'search' | 'scope'>(
    // Payment links (?tab=orders) land on "Mis planes", where payments now live.
    params.get('tab') !== 'orders' && (params.get('coachId') || params.get('schoolId'))
      ? 'scope'
      : 'mine'
  )
  useEffect(() => {
    if (mode !== 'athlete' || !uid) return
    let active = true
    dispatch(ensureAthleteBookings(uid))
      .then((bookings) => {
        if (!active) return
        const map = new Map<string, string>()
        for (const booking of bookings)
          if (!booking.schoolId && booking.coachId)
            map.set(booking.coachId, booking.coachName || 'Entrenador')
        const next = [...map].map(([id, name]) => ({ id, name }))
        if (params.get('coachId') && !next.some((coach) => coach.id === params.get('coachId')))
          next.unshift({ id: params.get('coachId') || '', name: 'Entrenador seleccionado' })
        setCoaches(next)
        setCoachId((current) => current || next[0]?.id || '')
      })
      .catch(() => {
        if (active) setError('No pudimos cargar tus entrenadores. Inténtalo de nuevo.')
      })
      .finally(() => {
        if (active) setLoadingCoaches(false)
      })
    return () => {
      active = false
    }
  }, [mode, params, uid, dispatch])
  if (status === 'loading' || !user || (mode === 'athlete' && isPersonal && loadingCoaches))
    return <ProfileLoadingSkeleton />
  if (status === 'error')
    return <p role="alert">No pudimos cargar tu espacio. Inténtalo de nuevo.</p>
  if (mode === 'coach' && (tenant || !isPersonal || params.get('schoolId')))
    return (
      <p role="status" className="text-sm">
        Los pagos de la escuela solo están disponibles en Modo Coordinador.
      </p>
    )
  const scopeSchool =
    scopeChoice !== null
      ? scopeChoice.startsWith('school:')
        ? scopeChoice.slice(7)
        : null
      : params.get('coachId')
        ? null
        : params.get('schoolId') || (!isPersonal ? selectedId : null)
  const scopeCoach =
    mode === 'coach'
      ? user.uid || user.id
      : scopeChoice?.startsWith('coach:')
        ? scopeChoice.slice(6)
        : coachId
  const scopeEndpoint = scopeSchool
    ? `/api/payments?schoolId=${encodeURIComponent(scopeSchool)}`
    : scopeCoach
      ? `/api/payments?coachId=${encodeURIComponent(scopeCoach)}`
      : ''
  // Current scope's name, shown in the search bar in place of a selector.
  const scopeName =
    (guestSchool?.id === scopeSchool && guestSchool?.name) ||
    (scopeSchool
      ? tenant?.id === scopeSchool
        ? tenant.name
        : schools.find((item) => item.school.id === scopeSchool)?.school.name
      : scopeCoach
        ? coaches.find((coach) => coach.id === scopeCoach)?.name
        : undefined)
  // Every coach/school the athlete works with; inside a school tenant, only that school.
  const myScopes: NamedPaymentScope[] = tenant
    ? [{ kind: 'school', id: tenant.id, name: tenant.name }]
    : [
        ...schools.map(({ school }) => ({
          kind: 'school' as const,
          id: school.id,
          name: school.name,
        })),
        ...coaches.map((coach) => ({ kind: 'coach' as const, ...coach })),
      ]
  const openScope = (scope: NamedPaymentScope) => {
    setView('scope')
    setGuestSchool(null)
    setScopeChoice(`${scope.kind}:${scope.id}`)
    if (scope.kind === 'school') selectSchool(scope.id)
    else {
      setCoaches((current) =>
        current.some((item) => item.id === scope.id)
          ? current
          : [{ id: scope.id, name: scope.name }, ...current]
      )
      setCoachId(scope.id)
      selectPersonal()
    }
  }
  const endpoint =
    scopeEndpoint && mode === 'athlete' ? `${scopeEndpoint}&view=student` : scopeEndpoint
  return (
    <div className="grid gap-4">
      {mode === 'athlete' && (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold text-(--c-ocean)">Planes y pagos</h1>
            <nav aria-label="Vista de planes" className="flex shrink-0 gap-2">
              {(
                [
                  ['mine', 'Mis planes'],
                  ['search', 'Buscar'],
                ] as const
              ).map(([value, label]) => {
                const active = value === 'mine' ? view === 'mine' : view !== 'mine'
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setGuestSchool(null)
                      setView(value)
                    }}
                    className={`min-h-10 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${active ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface)'}`}
                  >
                    {label}
                  </button>
                )
              })}
            </nav>
          </div>
          {view !== 'mine' && (
            <AthleteSearchBar
              schoolId={tenant?.id}
              actionLabel="Ver planes"
              value={view === 'scope' ? scopeName : undefined}
              onClear={() => {
                setGuestSchool(null)
                setView('search')
              }}
              onSelectCoach={(coach) => {
                setView('scope')
                setGuestSchool(null)
                // Inside a school tenant, coaches bill through the school.
                if (tenant) {
                  setScopeChoice(`school:${tenant.id}`)
                  selectSchool(tenant.id)
                  return
                }
                setCoaches((current) =>
                  current.some((item) => item.id === coach.id) ? current : [coach, ...current]
                )
                setCoachId(coach.id)
                setScopeChoice(`coach:${coach.id}`)
                selectPersonal()
              }}
              onSelectSchool={(school) => {
                setView('scope')
                setScopeChoice(`school:${school.id}`)
                // Non-member schools open read-only (plans catalog); keep their name for the bar.
                if (
                  tenant?.id !== school.id &&
                  !schools.some((item) => item.school.id === school.id)
                )
                  return setGuestSchool(school)
                setGuestSchool(null)
                selectSchool(school.id)
              }}
            />
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {mode === 'athlete' && view === 'mine' ? (
        <MyPlansList scopes={myScopes} onOpen={openScope} />
      ) : mode === 'athlete' && view === 'search' ? (
        <PopularPlansList schoolId={tenant?.id} onOpen={openScope} />
      ) : endpoint ? (
        <PaymentsPanel
          hideTitle={mode === 'athlete'}
          plansOnly={mode === 'athlete'}
          onPurchased={mode === 'athlete' ? () => setView('mine') : undefined}
          emptyPlansText={
            mode === 'athlete'
              ? scopeSchool
                ? 'Esta escuela no tiene planes de pago vigentes.'
                : 'Este entrenador no tiene planes de pago vigentes.'
              : undefined
          }
          key={`${endpoint}:${params.get('tab') === 'orders' ? 'orders' : 'account'}`}
          endpoint={endpoint}
          initialTab={params.get('tab') === 'orders' ? 'orders' : 'account'}
        />
      ) : (
        <p className="p-3 text-sm text-(--c-text-2)">
          Busca una escuela o un entrenador para ver sus planes y tus pagos.
        </p>
      )}
    </div>
  )
}
