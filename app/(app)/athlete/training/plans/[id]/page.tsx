import type { Metadata } from 'next'
import TrainingPlanPreview from '@/components/training/TrainingPlanPreview'
import { getPlanShareMeta } from '@/lib/server/training-plan-sharing'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const inviteOf = (value: string | string[] | undefined) =>
  typeof value === 'string' ? value : undefined

// Link preview for chat apps (WhatsApp, etc.): an invitation instead of the generic site card.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params
  const invite = inviteOf((await searchParams).invite)
  let meta: Awaited<ReturnType<typeof getPlanShareMeta>> = null
  try {
    meta = await getPlanShareMeta(id, invite)
  } catch (error) {
    console.error('[TRAINING_PLAN_SHARE_META]', error)
  }
  const title = meta?.authorName
    ? `${meta.authorName} te invita a seguir su entrenamiento`
    : 'Te invitan a seguir un entrenamiento'
  const description = meta?.title
    ? `«${meta.title}» en nadamas. ¡Únete y entrena con el mismo plan!`
    : '¡Únete en nadamas y entrena con el mismo plan!'
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'nadamas.app',
      locale: 'es_MX',
      type: 'website',
      images: [{ url: '/og-nadamas.png' }],
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function TrainingPlanPage({ params, searchParams }: Props) {
  const { id } = await params
  const invite = inviteOf((await searchParams).invite)
  return <TrainingPlanPreview planId={id} invite={invite} />
}
