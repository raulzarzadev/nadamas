import { FiCheck, FiX } from 'react-icons/fi'
import { LuHourglass } from 'react-icons/lu'

export type ClassBadgeStatus = 'confirmed' | 'pending' | 'cancelled'

const statuses = {
  confirmed: { label: 'Inscrito', Icon: FiCheck, background: '#d1fae5', color: '#064e3b' },
  pending: { label: 'Pendiente', Icon: LuHourglass, background: '#fef9c3', color: '#713f12' },
  cancelled: { label: 'Cancelada', Icon: FiX, background: '#ffe4e6', color: '#881337' },
}

export default function StatusBadge({
  status,
  compact = false,
  label: customLabel,
}: {
  status: ClassBadgeStatus
  compact?: boolean
  label?: string
}) {
  const { label, Icon, background, color } = statuses[status]
  return (
    <span
      style={{ backgroundColor: background, color }}
      className={`inline-flex w-fit shrink-0 items-center rounded-full font-semibold leading-none ${compact ? 'gap-0.5 px-1 py-0.5 text-[8px]' : 'gap-1 px-2 py-1 text-[10px]'}`}
    >
      <Icon aria-hidden="true" size={compact ? 8 : 12} />
      {customLabel || label}
    </span>
  )
}
