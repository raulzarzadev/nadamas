'use client'

import { useEffect, useState } from 'react'

type NumberStepperProps = {
  compact?: boolean
  id?: string
  name?: string
  label: string
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  required?: boolean
  disabled?: boolean
  decreaseLabel?: string
  increaseLabel?: string
}

/** Keeps an editable text draft so clearing the field never inserts a zero. */
export default function NumberStepper({
  compact = false,
  id,
  name,
  label,
  value,
  onValueChange,
  min = 1,
  max,
  step = 1,
  required = false,
  disabled = false,
  decreaseLabel = `Reducir ${label.toLocaleLowerCase('es')}`,
  increaseLabel = `Aumentar ${label.toLocaleLowerCase('es')}`,
}: NumberStepperProps) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const current = draft === '' ? null : Number(draft)
  const changeBy = (delta: number) => {
    const next = Math.max(min, Math.min(max ?? Infinity, current === null ? min : current + delta))
    setDraft(String(next))
    onValueChange(next)
  }
  return (
    <div
      data-number-stepper
      className={
        compact
          ? 'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] items-center gap-0.5'
          : 'flex min-w-0 shrink-0 items-center justify-center gap-1'
      }
    >
      <button
        type="button"
        aria-label={decreaseLabel}
        className={`inline-flex h-11 min-h-11 min-w-0 shrink-0 items-center justify-center border border-(--c-border) bg-white p-0 text-lg text-(--c-ocean) outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:border-transparent disabled:bg-base-200 disabled:text-slate-400 ${compact ? 'w-full min-w-0 rounded-lg' : 'w-11 rounded-xl'}`}
        disabled={disabled || (current !== null && current <= min)}
        onClick={() => changeBy(-step)}
      >
        −
      </button>
      <input
        id={id}
        name={name}
        aria-label={label}
        type="number"
        inputMode={Number.isInteger(step) ? 'numeric' : 'decimal'}
        min={min}
        max={max}
        step={step}
        required={required}
        disabled={disabled}
        className={`box-border h-11 ${compact ? 'w-full text-lg' : 'w-16 text-2xl'} min-w-0 max-w-full rounded-lg border-0 bg-transparent px-1 text-center font-semibold outline-none focus:ring-2 focus:ring-inset focus:ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        placeholder="0"
        value={draft}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          if (next !== '' && Number.isFinite(Number(next))) onValueChange(Number(next))
        }}
      />
      <button
        type="button"
        aria-label={increaseLabel}
        className={`inline-flex h-11 min-h-11 min-w-0 shrink-0 items-center justify-center border border-(--c-border) bg-white p-0 text-lg text-(--c-ocean) outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:border-transparent disabled:bg-base-200 disabled:text-slate-400 ${compact ? 'w-full min-w-0 rounded-lg' : 'w-11 rounded-xl'}`}
        disabled={disabled || (current !== null && max !== undefined && current >= max)}
        onClick={() => changeBy(step)}
      >
        +
      </button>
    </div>
  )
}
