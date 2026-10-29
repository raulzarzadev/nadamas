'use client'

import type { ReactNode } from 'react'
import { FiChevronRight, FiEdit2 } from 'react-icons/fi'

/** Shared hierarchy header: drag handle, title, adjacent count and chevron. */
export default function PlanningRow({
  title,
  count,
  countLabel,
  expanded,
  onToggle,
  handle,
  onEdit,
  disabled = false,
  controls,
  id,
  indicatorLabel,
  leading,
  dotLabel,
  dotFilled = true,
  titleHidden = false,
}: {
  title: string
  count?: number
  countLabel?: string
  expanded: boolean
  onToggle?: () => void
  handle?: ReactNode
  onEdit?: () => void
  disabled?: boolean
  controls?: ReactNode
  id?: string
  indicatorLabel?: string
  leading?: ReactNode
  /** Green dot before the title (e.g. the day already has a session); the text is its accessible label. */
  dotLabel?: string
  /** false = hollow dot (e.g. the day has no session yet). */
  dotFilled?: boolean
  /** Keep the title for screen readers only (e.g. it is already shown inside the bars below). */
  titleHidden?: boolean
}) {
  return (
    <div className="flex min-h-6 min-w-0 items-center gap-1 px-1 text-(--c-ocean)">
      {leading}
      {handle}
      {onToggle ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={onToggle}
          aria-label={count === undefined ? title : `${title}, ${count} ${countLabel || ''}`}
          className="inline-flex min-h-6 min-w-0 items-center gap-2 rounded text-left text-xs leading-tight font-semibold outline-none focus-visible:ring-2 focus-visible:ring-(--c-aqua-strong) focus-visible:ring-inset"
        >
          {dotLabel && (
            <span
              role="img"
              aria-label={dotLabel}
              title={dotLabel}
              className={`size-2 shrink-0 rounded-full ${dotFilled ? 'bg-[#1f9d57]' : 'border border-[#1f9d57]'}`}
            />
          )}
          <span className={titleHidden ? 'sr-only' : 'min-w-0 truncate'}>{title}</span>
          {count !== undefined && !titleHidden && (
            <span
              aria-hidden="true"
              className={`shrink-0 text-[10px] ${indicatorLabel ? 'rounded-full bg-[#258575]/10 px-1.5 py-0.5 font-semibold text-[#176454]' : 'font-normal text-(--c-text-2)'}`}
            >
              ({count})
            </span>
          )}
          {indicatorLabel && (
            <span
              role="img"
              aria-label={indicatorLabel}
              title={indicatorLabel}
              className="size-1.5 shrink-0 rounded-full bg-[#258575]"
            />
          )}
          <FiChevronRight
            aria-hidden="true"
            className={`size-4 shrink-0 ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
      ) : (
        <span className="inline-flex min-h-6 min-w-0 items-center gap-2 text-xs leading-tight font-semibold">
          {dotLabel && (
            <span
              role="img"
              aria-label={dotLabel}
              title={dotLabel}
              className={`size-2 shrink-0 rounded-full ${dotFilled ? 'bg-[#1f9d57]' : 'border border-[#1f9d57]'}`}
            />
          )}
          <span className={titleHidden ? 'sr-only' : 'min-w-0 truncate'}>{title}</span>
          {count !== undefined && !titleHidden && (
            <span className="shrink-0 text-[10px] font-normal text-(--c-text-2)">({count})</span>
          )}
        </span>
      )}
      {onEdit && (
        <button
          type="button"
          disabled={disabled}
          onClick={onEdit}
          aria-label={`Editar nombre de ${title}`}
          className="grid size-6 shrink-0 place-items-center rounded text-(--c-aqua-strong) outline-none hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-inset disabled:opacity-40"
        >
          <FiEdit2 aria-hidden="true" className="size-3" />
        </button>
      )}
      {controls && <div className="ml-auto shrink-0">{controls}</div>}
    </div>
  )
}
