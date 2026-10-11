import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SchoolPublicHome from '@/components/school/SchoolPublicHome'
import { getSchoolBySlug } from '@/lib/server/schools'
import { getTenantSchool } from '@/lib/server/tenant-school'

interface SchoolPublicPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SchoolPublicPageProps): Promise<Metadata> {
  const { slug } = await params
  const school = await getSchoolBySlug(slug)
  if (!school) return { title: 'Escuela no disponible' }
  return {
    title: (await getTenantSchool()) ? { absolute: school.name } : school.name,
    description: school.description || `Conoce ${school.name} en Nadamas.`,
    openGraph: {
      title: school.name,
      description: school.description || `Conoce ${school.name} en Nadamas.`,
      images: school.logoUrl ? [{ url: school.logoUrl, alt: school.name }] : undefined,
    },
  }
}

export default async function SchoolPublicPage({ params }: SchoolPublicPageProps) {
  const { slug } = await params
  const school = await getSchoolBySlug(slug)
  if (!school?.isPublic) notFound()

  return <SchoolPublicHome school={school} />
}
