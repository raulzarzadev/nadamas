import AthletePublicProfile from '@comps/athlete/AthletePublicProfile'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicAthleteDetail } from '@/lib/server/public-athlete'
import { resolveSlug } from '@/lib/server/slugs'

interface PublicAthletePageProps {
  params: Promise<{ id: string }>
}

const METADATA_BASE = new URL('https://nadamas.app')

export async function generateMetadata({ params }: PublicAthletePageProps): Promise<Metadata> {
  const { id } = await params
  const target = await resolveSlug(id, 'athlete')
  if (!target) return { title: 'Perfil no disponible' }

  const detail = await getPublicAthleteDetail(target.uid)
  if (!detail) return { title: 'Perfil no disponible' }

  const title = detail.name
  const description = detail.bio || 'Perfil de nadador en nadamas.'

  return {
    metadataBase: METADATA_BASE,
    title,
    description,
    alternates: { canonical: `/atleta/${id}` },
    openGraph: {
      title,
      description,
      type: 'profile',
      siteName: 'nadamas.app',
      locale: 'es_MX',
      url: `/atleta/${id}`,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PublicAthletePage({ params }: PublicAthletePageProps) {
  const { id } = await params
  const target = await resolveSlug(id, 'athlete')
  if (!target) notFound()

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
