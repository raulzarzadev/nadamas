'use client'

import { MoneyField, TextField } from '@comps/Inputs/FormFields'
import { useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const HOUR_OPTIONS = Array.from(
  { length: 16 },
  (_, index) => `${String(index + 6).padStart(2, '0')}:00`
)

export interface AgendaWeekDay {
  key: string
  label: string
}

export interface OpenHoursDetails {
  title: string
  placeName: string
  priceCents: number | null
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00`)
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay()
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day))
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function buildWeekDays(start: Date): AgendaWeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    return {
      key: dateKey(date),
      label: `${DAY_LABELS[date.getDay()]}|${date.getDate()}`,
    }
  })
}

function weekRangeLabel(days: AgendaWeekDay[]) {
  if (!days.length) return ''
  const first = dateFromKey(days[0].key)
  const last = dateFromKey(days[days.length - 1].key)
  const format = (date: Date) =>
    date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  return `${format(first)} - ${format(last)}`
}

function isPastDay(key: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(`${key}T00:00:00`)
  return day < today
}

function isPastDateTime(key: string, time: string) {
  return new Date(`${key}T${time}:00`).getTime() <= Date.now()
}

export default function AgendaOpenHoursModal({
  defaultDate,
  busy,
  showDetails = false,
  title = 'Abrir horarios',
  description = 'Publica las horas que quieres ofrecer. Aplica a uno o varios días.',
  submitLabel = 'Abrir horario(s)',
  initialDates = [],
  initialTimes = [],
  initialDetails,
  onClose,
  onSubmit,
}: {
  weekDays: AgendaWeekDay[]
  defaultDate?: string
  busy: boolean
  showDetails?: boolean
  title?: string
  description?: string
  submitLabel?: string
  initialDates?: string[]
  initialTimes?: string[]
  initialDetails?: OpenHoursDetails
  onClose: () => void
  onSubmit: (dates: string[], times: string[], details?: OpenHoursDetails) => void
}) {
  const initialKey = defaultDate || initialDates[0] || dateKey(new Date())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(dateFromKey(initialKey)))
  const [dates, setDates] = useState<Set<string>>(
    () =>
      new Set(
        initialDates.length
          ? initialDates.filter((date) => !isPastDay(date))
          : defaultDate && !isPastDay(defaultDate)
            ? [defaultDate]
            : []
      )
  )
  const [times, setTimes] = useState<Set<string>>(() => new Set(initialTimes))
  const [detailTitle, setDetailTitle] = useState(initialDetails?.title || '')
  const [placeName, setPlaceName] = useState(initialDetails?.placeName || '')
  const [priceCents, setPriceCents] = useState<number | null>(initialDetails?.priceCents ?? null)
  const visibleWeekDays = buildWeekDays(weekStart)

  const toggle = (set: Set<string>, value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const selectedDates = [...dates]
  const timeDisabled = (time: string) =>
    selectedDates.length > 0 && selectedDates.every((date) => isPastDateTime(date, time))
  const validTimes = [...times].filter((time) => !timeDisabled(time))
  const canSubmit = dates.size > 0 && validTimes.length > 0 && !busy

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Abrir horarios"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,37,64,0.55)] p-4 backdrop-blur-sm sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="flex max-h-[min(92dvh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--r-md)] bg-white shadow-[var(--shadow-md)]">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 pb-3">
          <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-[var(--c-border)] sm:hidden" />
          <div>
            <h3 className="text-xl font-bold text-[var(--c-ocean)]">{title}</h3>
            <p className="mt-1 text-sm text-[var(--c-text-2)]">{description}</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--c-text-2)]">
                Días
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Semana anterior"
                  onClick={() => setWeekStart((current) => addDays(current, -7))}
                  className="grid h-8 w-8 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
                >
                  <FiChevronLeft aria-hidden="true" />
                </button>
                <span className="min-w-[7.5rem] text-center text-xs font-bold text-[var(--c-ocean)]">
                  {weekRangeLabel(visibleWeekDays)}
                </span>
                <button
                  type="button"
                  aria-label="Semana siguiente"
                  onClick={() => setWeekStart((current) => addDays(current, 7))}
                  className="grid h-8 w-8 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
                >
                  <FiChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {visibleWeekDays.map((day) => {
                const active = dates.has(day.key)
                const disabled = isPastDay(day.key)
                const isWeekend = [0, 6].includes(dateFromKey(day.key).getDay())
                const [weekday, dayNumber] = day.label.split('|')
                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setDates((current) => toggle(current, day.key))}
                    className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-[var(--r-sm)] border px-1.5 py-1.5 text-center text-xs font-bold leading-tight transition-colors ${
                      disabled
                        ? 'cursor-not-allowed border-[var(--c-border)] bg-slate-100 text-slate-400'
                        : active
                          ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                          : isWeekend
                            ? 'border-emerald-200 bg-emerald-50 text-[var(--c-ocean)] hover:bg-emerald-100'
                            : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:bg-[var(--c-surface)]'
                    }`}
                  >
                    <span>{weekday}</span>
                    <span className="text-sm">{dayNumber}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--c-text-2)]">
              Horas
            </span>
            <div className="flex flex-wrap gap-2">
              {HOUR_OPTIONS.map((time) => {
                const active = times.has(time)
                const disabled = timeDisabled(time)
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={disabled}
                    onClick={() => setTimes((current) => toggle(current, time))}
                    className={`rounded-[var(--r-sm)] border px-3.5 py-2 text-sm font-semibold transition-colors ${
                      disabled
                        ? 'cursor-not-allowed border-[var(--c-border)] bg-slate-100 text-slate-400'
                        : active
                          ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                          : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:bg-[var(--c-surface)]'
                    }`}
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          </div>

          {showDetails && (
            <details className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-[var(--c-bg)] p-3">
              <summary className="cursor-pointer text-sm font-bold text-[var(--c-ocean)]">
                Opciones de la clase
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Título"
                  placeholder="Ej. Técnica libre"
                  value={detailTitle}
                  onChange={(event) => setDetailTitle(event.target.value)}
                />
                <TextField
                  label="Lugar"
                  placeholder="Ej. Playa el Coromuel"
                  value={placeName}
                  onChange={(event) => setPlaceName(event.target.value)}
                />
                <MoneyField
                  label="Precio"
                  valueCents={priceCents}
                  onChange={setPriceCents}
                  placeholder="$350"
                  className="sm:col-span-2"
                />
              </div>
            </details>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--c-border)] bg-white p-5 pt-4">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit(
                [...dates],
                validTimes,
                showDetails
                  ? {
                      title: detailTitle.trim(),
                      placeName: placeName.trim(),
                      priceCents,
                    }
                  : undefined
              )
            }
            className="min-h-12 rounded-full bg-[var(--c-aqua)] font-bold text-white transition-opacity hover:opacity-90 disabled:bg-slate-400 disabled:opacity-100"
          >
            {submitLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full font-semibold text-[var(--c-text-2)] hover:text-[var(--c-ocean)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
