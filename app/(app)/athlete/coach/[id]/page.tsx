import CoachPublicProfile from '@comps/coach/CoachPublicProfile'
import { notFound, redirect } from 'next/navigation'
import { getPublicCoachDetail } from '@/lib/server/public-coach'
import { resolveSlug } from '@/lib/server/slugs'

interface AthleteCoachViewProps {
  params: Promise<{ id: string }>
}

export default async function AthleteCoachView({ params }: AthleteCoachViewProps) {
  const { id } = await params
  const target = await resolveSlug(id, 'coach')
  if (!target) notFound()

  const detail = await getPublicCoachDetail(target.uid)
  if (!detail) notFound()

  if (detail.coachSlug && detail.coachSlug !== id) {
    redirect(`/${detail.coachSlug}`)
  }

  return (
    <CoachPublicProfile
      coach={detail.coach}
      name={detail.name}
      avatarUrl={detail.avatarUrl}
      bookedSlots={detail.bookedSlots}
      blockedSlots={detail.blockedSlots}
    />
  )
}
