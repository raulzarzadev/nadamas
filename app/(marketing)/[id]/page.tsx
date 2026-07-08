import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import JsonLd from '@comps/JsonLd'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { coachDisplayPhoto } from '@/lib/coach-photo'
import { getPublicCoachDetail } from '@/lib/server/public-coach'
import { resolveSlug } from '@/lib/server/slugs'

interface PublicProfilePageProps {
  params: Promise<{ id: string }>
}

const METADATA_BASE = new URL('https://nadamas.app')

function coachDescription(bio?: string) {
  return bio?.trim() || 'Perfil de coach de natación: estilo, clases y horarios disponibles.'
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const target = await resolveSlug(id, 'coach')
  if (!target) return { title: 'Perfil no disponible' }

  const detail = await getPublicCoachDetail(target.uid)
  if (!detail) return { title: 'Perfil no disponible' }
  const title = `${detail.name} · Coach de natación`
  const description = coachDescription(detail.coach.bio)
  const url = `/${id}`
  const imageUrl = coachDisplayPhoto(detail.coach, detail.avatarUrl) || '/og-nadamas.png'
  const images = [
    {
      url: imageUrl,
      alt: `${detail.name} · Coach de natación`,
    },
  ]

  return {
    metadataBase: METADATA_BASE,
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'profile',
      siteName: 'nadamas.app',
      locale: 'es_MX',
      url,
      images,
    },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { id } = await params
  const target = await resolveSlug(id, 'coach')
  if (!target) notFound()

  const detail = await getPublicCoachDetail(target.uid)
  if (!detail) notFound()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: detail.name,
    jobTitle: 'Coach de natación',
    ...(detail.coach.bio ? { description: detail.coach.bio } : {}),
    ...(coachDisplayPhoto(detail.coach) ? { image: coachDisplayPhoto(detail.coach) } : {}),
    url: `${METADATA_BASE.origin}/${id}`,
  }
  return (
    <section className="mx-auto max-w-[1040px] px-5 py-6 sm:px-8 lg:py-8">
      <JsonLd data={jsonLd} />
      <CoachPublicProfile
        coach={detail.coach}
        name={detail.name}
        avatarUrl={detail.avatarUrl}
        bookedSlots={detail.bookedSlots}
        blockedSlots={detail.blockedSlots}
      />
    </section>
  )
}
