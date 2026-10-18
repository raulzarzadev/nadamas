'use client'

import { useId, useRef, useState } from 'react'
import { FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
type Part = 'day' | 'month' | 'year'
type Parts = Record<Part, number>
const parse = (value: string): Parts => {
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  return { year, month, day }
}
const format = ({ year, month, day }: Parts) =>
  year && month && day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : ''

/** Individual date selectors. Values remain in YYYY-MM-DD format. */
export default function DateInput({
  value,
  onChange,
  label = 'Fecha',
  required = false,
  disabled = false,
  minYear = 1900,
  max,
  min,
  name,
}: {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  disabled?: boolean
  minYear?: number
  max?: string
  min?: string
  name?: string
}) {
  const id = useId()
  const firstButton = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState({ source: value, parts: parse(value) })
  const parts = draft.source === value ? draft.parts : parse(value)
  const [active, setActive] = useState<Part | null>(null)
  const [invalid, setInvalid] = useState(false)
  const lowerYear = Math.max(minYear, min ? parse(min).year : minYear)
  const maxYear = max ? parse(max).year : new Date().getFullYear() + 10
  const [decade, setDecade] = useState(
    Math.floor((parts.year || Math.max(lowerYear, Math.min(2000, maxYear))) / 10) * 10
  )
  const days = parts.month ? new Date(parts.year || 2000, parts.month, 0).getDate() : 31
  const now = new Date()
  const todayParts = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
  const today = format(todayParts)
  const todayAllowed =
    todayParts.year >= lowerYear && (!min || today >= min) && (!max || today <= max)
  const buttonClass =
    'min-h-11 rounded-xl border border-(--c-border) px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:cursor-not-allowed disabled:opacity-40'
  const choose = (part: Part, number: number) => {
    const next = { ...parts, [part]: number }
    if (next.month && next.day)
      next.day = Math.min(next.day, new Date(next.year || 2000, next.month, 0).getDate())
    let nextValue = format(next)
    if (nextValue && min && nextValue < min) {
      Object.assign(next, parse(min))
      nextValue = min
    }
    if (nextValue && max && nextValue > max) {
      Object.assign(next, parse(max))
      nextValue = max
    }
    setDraft({ source: nextValue, parts: next })
    onChange(nextValue)
    setInvalid(false)
    setActive(null)
    firstButton.current?.focus()
  }
  const allowed = (part: Part, number: number) => {
    const candidate = { ...parts, [part]: number }
    if (part === 'year') return number >= lowerYear && number <= maxYear
    const firstYear = candidate.year || lowerYear
    const lastYear = candidate.year || maxYear
    const firstMonth = candidate.month || 1
    const lastMonth = candidate.month || 12
    const first = format({ year: firstYear, month: firstMonth, day: part === 'day' ? number : 1 })
    const last = format({
      year: lastYear,
      month: lastMonth,
      day: part === 'day' ? number : new Date(lastYear, lastMonth, 0).getDate(),
    })
    return (!max || first <= max) && (!min || last >= min)
  }
  return (
    <fieldset
      aria-label={label}
      disabled={disabled}
      className="grid min-w-0 gap-1"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          setActive(null)
          firstButton.current?.focus()
        }
      }}
    >
      <legend className="mb-0 w-full text-sm font-semibold text-(--c-ocean)">
        <span className="flex items-center justify-between gap-2">
          <span>
            {label.endsWith(' (opcional)') ? (
              <>
                {label.slice(0, -11)}{' '}
                <span className="text-[10px] font-normal text-(--c-text-2)">(opcional)</span>
              </>
            ) : (
              label
            )}
          </span>
          <button
            type="button"
            disabled={disabled || !todayAllowed}
            className="group relative inline-flex cursor-pointer items-center justify-center rounded-full py-0.5 before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              setDraft({ source: today, parts: todayParts })
              onChange(today)
              setInvalid(false)
              setActive(null)
              firstButton.current?.focus()
            }}
          >
            <span className="rounded-full border border-(--c-aqua-strong)/40 px-2 py-0.5 text-[10px] font-semibold leading-none text-(--c-aqua-strong) group-hover:bg-(--c-surface)">
              Hoy
            </span>
          </button>
        </span>
      </legend>
      <input
        className="sr-only"
        tabIndex={-1}
        aria-label={label}
        name={name}
        value={value}
        onChange={() => {}}
        required={required}
        onInvalid={(event) => {
          event.preventDefault()
          setInvalid(true)
          firstButton.current?.focus()
        }}
      />
      <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2">
        {(['day', 'month', 'year'] as const).map((part, index) => (
          <button
            key={part}
            ref={index === 0 ? firstButton : undefined}
            type="button"
            aria-label={`${['Día', 'Mes', 'Año'][index]}: ${parts[part] || 'sin seleccionar'}`}
            aria-expanded={active === part}
            aria-controls={`${id}-options`}
            aria-invalid={invalid}
            onClick={() => {
              if (part === 'year')
                setDecade(
                  Math.floor((parts.year || Math.max(lowerYear, Math.min(2000, maxYear))) / 10) * 10
                )
              setActive(active === part ? null : part)
            }}
            className={`${buttonClass} flex items-center justify-between gap-1 ${active === part ? 'border-(--c-ocean) bg-(--c-surface)' : 'bg-white'} ${parts[part] ? 'text-(--c-ocean)' : 'text-(--c-text-2)'}`}
          >
            <span>
              {part === 'month'
                ? MONTHS[parts.month - 1] || 'Mes'
                : parts[part] || (part === 'day' ? 'Día' : 'Año')}
            </span>
            <FiChevronDown aria-hidden="true" size={14} />
          </button>
        ))}
      </div>
      {active && (
        <div
          id={`${id}-options`}
          className="rounded-2xl border border-(--c-border) bg-(--c-surface) p-2"
        >
          {active === 'year' && (
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Años anteriores"
                disabled={decade <= lowerYear}
                onClick={() => setDecade(decade - 10)}
                className={buttonClass}
              >
                <FiChevronLeft aria-hidden="true" />
              </button>
              <span className="text-sm font-bold">
                {Math.max(decade, lowerYear)}–{Math.min(decade + 9, maxYear)}
              </span>
              <button
                type="button"
                aria-label="Años siguientes"
                disabled={decade + 9 >= maxYear}
                onClick={() => setDecade(decade + 10)}
                className={buttonClass}
              >
                <FiChevronRight aria-hidden="true" />
              </button>
            </div>
          )}
          <div
            className={`grid gap-1 ${active === 'day' ? 'grid-cols-7' : active === 'month' ? 'grid-cols-3' : 'grid-cols-5'}`}
          >
            {Array.from(
              { length: active === 'day' ? days : active === 'month' ? 12 : 10 },
              (_, index) => (active === 'year' ? decade + index : index + 1)
            ).map((number) => (
              <button
                type="button"
                key={number}
                aria-pressed={parts[active] === number}
                disabled={!allowed(active, number)}
                onClick={() => choose(active, number)}
                className={`${buttonClass} ${parts[active] === number ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'bg-white text-(--c-ocean)'}`}
              >
                {active === 'month' ? MONTHS[number - 1]?.slice(0, 3) : number}
              </button>
            ))}
          </div>
        </div>
      )}
      {invalid && (
        <p role="alert" className="text-xs text-(--c-error,#b91c1c)">
          Selecciona el día, el mes y el año.
        </p>
      )}
    </fieldset>
  )
}
