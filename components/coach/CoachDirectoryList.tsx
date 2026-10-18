'use client'

import VerifiedBadge from '@comps/coach/VerifiedBadge'
import { SearchField } from '@comps/Inputs/FormFields'
import Avatar from '@comps/ui/avatar'
import Link from 'next/link'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { FiChevronRight } from 'react-icons/fi'
import COACH_SKILLS from '@/CONSTANTS/COACH_SKILLS'
import RegisteredBadge from '@/components/athlete/RegisteredBadge'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { getAuthed } from '@/lib/client/authed-api'
import { cacheCoachProfile } from '@/lib/client/coach-profile-cache'
import { useSchoolAgendaUpdates } from '@/lib/client/use-school-agenda-updates'
import {
  hasPublishedOfferingSchedules,
  offeringContextLabel,
  offeringPlaceLabel,
  offeringsAvailabilitySummary,
  resolveOfferings,
} from '@/lib/coach-offerings'
import { coachDisplayPhoto } from '@/lib/coach-photo'

interface DirectoryCoach extends CoachPublic {
  id: string
  name: string
  avatarUrl?: string
  slug?: string
}

const SKILL_LABELS: Record<string, Record<string, string>> = Object.fromEntries(
  COACH_SKILLS.map((dimension) => [
    dimension.key,
    Object.fromEntries(dimension.options.map((option) => [option.value, option.label])),
  ])
)

function skillTag(coach: DirectoryCoach) {
  return (['experiencia', 'personalidad'] as const)
    .map((key) => SKILL_LABELS[key]?.[coach.skills?.[key] ?? ''])
    .filter(Boolean)
    .join(' · ')
}

function locationLabel(coach: DirectoryCoach) {
  for (const offering of resolveOfferings(coach)) {
    const label = offeringContextLabel(offering) || offeringPlaceLabel(offering)
    if (label) return label
  }
  return ''
}

export default function CoachDirectoryList({
  coachHrefBase = '',
  limit,
  showSearch = true,
  viewAllHref,
  schoolId,
  availableOnly = false,
  onSelectCoach,
  actionLabel = 'Ver horarios',
  query: externalQuery,
  compact = false,
  heading,
  onMatchCount,
  mineIds,
}: {
  schoolId?: string | null
  availableOnly?: boolean
  coachHrefBase?: string
  /** Cap the number of coaches shown (teaser mode). */
  limit?: number
  showSearch?: boolean
  /** When set, renders a "Ver todos los coaches" button below the list. */
  viewAllHref?: string
  /** When set, the row action calls this instead of navigating. */
  onSelectCoach?: (coach: { id: string; name: string }) => void
  actionLabel?: string
  /** Search text controlled by the parent (hide the built-in field with showSearch={false}). */
  query?: string
  /** Dense rows for sheets: the whole row is the action, smaller avatar, no pill button. */
  compact?: boolean
  /** Rendered above the rows; with compact, the whole list (and heading) hides when nothing matches. */
  heading?: ReactNode
  /** Reports how many coaches match once loaded (lets the parent show a shared empty state). */
  onMatchCount?: (count: number) => void
  /** Coaches the athlete already trains with: listed first with a "Registrado" badge. */
  mineIds?: Set<string>
}) {
  const [coaches, setCoaches] = useState<DirectoryCoach[] | undefined>(undefined)
  const [query, setQuery] = useState('')
  const terminology = useSchoolTerminology()
  const coachSingular = schoolId && terminology.schoolId ? terminology.coachSingular : 'coach'
  const coachPlural = schoolId && terminology.schoolId ? terminology.coachPlural : 'coaches'

  const [revision, setRevision] = useState(0)
  useSchoolAgendaUpdates(schoolId, () => setRevision((value) => value + 1))

  // The signal invalidates school availability without polling.
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision invalidates the fetched directory.
  useEffect(() => {
    let active = true
    setCoaches(undefined)
    const request = schoolId
      ? getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/coaches`)
      : fetch('/api/public/coaches')
    request
      .then((response) => response.json())
      .then((payload: { coaches?: DirectoryCoach[] }) => {
        if (active) setCoaches(payload.coaches || [])
      })
      .catch(() => {
        if (active) setCoaches([])
      })
    return () => {
      active = false
    }
  }, [schoolId, revision])

  const availableCoaches = useMemo(
    () =>
      availableOnly
        ? (coaches || []).filter((coach) => hasPublishedOfferingSchedules(resolveOfferings(coach)))
        : coaches || [],
    [availableOnly, coaches]
  )

  const activeQuery = externalQuery ?? query
  const filtered = useMemo(() => {
    const normalized = activeQuery.trim().toLowerCase()
    const matches = normalized
      ? availableCoaches.filter((coach) =>
          [coach.name, skillTag(coach), locationLabel(coach)]
            .join(' ')
            .toLowerCase()
            .includes(normalized)
        )
      : availableCoaches
    if (!mineIds?.size) return matches
    return [...matches].sort((a, b) => Number(mineIds.has(b.id)) - Number(mineIds.has(a.id)))
  }, [availableCoaches, activeQuery, mineIds])

  const visible = limit ? filtered.slice(0, limit) : filtered
  const matchCount = coaches === undefined ? undefined : filtered.length
  useEffect(() => {
    if (matchCount !== undefined) onMatchCount?.(matchCount)
  }, [matchCount, onMatchCount])
  if (compact && matchCount === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {showSearch && (
        <SearchField
          label={`Buscar ${coachSingular}`}
          hideLabel
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery('')}
          placeholder="Técnica, triatlón, tu ciudad…"
          className="rounded-full px-6 text-base"
        />
      )}

      {heading}
      {coaches === undefined ? (
        <p className="py-8 text-center text-sm text-[var(--c-text-2)]">Cargando {coachPlural}…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-surface)] p-8 text-center text-sm text-[var(--c-text-2)]">
          {availableOnly
            ? `No hay ${coachPlural} con horarios disponibles${schoolId ? ' en esta escuela' : ''}.`
            : `No encontramos ${coachPlural} con esa búsqueda.`}
        </p>
      ) : (
        <ul className={`flex flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
          {visible.map((coach) => {
            const tag = skillTag(coach)
            const availability = offeringsAvailabilitySummary(resolveOfferings(coach))
            const coachHref =
              coachHrefBase === '/athlete/search/coach'
                ? `${coachHrefBase}/${encodeURIComponent(coach.id)}/schedule${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`
                : schoolId
                  ? `/athlete/coach/${coach.id}?schoolId=${encodeURIComponent(schoolId)}`
                  : coach.slug
                    ? `/${coach.slug}`
                    : `${coachHrefBase}/${coach.id}`
            if (compact) {
              const details = [tag, availability].filter(Boolean).join(' · ')
              const rowClass =
                'flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-(--c-border) bg-white px-3 py-2 text-left transition-colors hover:border-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)'
              const row = (
                <>
                  <Avatar
                    name={coach.name}
                    src={coachDisplayPhoto(coach, coach.avatarUrl)}
                    size={40}
                  />
                  <span className="grid min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1 text-sm font-bold text-(--c-ocean)">
                      <span className="truncate">{coach.name}</span>
                      {coach.verification?.status === 'verified' && (
                        <VerifiedBadge verified className="shrink-0 scale-75" />
                      )}
                    </span>
                    {details && (
                      <span className="truncate text-xs text-(--c-text-2)">{details}</span>
                    )}
                  </span>
                  {mineIds?.has(coach.id) && <RegisteredBadge />}
                  <FiChevronRight aria-hidden="true" className="shrink-0 text-(--c-text-2)" />
                </>
              )
              return (
                <li key={coach.id} className="min-w-0">
                  {onSelectCoach ? (
                    <button
                      type="button"
                      aria-label={`${actionLabel}: ${coach.name}`}
                      onClick={() => onSelectCoach({ id: coach.id, name: coach.name })}
                      className={rowClass}
                    >
                      {row}
                    </button>
                  ) : (
                    <Link
                      href={coachHref}
                      aria-label={`${actionLabel}: ${coach.name}`}
                      onClick={() => {
                        if (!schoolId) cacheCoachProfile(coach)
                      }}
                      className={rowClass}
                    >
                      {row}
                    </Link>
                  )}
                </li>
              )
            }
            return (
              <li
                key={coach.id}
                className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-3.5 shadow-[var(--shadow-sm)]"
              >
                <Avatar
                  name={coach.name}
                  src={coachDisplayPhoto(coach, coach.avatarUrl)}
                  size={52}
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-extrabold leading-tight text-[var(--c-ocean)]">
                    <span className="truncate">{coach.name}</span>
                    {coach.verification?.status === 'verified' && (
                      <VerifiedBadge verified className="shrink-0 scale-90" />
                    )}
                  </p>
                  {tag && <p className="mt-0.5 truncate text-xs text-[var(--c-text-2)]">{tag}</p>}
                  {availability && (
                    <p className="mt-1 text-xs font-semibold text-[var(--c-aqua-strong)]">
                      {availability}
                    </p>
                  )}
                </div>
                {onSelectCoach ? (
                  <button
                    type="button"
                    onClick={() => onSelectCoach({ id: coach.id, name: coach.name })}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-[var(--c-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)]"
                  >
                    {actionLabel} <FiChevronRight aria-hidden="true" size={14} />
                  </button>
                ) : (
                  <Link
                    href={coachHref}
                    onClick={() => {
                      if (!schoolId) cacheCoachProfile(coach)
                    }}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--c-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)]"
                  >
                    {actionLabel} <FiChevronRight aria-hidden="true" size={14} />
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {viewAllHref && (coaches?.length || 0) > 0 && (
        <Link
          href={viewAllHref}
          className="inline-flex items-center justify-center gap-1 self-center rounded-full bg-(--c-ocean) px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
        >
          Ver todos los {coachPlural} <FiChevronRight aria-hidden="true" size={15} />
        </Link>
      )}
    </div>
  )
}
