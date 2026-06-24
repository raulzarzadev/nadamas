import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicCoachDetail } from '@/lib/server/public-coach'

interface CoachPublicPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CoachPublicPageProps): Promise<Metadata> {
  const { id } = await params
  const detail = await getPublicCoachDetail(id)
  if (!detail) {
    return {
      title: 'Coach no disponible · nadamas.app',
    }
  }

  return {
    title: `${detail.name} · Coach de natación · nadamas.app`,
    description:
      detail.coach.bio ||
      'Perfil público de coach de natación en nadamas.app con estilo, clases y horarios.',
  }
}

export default async function CoachPublicPage({ params }: CoachPublicPageProps) {
  const { id } = await params
  const detail = await getPublicCoachDetail(id)
  if (!detail) notFound()

  return (
    <section className="mx-auto max-w-[1040px] px-5 py-12 sm:px-8 lg:py-16">
      <Link
        href="/coaches"
        className="inline-flex items-center rounded-full border border-[var(--c-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--c-ocean)] transition hover:border-[var(--c-aqua)]"
      >
        Volver a coaches
      </Link>

      <div className="mt-6 rounded-[32px] border border-[var(--c-border)] bg-[var(--c-bg)] p-5 shadow-[var(--shadow-sm)] sm:p-7">
        <CoachPublicProfile
          coach={detail.coach}
          name={detail.name}
          bookedSlots={detail.bookedSlots}
          openSlots={detail.openSlots}
          blockedSlots={detail.blockedSlots}
        />
      </div>
    </section>
  )
}
