import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SchoolPageShell from '@/components/school/home/SchoolPageShell'
import SchoolPrivateGate from '@/components/school/home/SchoolPrivateGate'
import SchoolPublicHome from '@/components/school/SchoolPublicHome'
import { PRIVATE_SCHOOL_METADATA } from '@/lib/school-home'
import { resolveSchoolPalette } from '@/lib/school-theme'
import { upcomingPublicSchoolEvents } from '@/lib/server/school-events'
import { getSchoolBySlug, isIndexableSchool } from '@/lib/server/schools'
import { getTenantSchool } from '@/lib/server/tenant-school'

interface SchoolPublicPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SchoolPublicPageProps): Promise<Metadata> {
  const { slug } = await params
  const school = await getSchoolBySlug(slug)
  if (!school) return { title: 'Escuela no disponible' }
  // Non-public schools: nothing identifying in metadata; members load content client-side.
  if (!school.isPublic) return PRIVATE_SCHOOL_METADATA
  const description = school.description || `Conoce ${school.name} en Nadamas.`
  const url = `https://nadamas.app/school/${school.slug}`
  return {
    title: (await getTenantSchool()) ? { absolute: school.name } : school.name,
    description,
    alternates: { canonical: url },
    robots: isIndexableSchool(school) ? undefined : { index: false, follow: true },
    openGraph: {
      title: school.name,
      description,
      url,
      siteName: 'nadamas.app',
      locale: 'es_MX',
      type: 'website',
      images:
        (school.coverUrl ?? school.logoUrl)
          ? [{ url: (school.coverUrl ?? school.logoUrl) as string, alt: school.name }]
          : [{ url: '/og-nadamas.png', width: 1200, height: 630, alt: 'Logo de nadamas.app' }],
    },
  }
}

export default async function SchoolPublicPage({ params }: SchoolPublicPageProps) {
  const { slug } = await params
  const school = await getSchoolBySlug(slug)
  if (!school) notFound()
  if (!school.isPublic)
    return (
      <SchoolPageShell palette={resolveSchoolPalette({})}>
        <SchoolPrivateGate schoolId={school.id} slug={school.slug} />
      </SchoolPageShell>
    )

  // Visitors only ever get public events in server HTML.
  const publicEvents = await upcomingPublicSchoolEvents(school)
  return <SchoolPublicHome school={school} publicEvents={publicEvents} />
}
