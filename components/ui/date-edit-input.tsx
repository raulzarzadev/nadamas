'use client'

import { useState } from 'react'
import { FiEdit2 } from 'react-icons/fi'
import DateInput from './date-input'
import Sheet from './sheet'

/** Compact date display with a single-date modal. Changes apply on Listo. */
export default function DateEditInput({
  value,
  onChange,
  label = 'Fecha',
  emptyLabel,
  disabled = false,
  required = false,
  min,
  max,
  name,
}: {
  value: string
  onChange: (value: string) => void
  label?: string
  emptyLabel?: string
  disabled?: boolean
  required?: boolean
  min?: string
  max?: string
  name?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const actionLabel = `${value ? 'Editar' : 'Agregar'} ${label.toLowerCase()}`
  const modalLabel = `Editar ${label.toLowerCase()}`
  const formatted = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : emptyLabel || `+ Agregar ${label.toLowerCase()}`
  const valid =
    (!required || Boolean(draft)) && (!draft || ((!min || draft >= min) && (!max || draft <= max)))
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={actionLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative inline-flex min-w-0 items-center gap-1.5 rounded-lg p-0 text-xs font-semibold leading-tight before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 text-(--c-aqua-strong) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
        onClick={() => {
          setDraft(value)
          setOpen(true)
        }}
      >
        <span>{formatted}</span>
        {value && <FiEdit2 aria-hidden="true" className="size-3 shrink-0" />}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        label={modalLabel}
        size="sm"
        footer={
          <button
            type="button"
            disabled={disabled || !valid}
            className="min-h-11 w-full rounded-full bg-(--c-ocean) px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
            onClick={() => {
              onChange(draft)
              setOpen(false)
            }}
          >
            Listo
          </button>
        }
      >
        <div className="pb-4">
          <DateInput
            label={required ? label : `${label} (opcional)`}
            value={draft}
            onChange={setDraft}
            required={required}
            disabled={disabled}
            min={min}
            max={max}
            name={name}
          />
        </div>
      </Sheet>
    </>
  )
}
