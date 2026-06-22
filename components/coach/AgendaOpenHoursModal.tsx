'use client'

import { useState } from 'react'

const HOUR_OPTIONS = Array.from(
  { length: 16 },
  (_, index) => `${String(index + 6).padStart(2, '0')}:00`
)

export interface AgendaWeekDay {
  key: string
  label: string
}

export default function AgendaOpenHoursModal({
  weekDays,
  defaultDate,
  busy,
  onClose,
  onSubmit,
}: {
  weekDays: AgendaWeekDay[]
  defaultDate?: string
  busy: boolean
  onClose: () => void
  onSubmit: (dates: string[], times: string[]) => void
}) {
  const [dates, setDates] = useState<Set<string>>(() => new Set(defaultDate ? [defaultDate] : []))
  const [times, setTimes] = useState<Set<string>>(() => new Set())

  const toggle = (set: Set<string>, value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const canSubmit = dates.size > 0 && times.size > 0 && !busy

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
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-[var(--r-md)] bg-white p-5 shadow-[var(--shadow-md)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-[var(--c-border)] sm:hidden" />
        <div>
          <h3 className="text-xl font-bold text-[var(--c-ocean)]">Abrir horarios</h3>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">
            Publica las horas que quieres ofrecer. Aplica a uno o varios días.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--c-text-2)]">
            Días
          </span>
          <div className="flex flex-wrap gap-2">
            {weekDays.map((day) => {
              const active = dates.has(day.key)
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setDates((current) => toggle(current, day.key))}
                  className={`rounded-[var(--r-sm)] border px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                      : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:bg-[var(--c-surface)]'
                  }`}
                >
                  {day.label}
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
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => setTimes((current) => toggle(current, time))}
                  className={`rounded-[var(--r-sm)] border px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active
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

        <div className="mt-1 flex flex-col gap-2">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onSubmit([...dates], [...times])}
            className="min-h-12 rounded-full bg-[var(--c-aqua)] font-bold text-white transition-opacity hover:opacity-90 disabled:bg-slate-400 disabled:opacity-100"
          >
            Abrir horario(s)
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
