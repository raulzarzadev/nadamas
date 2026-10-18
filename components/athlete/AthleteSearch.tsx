'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { FiCheck, FiChevronRight } from 'react-icons/fi'
import CoachDirectoryList from '@/components/coach/CoachDirectoryList'
import { SearchField } from '@/components/Inputs/FormFields'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useUser } from '@/context/UserContext'
import { ensureAthleteBookings, useAppDispatch, useAppSelector } from '@/lib/store/athlete-bookings'
import RegisteredBadge from './RegisteredBadge'

type PublicSchool = { id: string; name: string; slug: string }
type Kind = 'coaches' | 'schools'

const schoolRowClassName =
  'flex min-h-12 w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-(--c-border) bg-white px-3 py-2 text-left text-sm font-bold text-(--c-ocean) transition-colors hover:border-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)'

const KIND_LABEL: Record<Kind, string> = { schools: 'Escuelas', coaches: 'Profes' }

export default function AthleteSearch({
  schoolId,
  initialTab,
  syncUrl = true,
  onSelectCoach,
  onSelectSchool,
  actionLabel,
}: {
  schoolId?: string
  // Start with only this kind selected; both are selected when omitted.
  initialTab?: Kind
  // false when embedded (e.g. the Horarios search sheet) so filter changes don't rewrite the URL.
  syncUrl?: boolean
  // When set, picking a coach/school calls these instead of opening its schedule.
  onSelectCoach?: (coach: { id: string; name: string }) => void
  onSelectSchool?: (school: { id: string; name: string }) => void
  actionLabel?: string
}) {
  const [kinds, setKinds] = useState<Record<Kind, boolean>>({
    schools: initialTab !== 'coaches',
    coaches: initialTab !== 'schools',
  })
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
  const toggle = (kind: Kind) => {
    const next = { ...kinds, [kind]: !kinds[kind] }
    // Keep at least one kind selected.
    if (!next.schools && !next.coaches) return
    setKinds(next)
    if (syncUrl)
      window.history.replaceState(
        null,
        '',
        next.schools && !next.coaches ? '/athlete/search?school' : '/athlete/search'
      )
  }
  const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const visible = schools
    .filter((school) => normalize(school.name).includes(normalize(query.trim())))
    .sort((a, b) => Number(mySchoolIds.has(b.id)) - Number(mySchoolIds.has(a.id)))
  const both = kinds.schools && kinds.coaches
  // Sheet shows a short list: hide a section with no matches; one message if none match.
  const schoolsShown = kinds.schools && !loading && (error || visible.length > 0)
  const nothingMatches =
    !loading &&
    !error &&
    (!kinds.schools || visible.length === 0) &&
    (!kinds.coaches || coachMatches === 0)
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <SearchField
        label="Buscar escuelas o profes"
        placeholder={
          both
            ? 'Escuela, profe, técnica o ciudad…'
            : kinds.schools
              ? 'Nombre de la escuela…'
              : 'Técnica, triatlón, tu ciudad…'
        }
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery('')}
        className="rounded-full px-6 text-base"
      />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Mostrar</legend>
        {(['schools', 'coaches'] as const).map((kind) => (
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
        <p className="py-4 text-center text-sm text-(--c-text-2)">No encontramos coincidencias.</p>
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
            schoolId={schoolId}
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
    </div>
  )
}
