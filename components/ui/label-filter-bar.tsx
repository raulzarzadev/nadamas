'use client'
import { FiEdit2, FiPlus } from 'react-icons/fi'
import LabelChip, { type ColorLabel } from './label-chip'
export default function LabelFilterBar({
  labels,
  value,
  onChange,
  total,
  counts,
  disabled = false,
  onCreate,
  onEdit,
}: {
  labels: ColorLabel[]
  value: string
  onChange: (id: string) => void
  total: number
  counts: Record<string, number>
  disabled?: boolean
  onCreate?: () => void
  onEdit?: (label: ColorLabel) => void
}) {
  const selected = labels.find((label) => label.id === value)
  const iconClass =
    'inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-(--c-surface) p-0 text-(--c-ocean) hover:bg-(--c-border) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:opacity-50'
  return (
    <section className="flex flex-wrap items-center gap-2" aria-label="Filtrar por etiqueta">
      <button
        type="button"
        aria-pressed={!value}
        disabled={disabled}
        onClick={() => onChange('')}
        className={`inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${!value ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean)'}`}
      >
        Todos <span className="text-[10px] tabular-nums opacity-75">({total})</span>
      </button>
      {labels.map((label) => (
        <LabelChip
          key={label.id}
          label={label}
          selected={value === label.id}
          count={counts[label.id] || 0}
          size="filter"
          disabled={disabled}
          onClick={() => onChange(value === label.id ? '' : label.id)}
        />
      ))}
      {selected && onEdit && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onEdit(selected)}
          aria-label="Editar etiqueta seleccionada"
          title="Editar etiqueta"
          className={iconClass}
        >
          <FiEdit2 aria-hidden="true" className="size-4 shrink-0" />
        </button>
      )}
      {onCreate && (
        <button
          type="button"
          disabled={disabled}
          onClick={onCreate}
          aria-label="Crear etiqueta"
          title="Crear etiqueta"
          className={iconClass}
        >
          <FiPlus aria-hidden="true" className="size-4 shrink-0" />
        </button>
      )}
    </section>
  )
}
