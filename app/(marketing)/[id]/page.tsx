import AthletePublicProfile from '@comps/athlete/AthletePublicProfile'
import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import JsonLd from '@comps/JsonLd'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { coachDisplayPhoto } from '@/lib/coach-photo'
import { getPublicAthleteDetail } from '@/lib/server/public-athlete'
import { getPublicCoachDetail } from '@/lib/server/public-coach'
import { resolveSlug } from '@/lib/server/slugs'

interface PublicProfilePageProps {
  params: Promise<{ id: string }>
}

const METADATA_BASE = new URL('https://nadamas.app')

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { id } = await params
  const target = await resolveSlug(id)
  if (!target) return { title: 'Perfil no disponible' }

  let title: string
  let description: string

  if (target.kind === 'coach') {
    const detail = await getPublicCoachDetail(target.uid)
    if (!detail) return { title: 'Perfil no disponible' }
    title = `${detail.name} · Coach de natación`
    description =
      detail.coach.bio || 'Perfil de coach de natación: estilo, clases y horarios disponibles.'
  } else {
    const detail = await getPublicAthleteDetail(target.uid)
    if (!detail) return { title: 'Perfil no disponible' }
    title = detail.name
    description = detail.bio || 'Perfil de nadador en nadamas.'
  }

  // og:image / twitter:image come from the colocated opengraph-image.tsx
  // (1200×630 card with the profile photo) — do not set images here.
  return {
    metadataBase: METADATA_BASE,
    title,
    description,
    alternates: { canonical: `/${id}` },
    openGraph: {
      title,
      description,
      type: 'profile',
      siteName: 'nadamas.app',
      locale: 'es_MX',
      url: `/${id}`,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { id } = await params
  const target = await resolveSlug(id)
  if (!target) notFound()

  if (target.kind === 'athlete') {
    const athlete = await getPublicAthleteDetail(target.uid)
    if (!athlete) notFound()
    return (
      <section className="mx-auto max-w-[640px] px-5 py-6 sm:px-8 lg:py-8">
        <div className="rounded-[32px] border border-[var(--c-border)] bg-[var(--c-bg)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <AthletePublicProfile athlete={athlete} />
        </div>
      </section>
    )
  }

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
      <div className="rounded-[32px] border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <CoachPublicProfile
          coach={detail.coach}
          name={detail.name}
          bookedSlots={detail.bookedSlots}
          blockedSlots={detail.blockedSlots}
        />
      </div>
    </section>
  )
}
