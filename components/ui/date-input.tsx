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
  name,
}: {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  disabled?: boolean
  minYear?: number
  max?: string
  name?: string
}) {
  const id = useId()
  const firstButton = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState({ source: value, parts: parse(value) })
  const parts = draft.source === value ? draft.parts : parse(value)
  const [active, setActive] = useState<Part | null>(null)
  const [invalid, setInvalid] = useState(false)
  const maxYear = max ? parse(max).year : new Date().getFullYear() + 10
  const [decade, setDecade] = useState(
    Math.floor((parts.year || Math.min(2000, maxYear)) / 10) * 10
  )
  const days = parts.month ? new Date(parts.year || 2000, parts.month, 0).getDate() : 31
  const buttonClass =
    'min-h-11 rounded-xl border border-(--c-border) px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:cursor-not-allowed disabled:opacity-40'
  const choose = (part: Part, number: number) => {
    const next = { ...parts, [part]: number }
    if (next.month && next.day)
      next.day = Math.min(next.day, new Date(next.year || 2000, next.month, 0).getDate())
    const nextValue = format(next)
    setDraft({ source: nextValue, parts: next })
    onChange(nextValue)
    setInvalid(false)
    setActive(null)
    firstButton.current?.focus()
  }
  const allowed = (part: Part, number: number) => {
    const candidate = { ...parts, [part]: number }
    if (part === 'year') {
      if (number < minYear || number > maxYear) return false
      if (max && number === maxYear && candidate.month) {
        const upper = parse(max)
        return (
          candidate.month < upper.month ||
          (candidate.month === upper.month && (!candidate.day || candidate.day <= upper.day))
        )
      }
      return true
    }
    if (!max || candidate.year !== maxYear) return true
    const upper = parse(max)
    if (part === 'month') return number <= upper.month
    return (
      !candidate.month ||
      candidate.month < upper.month ||
      (candidate.month === upper.month && number <= upper.day)
    )
  }
  return (
    <fieldset
      disabled={disabled}
      className="grid min-w-0 gap-2"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          setActive(null)
          firstButton.current?.focus()
        }
      }}
    >
      <legend className="mb-2 text-sm font-semibold text-(--c-ocean)">{label}</legend>
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
                setDecade(Math.floor((parts.year || Math.min(2000, maxYear)) / 10) * 10)
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
                disabled={decade <= minYear}
                onClick={() => setDecade(decade - 10)}
                className={buttonClass}
              >
                <FiChevronLeft aria-hidden="true" />
              </button>
              <span className="text-sm font-bold">
                {Math.max(decade, minYear)}–{Math.min(decade + 9, maxYear)}
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
