'use client'
import { FiCheck, FiTag, FiX } from 'react-icons/fi'
import { studentLabelColor } from '@/lib/student-label-colors'
export type ColorLabel = { id: string; name: string; color?: string }
export default function LabelChip({
  label,
  selected = false,
  count,
  size = 'compact',
  disabled,
  onClick,
  onRemove,
}: {
  label: ColorLabel
  selected?: boolean
  count?: number
  size?: 'tiny' | 'compact' | 'filter'
  disabled?: boolean
  onClick?: () => void
  onRemove?: () => void
}) {
  const Component = onClick ? 'button' : 'span'
  const color = studentLabelColor(label.color)
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={onClick ? disabled : undefined}
      aria-pressed={onClick ? selected : undefined}
      title={label.name}
      className={`inline-flex shrink-0 items-center rounded-full font-semibold ${size === 'filter' ? 'h-7 gap-1 px-2.5 text-[11px]' : size === 'tiny' ? 'h-4 gap-0.5 px-1 text-[9px] leading-none' : 'h-6 gap-1 px-1.5 text-[10px] leading-tight'} ${onClick ? 'transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50' : ''}`}
      style={{
        backgroundColor: color.color,
        color: color.text,
        border: `1px solid ${selected ? 'var(--c-ocean)' : size === 'compact' ? 'var(--c-border)' : 'transparent'}`,
        boxShadow: selected ? 'inset 0 0 0 1px var(--c-ocean)' : undefined,
      }}
    >
      {selected ? (
        <FiCheck aria-hidden="true" className="size-3.5 shrink-0" />
      ) : (
        <FiTag aria-hidden="true" className={size === 'tiny' ? 'size-2.5 shrink-0' : 'shrink-0'} />
      )}
      <span className="truncate">{label.name}</span>
      {count !== undefined && (
        <span className="text-[10px] tabular-nums opacity-75">({count})</span>
      )}
      {onRemove && !onClick && (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          aria-label={`Quitar etiqueta ${label.name}`}
          title={`Quitar ${label.name}`}
          className="relative inline-flex size-3.5 shrink-0 items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50 before:absolute before:-inset-1"
        >
          <FiX aria-hidden="true" />
        </button>
      )}
    </Component>
  )
}
