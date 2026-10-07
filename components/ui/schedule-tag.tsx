import { FiUser, FiUsers } from 'react-icons/fi'
import CoachBadge from './coach-badge'

/** Shared class identity for options, summaries and other project surfaces. */
export default function ScheduleTag({
  time,
  coachName,
  unassigned = false,
  groupType,
  selected = false,
  enrolledCount,
}: {
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
      className={`inline-flex flex-wrap items-center gap-2 text-sm ${selected ? 'text-white' : 'text-(--c-ocean)'}`}
    >
      <strong className="tabular-nums">{time}</strong>
      {coachName && <CoachBadge name={coachName} unassigned={unassigned} />}
      {(enrolledCount || 0) > 0 && (
        <span
          className="text-[11px] font-light"
          role="img"
          aria-label={`${enrolledCount} inscritos`}
        >
          {enrolledCount}
        </span>
      )}
      <span
        role="img"
        aria-label={typeLabel}
        title={typeLabel}
        className={`inline-flex shrink-0 items-center justify-center ${groupType === 'grupal' ? 'rounded-full bg-blue-100 p-1 text-blue-700' : ''}`}
      >
        {groupType === 'grupal' ? (
          <FiUsers aria-hidden="true" size={16} />
        ) : (
          <FiUser aria-hidden="true" size={16} />
        )}
      </span>
    </span>
  )
}
