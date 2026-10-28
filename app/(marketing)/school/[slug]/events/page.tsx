import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SchoolPageShell from '@/components/school/home/SchoolPageShell'
import SchoolPastEvents from '@/components/school/home/SchoolPastEvents'
import type { SchoolEvent } from '@/lib/school-events'
import { splitSchoolEvents } from '@/lib/school-events'
import { PRIVATE_SCHOOL_METADATA } from '@/lib/school-home'
import { resolveSchoolPalette } from '@/lib/school-theme'
import { listSchoolEvents } from '@/lib/server/school-events'
import { getSchoolBySlug } from '@/lib/server/schools'

interface SchoolEventsPageProps {
  params: Promise<{ slug: string }>
}

const DEFAULT_TIMEZONE = 'America/Mexico_City'

export async function generateMetadata({ params }: SchoolEventsPageProps): Promise<Metadata> {
  const { slug } = await params
  const school = await getSchoolBySlug(slug)
  if (!school) return { title: 'Escuela no disponible' }
  if (!school.isPublic) return PRIVATE_SCHOOL_METADATA
  return {
    title: `Eventos pasados · ${school.name}`,
    alternates: { canonical: `https://nadamas.app/school/${school.slug}/events` },
    robots: { index: false, follow: true },
  }
}

/** Past PUBLIC events for visitor HTML. Never includes private events; [] on failure. */
async function pastPublicEvents(schoolId: string, timezone: string): Promise<SchoolEvent[]> {
  try {
    const events = await listSchoolEvents(schoolId, { includePrivate: false })
    return splitSchoolEvents(events, timezone).past
  } catch {
    return []
  }
}

export default async function SchoolEventsPage({ params }: SchoolEventsPageProps) {
  const { slug } = await params
  const school = await getSchoolBySlug(slug)
  if (!school) notFound()
  if (!school.isPublic)
    return (
      <SchoolPageShell palette={resolveSchoolPalette({})}>
        <SchoolPastEvents schoolId={school.id} slug={school.slug} isPublic={false} />
      </SchoolPageShell>
    )
  const timezone = school.timezone || DEFAULT_TIMEZONE
  return (
    <SchoolPageShell palette={resolveSchoolPalette(school)}>
      <SchoolPastEvents
        schoolId={school.id}
        slug={school.slug}
        isPublic
        timezone={timezone}
        initialEvents={await pastPublicEvents(school.id, timezone)}
      />
    </SchoolPageShell>
  )
}
