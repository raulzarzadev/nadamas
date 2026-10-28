'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { SchoolContact } from '@/lib/school-contact'
import type { SchoolEvent } from '@/lib/school-events'
import { formatSchoolDay, type SchoolGalleryPhoto, type SchoolHomeSection } from '@/lib/school-home'
import { schoolThemeVars, type ThemePalette } from '@/lib/school-theme'
import type { MemberHomeProfile } from '@/lib/server/school-member-home'
import SchoolEventsList, { SCHOOL_HOME_SECTION_CLASS } from './SchoolEventsList'
import SchoolHero from './SchoolHero'
import SchoolHomeSections from './SchoolHomeSections'
import { type SchoolGateStatus, useSchoolMemberData } from './use-school-member-data'

interface MemberHomeResponse {
  school: {
    id: string
    name: string
    slug: string
    timezone?: string
    description: string
    logoUrl: string | null
    coverUrl: string | null
    palette: ThemePalette
    gallery: SchoolGalleryPhoto[]
    homeSections: SchoolHomeSection[]
    contacts: SchoolContact[]
  }
  greetingName: string
  profiles: MemberHomeProfile[]
  events: SchoolEvent[]
}

const DEFAULT_TIMEZONE = 'America/Mexico_City'

function PersonalSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section className={SCHOOL_HOME_SECTION_CLASS} aria-labelledby={id}>
      <h2 id={id} className="text-xl font-extrabold text-(--c-ocean)">
        {title}
      </h2>
      {children}
    </section>
  )
}

function MemberHome({ home }: { home: MemberHomeResponse }) {
  const { school } = home
  const timezone = school.timezone || DEFAULT_TIMEZONE
  const upcoming = home.profiles.filter((profile) => profile.nextClass)
  const attendance = home.profiles.filter((profile) => profile.week.total > 0)
  const sections = school.homeSections
  return (
    <div style={schoolThemeVars(school.palette) as CSSProperties}>
      <SchoolHero school={school} size="small" greetingName={home.greetingName} />
      {upcoming.length > 0 && (
        <PersonalSection id="school-next-classes-title" title="Próximos entrenos">
          <ul className="mt-4 grid gap-2">
            {upcoming.map(({ studentId, name, nextClass }) =>
              nextClass ? (
                <li key={studentId} className="rounded-2xl bg-(--school-surface) px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="break-words font-bold text-(--c-ocean)">
                      {`${name} · ${formatSchoolDay(nextClass.date, nextClass.startTime, timezone)}`}
                    </span>
                    {nextClass.pending && (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">
                        Pendiente de confirmar
                      </span>
                    )}
                  </p>
                  {(nextClass.title || nextClass.location) && (
                    <p className="break-words text-sm text-(--c-ocean-mid)">
                      {[nextClass.title, nextClass.location].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </li>
              ) : null
            )}
          </ul>
        </PersonalSection>
      )}
      {sections.includes('events') && (
        <SchoolEventsList
          events={home.events}
          slug={school.slug}
          timezone={timezone}
          showPrivateTag
        />
      )}
      {attendance.length > 0 && (
        <PersonalSection id="school-attendance-title" title="Últimas clases">
          <ul className="mt-4 grid gap-2">
            {attendance.map(({ studentId, name, week }) => (
              <li
                key={studentId}
                className="break-words rounded-2xl bg-(--school-surface) px-4 py-3 text-sm font-semibold text-(--c-ocean)"
              >
                {`${name}: ${week.taken} de ${week.total} esta semana`}
              </li>
            ))}
          </ul>
        </PersonalSection>
      )}
      <SchoolHomeSections
        sections={sections.filter((section) => section !== 'events')}
        schoolId={school.id}
        slug={school.slug}
        timezone={timezone}
        events={home.events}
        gallery={school.gallery}
        contacts={school.contacts}
        showPrivateTag
      />
    </div>
  )
}

function isMemberHome(payload: unknown): payload is MemberHomeResponse {
  return Boolean((payload as Partial<MemberHomeResponse> | null)?.school)
}

/**
 * Member dashboard for a school home. Self-contained: it only needs `schoolId` and fetches
 * everything else from `/api/schools/{id}/home`. Renders `fallback` while auth resolves,
 * when signed out, and (silently) on any non-200 or error. Pass a function as `fallback`
 * to render differently per status (`loading` | `signed-out` | `denied`).
 */
export default function SchoolMemberDashboard({
  schoolId,
  fallback,
}: {
  schoolId: string
  fallback: ReactNode | ((status: SchoolGateStatus) => ReactNode)
}) {
  const state = useSchoolMemberData(
    `/api/schools/${encodeURIComponent(schoolId)}/home`,
    isMemberHome
  )
  if (state.status === 'ready') return <MemberHome home={state.data} />
  return typeof fallback === 'function' ? fallback(state.status) : fallback
}
