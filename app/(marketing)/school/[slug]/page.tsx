import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SchoolPublicHome from '@/components/school/SchoolPublicHome'
import { getSchoolBySlug, isIndexableSchool } from '@/lib/server/schools'
import { getTenantSchool } from '@/lib/server/tenant-school'

interface SchoolPublicPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SchoolPublicPageProps): Promise<Metadata> {
  const { slug } = await params
  const school = await getSchoolBySlug(slug)
  if (!school) return { title: 'Escuela no disponible' }
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
      images: school.logoUrl
        ? [{ url: school.logoUrl, alt: school.name }]
        : [{ url: '/og-nadamas.png', width: 1200, height: 630, alt: 'Logo de nadamas.app' }],
    },
  }
}

export default async function SchoolPublicPage({ params }: SchoolPublicPageProps) {
  const { slug } = await params
  const school = await getSchoolBySlug(slug)
  if (!school?.isPublic) notFound()

  return <SchoolPublicHome school={school} />
}
