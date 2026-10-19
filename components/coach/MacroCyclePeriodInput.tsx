'use client'

import { useId, useState } from 'react'
import { FiChevronDown, FiChevronRight, FiEdit2 } from 'react-icons/fi'
import DateInput from '@/components/ui/date-input'
import Sheet from '@/components/ui/sheet'
import type { TimelineRange } from '@/components/ui/timeline-range-input'

export default function MacroCyclePeriodInput({
  value,
  onChange,
  disabled,
  title,
  onTitleChange,
  initialEditOpen = false,
  hideTitle = false,
  readOnly = false,
}: {
  value: TimelineRange
  onChange: (value: TimelineRange) => void
  disabled: boolean
  title: string
  onTitleChange: (value: string) => void
  initialEditOpen?: boolean
  hideTitle?: boolean
  readOnly?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const [editingName, setEditingName] = useState(initialEditOpen)
  const [name, setName] = useState(title)
  const [period, setPeriod] = useState<TimelineRange>({
    startDate: value.startDate,
    endDate: value.endDate,
  })
  const dateLabel = (date: string) =>
    date
      ? new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Sin fecha'
  const openEditor = () => {
    setName(title)
    setPeriod({ startDate: value.startDate, endDate: value.endDate })
    setEditingName(true)
  }
  return (
    <div className={`grid min-w-0 gap-0 ${expanded ? 'rounded-xl bg-(--c-surface)' : ''}`}>
      <div
        hidden={hideTitle}
        className="flex min-w-0 items-center justify-between gap-2 text-(--c-ocean)"
      >
        <button
          type="button"
          disabled={disabled}
          aria-label="Editar nombre del MACRO-ciclo"
          className="inline-flex min-w-0 items-center gap-1.5 rounded p-0 text-left text-xs font-semibold leading-tight focus-visible:outline-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
          onClick={openEditor}
        >
          <span className="break-words">{title || 'Nombre de la temporada'}</span>
          <FiEdit2 aria-hidden="true" className="size-3 shrink-0" />
        </button>
        <button
          type="button"
          aria-label={`Detalles de ${title || 'MACRO-ciclo'}`}
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded(!expanded)}
          className="grid size-6 shrink-0 place-items-center rounded-full text-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
        >
          {expanded ? <FiChevronDown aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
        </button>
      </div>
      <div aria-hidden="true" className="h-8 w-full rounded-full bg-[#79b9cf]" />
      <div className="flex justify-between gap-3 text-xs font-semibold text-(--c-aqua-strong)">
        {readOnly ? (
          <>
            <span>{dateLabel(value.startDate)}</span>
            <span>{dateLabel(value.endDate)}</span>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={disabled}
              aria-label="Editar fecha de inicio del MACRO-ciclo"
              onClick={openEditor}
              className="cursor-pointer rounded p-0 text-left hover:underline focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
            >
              {dateLabel(value.startDate)}
            </button>
            <button
              type="button"
              disabled={disabled}
              aria-label="Editar fecha final del MACRO-ciclo"
              onClick={openEditor}
              className="cursor-pointer rounded p-0 text-right hover:underline focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
            >
              {dateLabel(value.endDate)}
            </button>
          </>
        )}
      </div>
      <div id={detailsId} hidden={!expanded} className="mt-3 border-t border-(--c-border)" />
      <Sheet
        open={editingName}
        onClose={() => setEditingName(false)}
        label="Editar ciclo"
        size="sm"
        keyboardAware
        footer={
          <button
            type="button"
            disabled={disabled || !name.trim()}
            className="min-h-11 w-full rounded-full bg-(--c-ocean) px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
            onClick={() => {
              onTitleChange(name.trim())
              onChange(period)
              setEditingName(false)
            }}
          >
            Listo
          </button>
        }
      >
        <h2 className="mb-4 text-lg font-bold">Editar ciclo</h2>
        <label className="grid min-w-0 gap-2 pb-4 text-sm font-semibold">
          Nombre
          <input
            required
            maxLength={100}
            disabled={disabled}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Temporada de invierno"
            className="min-h-11 min-w-0 rounded-xl border border-(--c-border) bg-white px-3 font-normal focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
          />
        </label>
        <div className="grid min-w-0 gap-4 pb-4">
          {(['startDate', 'endDate'] as const).map((field) => (
            <DateInput
              key={field}
              label={
                field === 'startDate' ? 'Fecha de inicio (opcional)' : 'Fecha final (opcional)'
              }
              value={period[field]}
              disabled={disabled}
              min={field === 'endDate' ? period.startDate || undefined : undefined}
              max={field === 'startDate' ? period.endDate || undefined : undefined}
              onChange={(date) => setPeriod({ ...period, [field]: date })}
            />
          ))}
        </div>
      </Sheet>
    </div>
  )
}
