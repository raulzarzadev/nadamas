import Link from 'next/link'
import { FiCheckCircle } from 'react-icons/fi'
import Avatar from '@/components/ui/avatar'
import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import {
  planRangeLabel,
  subscriberCountLabel,
  trainingPlanStatus,
  trainingPlanStatusLabel,
  weekdayLabels,
} from '@/lib/training-plan-summary'

export default function TrainingPlanCard({
  plan,
  today,
  verified,
}: {
  plan: TrainingPlan
  today: string
  verified: boolean
}) {
  const summary = plan.summary
  if (!summary) return null
  const status = trainingPlanStatusLabel(
    trainingPlanStatus(summary.startDate, summary.endDate, today)
  )
  return (
    <Link
      href={`/athlete/training/plans/${encodeURIComponent(plan.id)}`}
      className="grid min-w-0 gap-2 rounded-xl border border-(--c-border) bg-white px-3 py-3 text-left transition-colors hover:border-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Avatar name={summary.authorName} src={summary.authorPhoto} size={32} />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-(--c-text-2)">
          {summary.authorName || 'Entrenador'}
        </span>
        {verified && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-(--c-ocean)">
            <FiCheckCircle aria-hidden="true" />
            Coach verificado
          </span>
        )}
      </span>
      <span className="wrap-anywhere text-sm font-bold text-(--c-ocean)">{summary.title}</span>
      <span className="text-xs text-(--c-text-2)">
        {planRangeLabel(summary.startDate, summary.endDate)}
      </span>
      {summary.goal.trim() && (
        <span className="line-clamp-2 wrap-anywhere text-xs text-(--c-text-2)">{summary.goal}</span>
      )}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-(--c-text-2)">
        {summary.sessionWeekdays.length > 0 && (
          <span>{weekdayLabels(summary.sessionWeekdays)}</span>
        )}
        <span>{subscriberCountLabel(plan.subscriberCount ?? 0)}</span>
        <span>{status}</span>
      </span>
    </Link>
  )
}
