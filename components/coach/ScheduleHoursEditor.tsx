'use client'

import { useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import {
  addDays,
  dateFromKey,
  dateKey,
  HOUR_OPTIONS,
  startOfWeek,
  WEEKDAY_LABELS,
} from '@/lib/coach-offerings'

export type HoursMode = 'add' | 'remove'

function todayKey() {
  return dateKey(new Date())
}

/**
 * Quitar/Agregar editor for a coach's available hours. Multi-select days (across
 * weeks) + hours, then add or remove that (day × hour) grid from the offering.
 */
export default function ScheduleHoursEditor({
  defaultDate,
  busy,
  onClose,
  onSubmit,
}: {
  defaultDate?: string
  busy: boolean
  onClose: () => void
  onSubmit: (mode: HoursMode, dates: string[], times: string[]) => void
}) {
  const initialKey = defaultDate || todayKey()
  const [mode, setMode] = useState<HoursMode>('add')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(dateFromKey(initialKey)))
  const [dates, setDates] = useState<Set<string>>(
    () => new Set(defaultDate && defaultDate >= todayKey() ? [defaultDate] : [])
  )
  const [times, setTimes] = useState<Set<string>>(() => new Set())

  const visibleWeekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    return { key: dateKey(date), date }
  })

  const toggle = (set: Set<string>, value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const canSubmit = dates.size > 0 && times.size > 0 && !busy
  const isRemove = mode === 'remove'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editar horas"
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
            <h3 className="text-xl font-bold text-[var(--c-ocean)]">Editar horas</h3>
            <p className="mt-1 text-sm text-[var(--c-text-2)]">
              Selecciona días y horas, luego elige si las agregas o las quitas. Puedes seleccionar
              días de otras semanas para repetir los mismos horarios.
            </p>
          </div>

          {/* Quitar / Agregar toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--c-border)] bg-[var(--c-bg)] p-1">
            <button
              type="button"
              onClick={() => setMode('add')}
              className={`min-h-9 rounded-full text-sm font-bold transition-colors ${
                !isRemove
                  ? 'bg-[var(--c-aqua)] text-white'
                  : 'text-[var(--c-text-2)] hover:bg-[var(--c-surface)]'
              }`}
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => setMode('remove')}
              className={`min-h-9 rounded-full text-sm font-bold transition-colors ${
                isRemove
                  ? 'bg-rose-500 text-white'
                  : 'text-[var(--c-text-2)] hover:bg-[var(--c-surface)]'
              }`}
            >
              Quitar
            </button>
          </div>
          <p className="-mt-2 text-xs text-[var(--c-text-2)]">
            {isRemove
              ? 'Se quitan las horas disponibles o bloqueadas. Las ocupadas no: primero cancela la clase.'
              : 'Se agregan las horas seleccionadas. Si ya existe ese horario no se duplica.'}
          </p>

          {/* Días */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--c-text-2)]">
                Días
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeekStart(startOfWeek(new Date()))}
                  className="rounded-full border border-[var(--c-border)] bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)]"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  aria-label="Semana anterior"
                  onClick={() => setWeekStart((current) => addDays(current, -7))}
                  className="grid h-8 w-8 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
                >
                  <FiChevronLeft aria-hidden="true" />
                </button>
                <span className="min-w-[7.5rem] text-center text-xs font-bold text-[var(--c-ocean)]">
                  {visibleWeekDays[0].date.toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  -{' '}
                  {visibleWeekDays[6].date.toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })}
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
              {visibleWeekDays.map(({ key, date }) => {
                const active = dates.has(key)
                const disabled = key < todayKey()
                const isWeekend = [0, 6].includes(date.getDay())
                const isToday = key === todayKey()
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setDates((current) => toggle(current, key))}
                    className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-[var(--r-sm)] border px-1.5 py-1.5 text-center text-xs font-bold leading-tight transition-colors ${
                      disabled
                        ? 'cursor-not-allowed border-[var(--c-border)] bg-slate-100 text-slate-400'
                        : active
                          ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                          : `border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)] ${isWeekend ? 'bg-[var(--c-surface)]' : 'bg-white'}`
                    } ${isToday ? 'ring-2 ring-[var(--c-aqua)] ring-offset-1' : ''}`}
                  >
                    <span>{WEEKDAY_LABELS[date.getDay()]}</span>
                    <span className="text-sm">{date.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Horas */}
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
        </div>

        <div className="flex shrink-0 flex-col gap-2 bg-white p-5 pt-4">
          {dates.size > 0 && times.size > 0 && (
            <p className="text-center text-sm font-semibold text-[var(--c-text-2)]">
              {dates.size} {dates.size === 1 ? 'día' : 'días'} · {times.size}{' '}
              {times.size === 1 ? 'clase' : 'clases'} por día ·{' '}
              <span className="text-[var(--c-ocean)]">{dates.size * times.size} en total</span>
            </p>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onSubmit(mode, [...dates], [...times])}
            className={`min-h-12 rounded-full font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
              isRemove ? 'bg-rose-500' : 'bg-[var(--c-aqua)]'
            }`}
          >
            {isRemove ? 'Quitar horarios' : 'Agregar horarios'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full px-4 text-sm font-bold text-[var(--c-text-2)] hover:text-[var(--c-ocean)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
