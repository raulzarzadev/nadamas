'use client'

import VerifiedBadge from '@comps/coach/VerifiedBadge'
import { SearchField } from '@comps/Inputs/FormFields'
import Avatar from '@comps/ui/avatar'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { FiChevronRight } from 'react-icons/fi'
import COACH_SKILLS from '@/CONSTANTS/COACH_SKILLS'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { cacheCoachProfile } from '@/lib/client/coach-profile-cache'
import {
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
}: {
  coachHrefBase?: string
  /** Cap the number of coaches shown (teaser mode). */
  limit?: number
  showSearch?: boolean
  /** When set, renders a "Ver todos los coaches" button below the list. */
  viewAllHref?: string
}) {
  const [coaches, setCoaches] = useState<DirectoryCoach[] | undefined>(undefined)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/public/coaches')
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
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return coaches || []
    return (coaches || []).filter((coach) =>
      [coach.name, skillTag(coach), locationLabel(coach)]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    )
  }, [coaches, query])

  const visible = limit ? filtered.slice(0, limit) : filtered

  return (
    <div className="flex flex-col gap-4">
      {showSearch && (
        <SearchField
          label="Buscar coach"
          hideLabel
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Técnica, triatlón, tu ciudad…"
          className="rounded-full px-6 text-base"
        />
      )}

      {coaches === undefined ? (
        <p className="py-8 text-center text-sm text-[var(--c-text-2)]">Cargando coaches…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-surface)] p-8 text-center text-sm text-[var(--c-text-2)]">
          No encontramos coaches con esa búsqueda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((coach) => {
            const tag = skillTag(coach)
            const availability = offeringsAvailabilitySummary(resolveOfferings(coach))
            const coachHref = coach.slug ? `/${coach.slug}` : `${coachHrefBase}/${coach.id}`
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
                <Link
                  href={coachHref}
                  onClick={() => cacheCoachProfile(coach)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--c-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)]"
                >
                  Ver horarios <FiChevronRight aria-hidden="true" size={14} />
                </Link>
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
          Ver todos los coaches <FiChevronRight aria-hidden="true" size={15} />
        </Link>
      )}
    </div>
  )
}
