'use client'

import { useKeyboardSafeArea } from '@comps/hooks/useKeyboardSafeArea'
import { MoneyField, TextField } from '@comps/Inputs/FormFields'
import { useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiPlus, FiX } from 'react-icons/fi'
import { addDays, dateFromKey, dateKey, startOfWeek, WEEKDAY_LABELS } from '@/lib/coach-offerings'

export interface AgendaWeekDay {
  key: string
  label: string
}

export interface OpenHoursDetails {
  title: string
  placeName: string
  priceCents: number | null
  groupType: 'particular' | 'grupal'
}

const HALF_HOUR_OPTIONS = Array.from({ length: 32 }, (_, index) => {
  const totalMinutes = (index + 12) * 30
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
})

function buildWeekDays(start: Date): AgendaWeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index)
    return {
      key: dateKey(date),
      label: `${WEEKDAY_LABELS[date.getDay()]}|${date.getDate()}`,
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
  detailsOnly = false,
  title = 'Abrir horarios',
  description = 'Publica las horas que quieres ofrecer. Aplica a uno o varios días.',
  submitLabel = 'Abrir horario(s)',
  error,
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
  /** Only show the "Opciones de la clase" form; keep the schedule (dates/times) intact. */
  detailsOnly?: boolean
  title?: string
  description?: string
  submitLabel?: string
  error?: string | null
  initialDates?: string[]
  initialTimes?: string[]
  initialDetails?: OpenHoursDetails
  onClose: () => void
  onSubmit: (dates: string[], times: string[], details?: OpenHoursDetails) => void
}) {
  const initialKey = defaultDate || initialDates[0] || dateKey(new Date())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(dateFromKey(initialKey)))
  const [dates, setDates] = useState<Set<string>>(
    () => new Set(initialDates.length ? initialDates : defaultDate ? [defaultDate] : [])
  )
  const [times, setTimes] = useState<Set<string>>(() => new Set(initialTimes))
  const [detailTitle, setDetailTitle] = useState(initialDetails?.title || '')
  const [placeName, setPlaceName] = useState(initialDetails?.placeName || '')
  const [priceCents, setPriceCents] = useState<number | null>(initialDetails?.priceCents ?? null)
  const [groupType, setGroupType] = useState<'particular' | 'grupal'>(
    initialDetails?.groupType ?? 'particular'
  )
  const [hoursModalOpen, setHoursModalOpen] = useState(false)
  const keyboardSafeArea = useKeyboardSafeArea()
  const visibleWeekDays = buildWeekDays(weekStart)

  const toggle = (set: Set<string>, value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const selectedDates = [...dates]
  const canSubmit = detailsOnly ? !busy : dates.size > 0 && times.size > 0 && !busy
  const showDetailsForm = showDetails || detailsOnly
  const dialogClassName = `fixed inset-0 z-50 flex justify-center bg-[rgba(10,37,64,0.55)] p-4 backdrop-blur-sm ${
    showDetailsForm ? 'items-center overflow-y-auto' : 'items-end sm:items-center'
  }`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Abrir horarios"
      className={dialogClassName}
      style={
        showDetailsForm && keyboardSafeArea
          ? { paddingBottom: `calc(${keyboardSafeArea}px + 1rem)` }
          : undefined
      }
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

          {!detailsOnly && (
            <>
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
                    const past = isPastDay(day.key)
                    const isWeekend = [0, 6].includes(dateFromKey(day.key).getDay())
                    const [weekday, dayNumber] = day.label.split('|')
                    return (
                      <button
                        key={day.key}
                        type="button"
                        onClick={() => setDates((current) => toggle(current, day.key))}
                        className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-[var(--r-sm)] border px-1.5 py-1.5 text-center text-xs font-bold leading-tight transition-colors ${
                          active
                            ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                            : past
                              ? 'cursor-pointer border-dashed border-[var(--c-border)] bg-slate-100 text-slate-500 hover:bg-[var(--c-surface)]'
                              : `cursor-pointer border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)] ${isWeekend ? 'bg-[var(--c-surface)]' : 'bg-white'}`
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
                  {[...times].sort().map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setTimes((current) => toggle(current, time))}
                      className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--c-ocean)] bg-[var(--c-ocean)] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      aria-label={`Quitar hora ${time}`}
                    >
                      {time} <FiX aria-hidden="true" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setHoursModalOpen(true)}
                    className="grid h-10 w-12 place-items-center rounded-[var(--r-sm)] border border-dashed border-[var(--c-aqua)] bg-white text-xl font-semibold text-[var(--c-aqua-strong)] transition-colors hover:bg-[var(--c-aqua-light)]"
                    aria-label="Agregar horas"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
                {times.size === 0 && (
                  <p className="text-xs text-[var(--c-text-2)]">Agrega una o más horas con +.</p>
                )}
              </div>
            </>
          )}

          {showDetailsForm && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="block text-sm font-semibold text-[var(--c-ocean)]">
                  Tipo de clase
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={groupType === 'grupal'}
                  onClick={() =>
                    setGroupType((current) => (current === 'grupal' ? 'particular' : 'grupal'))
                  }
                  className="mt-2 flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3.5 py-2 text-left transition-colors hover:bg-[var(--c-surface)]"
                >
                  <span className="text-sm font-semibold text-[var(--c-ocean)]">
                    {groupType === 'grupal' ? 'Clase grupal' : 'Clase particular'}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      groupType === 'grupal' ? 'bg-[var(--c-aqua)]' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        groupType === 'grupal' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </span>
                </button>
                <p className="mt-1.5 text-xs text-[var(--c-text-2)]">
                  {groupType === 'grupal'
                    ? 'Permite agregar más de un alumno; no se muestra bloqueada aunque ya tengas esa clase asignada.'
                    : 'Solo permite agregar una persona; se bloqueará si intentas agregar a alguien más o desde la vista de compartir.'}
                </p>
              </div>
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
              />
              <TextField
                label="Descripción (opcional)"
                placeholder="Ej. Clase de técnica libre"
                value={detailTitle}
                onChange={(event) => setDetailTitle(event.target.value)}
                className="sm:col-span-2"
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 bg-white p-5 pt-4">
          {error && <p className="text-sm font-semibold text-[var(--c-error,#b91c1c)]">{error}</p>}
          {!detailsOnly && dates.size > 0 && times.size > 0 && (
            <p className="text-center text-sm font-semibold text-[var(--c-text-2)]">
              {dates.size} {dates.size === 1 ? 'día' : 'días'} · {times.size}{' '}
              {times.size === 1 ? 'horario' : 'horarios'} ·{' '}
              <span className="text-[var(--c-ocean)]">{dates.size * times.size} clases</span>
            </p>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSubmit(
                detailsOnly ? initialDates : [...dates],
                detailsOnly ? initialTimes : [...times],
                showDetailsForm
                  ? {
                      title: detailTitle.trim(),
                      placeName: placeName.trim(),
                      priceCents,
                      groupType,
                    }
                  : undefined
              )
            }
            className="min-h-12 rounded-full bg-[var(--c-aqua-strong)] font-bold text-white transition-colors hover:bg-[var(--c-ocean-mid)] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-100"
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
      {hoursModalOpen && (
        <HourPickerModal
          existingTimes={times}
          selectedDates={selectedDates}
          busy={busy}
          onClose={() => setHoursModalOpen(false)}
          onSubmit={(newTimes) => {
            setTimes((current) => new Set([...current, ...newTimes]))
            setHoursModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

function HourPickerModal({
  existingTimes,
  selectedDates,
  busy,
  onClose,
  onSubmit,
}: {
  existingTimes: Set<string>
  selectedDates: string[]
  busy: boolean
  onClose: () => void
  onSubmit: (times: string[]) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggleTime = (time: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(time)) next.delete(time)
      else next.add(time)
      return next
    })
  }
  const disabledTime = (time: string) => existingTimes.has(time)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agregar horas"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(10,37,64,0.55)] p-4 backdrop-blur-sm sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="flex max-h-[min(92dvh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-[var(--r-md)] bg-white shadow-[var(--shadow-md)]">
        <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-3">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--c-border)] sm:hidden" />
          <h3 className="text-xl font-bold text-[var(--c-ocean)]">Agregar horas</h3>
          <p className="mt-1 text-sm text-[var(--c-text-2)]">
            Selecciona una o más horas. Sólo se permiten horas cerradas y medias horas.
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {HALF_HOUR_OPTIONS.map((time) => {
              const disabled = disabledTime(time)
              const past =
                selectedDates.length > 0 &&
                selectedDates.every((date) => isPastDateTime(date, time))
              const active = selected.has(time)
              return (
                <button
                  key={time}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleTime(time)}
                  className={`min-h-11 rounded-[var(--r-sm)] border text-sm font-semibold transition-colors ${
                    disabled
                      ? 'cursor-not-allowed border-[var(--c-border)] bg-slate-100 text-slate-400'
                      : active
                        ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                        : past
                          ? 'cursor-pointer border-dashed border-[var(--c-border)] bg-slate-100 text-slate-500 hover:bg-[var(--c-surface)]'
                          : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:bg-[var(--c-surface)]'
                  }`}
                >
                  {time}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 bg-white p-5 pt-4">
          <button
            type="button"
            disabled={selected.size === 0 || busy}
            onClick={() => onSubmit([...selected].sort())}
            className="min-h-12 rounded-full bg-[var(--c-aqua-strong)] font-bold text-white transition-colors hover:bg-[var(--c-ocean-mid)] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-100"
          >
            Agregar horas
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
