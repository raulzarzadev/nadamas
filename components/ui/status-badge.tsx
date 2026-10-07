import { FiCheck, FiX } from 'react-icons/fi'
import { LuHourglass } from 'react-icons/lu'

export type ClassBadgeStatus = 'confirmed' | 'pending' | 'cancelled'

const statuses = {
  confirmed: { label: 'Inscrito', Icon: FiCheck, background: '#d1fae5', color: '#064e3b' },
  pending: { label: 'Pendiente', Icon: LuHourglass, background: '#fef9c3', color: '#713f12' },
  cancelled: { label: 'Cancelada', Icon: FiX, background: '#ffe4e6', color: '#881337' },
}

export default function StatusBadge({ status }: { status: ClassBadgeStatus }) {
  const { label, Icon, background, color } = statuses[status]
  return (
    <span
      style={{ backgroundColor: background, color }}
      className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold leading-none"
    >
      <Icon aria-hidden="true" size={12} />
      {label}
    </span>
  )
}
