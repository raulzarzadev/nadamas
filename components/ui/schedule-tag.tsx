import type { ReactNode } from 'react'
import { FiUsers } from 'react-icons/fi'
import CoachBadge from './coach-badge'

/** Shared class identity for options, summaries and other project surfaces. */
export default function ScheduleTag({
  date,
  action,
  time,
  coachName,
  unassigned = false,
  groupType,
  selected = false,
  enrolledCount,
}: {
  date?: string
  action?: ReactNode
  time: string
  coachName?: string
  unassigned?: boolean
  groupType: 'particular' | 'grupal'
  selected?: boolean
  enrolledCount?: number
}) {
  const typeLabel = groupType === 'grupal' ? 'Grupal' : 'Particular'
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-2 text-sm font-bold [&_*]:font-bold ${date ? 'w-full rounded-xl border border-(--c-border) bg-(--c-surface) px-3 py-2' : ''} ${selected ? 'text-white' : 'text-(--c-ocean)'}`}
    >
      {date && <span className="text-xs text-(--c-text-2)">{date}</span>}
      <span className="text-xs tabular-nums text-(--c-text-2)">{time}</span>
      {coachName && <CoachBadge name={coachName} unassigned={unassigned} />}
      {enrolledCount !== undefined && enrolledCount > 0 && (
        <span
          className="text-xs font-semibold tabular-nums"
          role="img"
          aria-label={`${enrolledCount} inscritos`}
        >
          {enrolledCount}
        </span>
      )}
      <span className="inline-flex items-center gap-1 text-xs text-(--c-text-2)">
        {groupType === 'grupal' ? (
          <span role="img" aria-label={typeLabel} title={typeLabel}>
            <FiUsers aria-hidden="true" size={14} />
          </span>
        ) : (
          typeLabel
        )}
      </span>
      {action && <span className="ml-auto inline-flex shrink-0">{action}</span>}
    </span>
  )
}
