import TrainingPlanPreview from '@/components/training/TrainingPlanPreview'

export default async function TrainingPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const { invite } = await searchParams
  return (
    <TrainingPlanPreview planId={id} invite={typeof invite === 'string' ? invite : undefined} />
  )
}
