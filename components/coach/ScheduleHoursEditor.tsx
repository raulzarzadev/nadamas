'use client'

import InfoModal from '@comps/ui/info-modal'
import Sheet from '@comps/ui/sheet'
import { useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiInfo, FiPlus, FiX } from 'react-icons/fi'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import {
  addDays,
  dateFromKey,
  dateKey,
  existingOccurrenceCount,
  existingTimesForSelectedDates,
  startOfWeek,
  WEEKDAY_LABELS,
} from '@/lib/coach-offerings'
import { capitalizeSchoolTerm } from '@/lib/school'
import HourPickerModal from './HourPickerModal'

export type HoursMode = 'add' | 'remove'
export interface ScheduleCoachOption {
  id: string
  name: string
}

function todayKey() {
  return dateKey(new Date())
}

/**
 * Quitar/Agregar editor for a coach's available hours. Multi-select days (across
 * weeks) + hours, then add or remove that (day × hour) grid from the offering.
 */
export default function ScheduleHoursEditor({
  defaultDate,
  existingTimesByDate,
  busy,
  error,
  onClose,
  onSubmit,
  coachOptions = [],
  selectedCoachId,
  onCoachChange,
  onWeekChange,
  targetOptions = [],
  selectedTarget,
  onTargetChange,
}: {
  defaultDate?: string
  existingTimesByDate: Record<string, string[]>
  busy: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (mode: HoursMode, dates: string[], times: string[]) => void
  coachOptions?: ScheduleCoachOption[]
  selectedCoachId?: string
  onCoachChange?: (coachId: string) => void
  onWeekChange?: (weekStart: Date) => void
  /** Destination selector (personal vs school): hours are saved to the selected target. */
  targetOptions?: Array<{ id: string; label: string }>
  selectedTarget?: string
  onTargetChange?: (target: string) => void
}) {
  const terminology = useSchoolTerminology()
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'
  const initialKey = defaultDate || todayKey()
  const [mode, setMode] = useState<HoursMode>('add')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(dateFromKey(initialKey)))
  const [dates, setDates] = useState<Set<string>>(() => new Set(defaultDate ? [defaultDate] : []))
  const [times, setTimes] = useState<Set<string>>(() => new Set())
  const [hoursModalOpen, setHoursModalOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    if (mode !== 'remove') return
    setTimes(new Set(existingTimesForSelectedDates(existingTimesByDate, dates)))
  }, [dates, existingTimesByDate, mode])

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

  const coachSelectionRequired = coachOptions.length > 0 && !selectedCoachId
  const canSubmit = dates.size > 0 && times.size > 0 && !busy && !coachSelectionRequired
  const isRemove = mode === 'remove'
  const removalCount = existingOccurrenceCount(existingTimesByDate, dates, times)

  return (
    <Sheet open onClose={onClose} label="Editar horas" keyboardAware fullBleedMobile>
      <div className="flex max-h-[calc(var(--sheet-viewport-height,100dvh)-0.5rem)] w-full flex-col overflow-hidden sm:max-h-[min(calc(var(--sheet-viewport-height,100dvh)-2rem),44rem)]">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pb-3 sm:px-0 sm:pb-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-[var(--c-ocean)]">Editar horas</h3>
              <button
                type="button"
                onClick={() => setInfoOpen((open) => !open)}
                aria-expanded={infoOpen}
                aria-label="Cómo editar horas"
                title="Más información"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-[var(--c-aqua-strong)] transition hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
              >
                <FiInfo aria-hidden="true" />
              </button>
            </div>
            <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} label="Cómo editar horas">
              <p>
                Selecciona días y horas, luego elige si las agregas o las quitas. Puedes seleccionar
                días de otras semanas para repetir los mismos horarios.
              </p>
            </InfoModal>
          </div>

          {targetOptions.length > 0 && onTargetChange && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-bold uppercase tracking-wide text-[var(--c-text-2)]">
                Dónde se agregan
              </legend>
              <div className="flex flex-wrap gap-2">
                {targetOptions.map((option) => {
                  const selected = option.id === selectedTarget
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={busy}
                      onClick={() => {
                        if (!selected) onTargetChange(option.id)
                      }}
                      className={`min-h-11 shrink-0 rounded-full border px-5 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-60 ${
                        selected
                          ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                          : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:border-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)]'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-[var(--c-text-2)]">
                Los horarios se guardarán en{' '}
                {targetOptions.find((option) => option.id === selectedTarget)?.label || 'Míos'}.
              </p>
            </fieldset>
          )}

          {coachOptions.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-bold uppercase tracking-wide text-[var(--c-text-2)]">
                {capitalizeSchoolTerm(coachSingular)}
              </legend>
              <div className="flex flex-wrap gap-2">
                {coachOptions.map((coach) => {
                  const selected = coach.id === selectedCoachId
                  return (
                    <button
                      key={coach.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={busy || !onCoachChange}
                      onClick={() => onCoachChange?.(coach.id)}
                      className={`min-h-11 rounded-full border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-60 ${
                        selected
                          ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                          : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:bg-[var(--c-surface)]'
                      }`}
                    >
                      {coach.name}
                    </button>
                  )
                })}
              </div>
              {coachSelectionRequired && (
                <p className="text-xs text-[var(--c-text-2)]">
                  Elige {coachSingular} para editar sus horarios.
                </p>
              )}
            </fieldset>
          )}

          {/* Quitar / Agregar toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--c-border)] bg-[var(--c-bg)] p-1">
            <button
              type="button"
              onClick={() => {
                setMode('add')
                setTimes(new Set())
              }}
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
              ? 'En un horario recurrente se quita ese día de la semana; en horarios por fecha solo se quitan las fechas elegidas. Las horas ocupadas se conservan.'
              : 'Se agregan las horas seleccionadas. Si ya existe ese horario no se duplica.'}
          </p>

          {/* Días */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--c-text-2)]">
                Días
              </span>
              <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextWeekStart = startOfWeek(new Date())
                    setWeekStart(nextWeekStart)
                    onWeekChange?.(nextWeekStart)
                  }}
                  className="rounded-full border border-[var(--c-border)] bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)]"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  aria-label="Semana anterior"
                  onClick={() => {
                    const nextWeekStart = addDays(weekStart, -7)
                    setWeekStart(nextWeekStart)
                    onWeekChange?.(nextWeekStart)
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
                >
                  <FiChevronLeft aria-hidden="true" />
                </button>
                <span className="min-w-0 whitespace-nowrap text-center text-xs font-bold text-[var(--c-ocean)]">
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
                  onClick={() => {
                    const nextWeekStart = addDays(weekStart, 7)
                    setWeekStart(nextWeekStart)
                    onWeekChange?.(nextWeekStart)
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
                >
                  <FiChevronRight aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {visibleWeekDays.map(({ key, date }) => {
                const active = dates.has(key)
                const past = key < todayKey()
                const isWeekend = [0, 6].includes(date.getDay())
                const isToday = key === todayKey()
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDates((current) => toggle(current, key))}
                    className={`flex min-h-12 min-w-0 flex-col items-center justify-center rounded-[var(--r-sm)] border px-1.5 py-1.5 text-center text-xs font-bold leading-tight transition-colors ${
                      active
                        ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                        : past
                          ? 'cursor-pointer border-dashed border-[var(--c-border)] bg-slate-100 text-slate-500 hover:bg-[var(--c-surface)]'
                          : `cursor-pointer border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)] ${isWeekend ? 'bg-[var(--c-surface)]' : 'bg-white'}`
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
              {[...times].sort().map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setTimes((current) => toggle(current, time))}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--r-sm)] border border-[var(--c-ocean)] bg-[var(--c-ocean)] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                  aria-label={`Excluir ${time} de la selección`}
                >
                  {time} <FiX aria-hidden="true" />
                </button>
              ))}
              {!isRemove && (
                <button
                  type="button"
                  onClick={() => setHoursModalOpen(true)}
                  className="grid h-10 w-12 cursor-pointer place-items-center rounded-[var(--r-sm)] border border-dashed border-[var(--c-aqua)] bg-white text-xl font-semibold text-[var(--c-aqua-strong)] transition-colors hover:bg-[var(--c-aqua-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                  aria-label="Agregar horas"
                >
                  <FiPlus aria-hidden="true" />
                </button>
              )}
            </div>
            {times.size === 0 && (
              <p className="text-xs text-[var(--c-text-2)]">
                {isRemove
                  ? 'No hay horarios disponibles o bloqueados en los días seleccionados.'
                  : 'Agrega una o más horas con +.'}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 bg-white px-4 pb-3 pt-4 sm:px-0 sm:pb-0">
          {error && <p className="text-sm font-semibold text-[var(--c-error,#b91c1c)]">{error}</p>}
          {dates.size > 0 && times.size > 0 && (
            <p className="text-center text-sm font-semibold text-[var(--c-text-2)]">
              {isRemove ? (
                <span className="text-[var(--c-ocean)]">
                  {removalCount}{' '}
                  {removalCount === 1 ? 'horario seleccionado' : 'horarios seleccionados'}
                </span>
              ) : (
                <>
                  {dates.size} {dates.size === 1 ? 'día' : 'días'} · {times.size}{' '}
                  {times.size === 1 ? 'clase' : 'clases'} por día ·{' '}
                  <span className="text-[var(--c-ocean)]">{dates.size * times.size} en total</span>
                </>
              )}
            </p>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onSubmit(mode, [...dates], [...times])}
            className={`min-h-12 rounded-full font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
              isRemove
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-[var(--c-aqua-strong)] hover:bg-[var(--c-ocean-mid)]'
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
      {hoursModalOpen && (
        <HourPickerModal
          existingTimes={times}
          busy={busy}
          error={error}
          onClose={() => setHoursModalOpen(false)}
          onSubmit={(newTimes) => {
            setTimes((current) => new Set([...current, ...newTimes]))
            setHoursModalOpen(false)
          }}
        />
      )}
    </Sheet>
  )
}
