'use client'

import Link from 'next/link'
import { FiActivity, FiCheckSquare, FiEdit3, FiEye, FiSettings } from 'react-icons/fi'

export type ClassQuickAction = 'configure' | 'training' | 'note' | 'attendance'

const ACTIONS = [
  { action: 'configure', label: 'Configurar', icon: FiSettings },
  { action: 'training', label: 'Entreno', icon: FiActivity },
  { action: 'note', label: 'Nota', icon: FiEdit3 },
  { action: 'attendance', label: 'Lista', icon: FiCheckSquare },
] as const

export const quickActionButtonClass =
  'grid size-7 shrink-0 place-items-center rounded-full border border-(--c-border) bg-white text-(--c-ocean) transition-colors before:absolute before:-inset-0.5 hover:border-(--c-aqua) hover:bg-(--c-aqua-light) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:cursor-not-allowed disabled:opacity-50 relative'

/** Standard class toolbar: settings, training, note, attendance and full view. */
export default function ClassQuickActions({
  onAction,
  viewHref,
  onView,
  canConfigure = true,
  hidden = [],
  disabled = false,
}: {
  onAction: (action: ClassQuickAction) => void
  /** Omit to hide "Ver" (e.g. when already on the class page). */
  viewHref?: string
  /** Alternative to viewHref when "Ver" opens something in place. */
  onView?: () => void
  canConfigure?: boolean
  hidden?: ClassQuickAction[]
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      {ACTIONS.filter(
        ({ action }) => (canConfigure || action !== 'configure') && !hidden.includes(action)
      ).map(({ action, label, icon: Icon }) => (
        <button
          key={action}
          type="button"
          aria-label={label}
          title={label}
          disabled={disabled}
          onClick={() => onAction(action)}
          className={quickActionButtonClass}
        >
          <Icon aria-hidden="true" className="size-3.5" />
        </button>
      ))}
      {onView && (
        <button
          type="button"
          aria-label="Ver"
          title="Ver"
          onClick={onView}
          className={quickActionButtonClass}
        >
          <FiEye aria-hidden="true" className="size-3.5" />
        </button>
      )}
      {!onView && viewHref && (
        <Link href={viewHref} aria-label="Ver clase" title="Ver" className={quickActionButtonClass}>
          <FiEye aria-hidden="true" className="size-3.5" />
        </Link>
      )}
    </div>
  )
}
