import Link from 'next/link'
import { FiExternalLink } from 'react-icons/fi'
import type { SchoolEvent } from '@/lib/school-events'
import { formatSchoolDay } from '@/lib/school-home'

export const SCHOOL_HOME_SECTION_CLASS =
  'mt-3 rounded-none border-0 bg-white p-3 sm:mt-8 sm:rounded-3xl sm:border sm:border-(--c-border) sm:p-8'

const VARIANTS = {
  upcoming: { Heading: 'h2', title: 'Próximos eventos', link: 'Ver eventos pasados' },
  past: { Heading: 'h1', title: 'Eventos pasados', link: 'Volver a la escuela' },
} as const

/**
 * Presentational list of school events. `upcoming` (home section) renders nothing when
 * `events` is empty; `past` (its own page) uses an h1 and shows an empty-state message.
 */
export default function SchoolEventsList({
  events,
  slug,
  timezone,
  showPrivateTag,
  variant = 'upcoming',
}: {
  events: SchoolEvent[]
  slug: string
  timezone: string
  showPrivateTag: boolean
  variant?: keyof typeof VARIANTS
}) {
  if (!events.length && variant === 'upcoming') return null
  const { Heading, title, link } = VARIANTS[variant]
  const schoolPath = `/school/${encodeURIComponent(slug)}`
  return (
    <section className={SCHOOL_HOME_SECTION_CLASS} aria-labelledby="school-events-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading id="school-events-title" className="text-xl font-extrabold text-(--c-ocean)">
          {title}
        </Heading>
        <Link
          href={variant === 'past' ? schoolPath : `${schoolPath}/events`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-(--school-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {link}
        </Link>
      </div>
      {!events.length && (
        <p className="mt-4 text-sm text-(--c-ocean-mid)">Aún no hay eventos pasados.</p>
      )}
      {events.length > 0 && (
        <ul className="mt-4 grid gap-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="overflow-hidden rounded-2xl border border-(--c-border) bg-(--school-surface)"
            >
              {event.photoUrl && (
                // biome-ignore lint/performance/noImgElement: remote storage event photo
                <img
                  src={event.photoUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-[16/7] w-full object-cover"
                />
              )}
              <div className="grid gap-1 p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="break-words font-bold text-(--c-ocean)">{event.title}</span>
                  {showPrivateTag && event.visibility === 'private' && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                      Privado
                    </span>
                  )}
                </p>
                <p className="text-sm text-(--c-ocean-mid)">
                  {formatSchoolDay(event.date, event.time, timezone)}
                </p>
                {event.description && (
                  <p className="whitespace-pre-line break-words text-sm text-(--c-ocean)">
                    {event.description}
                  </p>
                )}
                {event.links.length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {event.links.map((link) => (
                      <li key={`${link.label}-${link.url}`}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-3 text-sm font-semibold text-(--school-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          {link.label} <FiExternalLink aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
