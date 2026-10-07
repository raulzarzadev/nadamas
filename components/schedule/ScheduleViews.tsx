'use client'

import { type ReactNode, useState } from 'react'
import CoachAgendaDateSelector from '@/components/coach/CoachAgendaDateSelector'
import type { HourStatus } from '@/lib/coach-agenda-status'

export interface ScheduleViewSlot {
  key: string
  date: string
  startTime: string
  label: string
  groupType: 'particular' | 'grupal'
  selected?: boolean
  disabled?: boolean
}

function dayKey(day: Date) {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}

/** Shared presentation; callers retain booking, assignment and selection logic. */
export default function ScheduleViews({
  title,
  description,
  selectedDate,
  days,
  today,
  dayStatuses,
  selectedStatuses,
  onToggleStatus,
  onSelectDate,
  onChangeWeek,
  slots,
  onSelectSlot,
  loading = false,
  disabled = false,
  children,
  horizontalDetails,
  monthCount,
  weekCount,
}: {
  title?: ReactNode
  description?: ReactNode
  selectedDate: string
  days: Date[]
  today: string
  dayStatuses: Map<string, HourStatus[]>
  selectedStatuses: Set<HourStatus>
  onToggleStatus: (status: HourStatus) => void
  onSelectDate: (date: string) => void
  onChangeWeek: (delta: number) => void
  slots: ScheduleViewSlot[]
  onSelectSlot: (key: string) => void
  loading?: boolean
  disabled?: boolean
  children: ReactNode
  horizontalDetails?: ReactNode
  monthCount?: string
  weekCount?: string
}) {
  const [view, setView] = useState<'vertical' | 'horizontal'>('vertical')
  const weekSlots = slots.filter((slot) => days.some((day) => dayKey(day) === slot.date))
  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title || <span />}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold text-(--c-text-2)">Vista</span>
          <fieldset
            aria-label="Visualización de horarios"
            className="inline-flex rounded-full border border-(--c-border) bg-(--c-surface) p-0.5"
          >
            {(['vertical', 'horizontal'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Vista ${option}`}
                title={`Vista ${option}`}
                aria-pressed={view === option}
                onClick={() => setView(option)}
                className={`grid size-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${view === option ? 'bg-(--c-ocean) text-white' : 'text-(--c-ocean) hover:bg-white'}`}
              >
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  {option === 'vertical' ? (
                    <path d="M5 4v12M10 4v12M15 4v12" />
                  ) : (
                    <path d="M4 7h12M4 13h12" />
                  )}
                </svg>
              </button>
            ))}
          </fieldset>
        </div>
      </div>
      {description}
      {view === 'vertical' ? (
        <>
          <CoachAgendaDateSelector
            selectedDate={selectedDate}
            monthCount={monthCount}
            weekCount={weekCount}
            weekDates={days}
            dayStatuses={dayStatuses}
            selectedStatuses={selectedStatuses}
            onToggleStatus={onToggleStatus}
            onSelectDate={onSelectDate}
            onChangeWeek={onChangeWeek}
          />
          {children}
        </>
      ) : (
        <>
          <CoachAgendaDateSelector
            navigationOnly
            selectedDate={selectedDate}
            weekDates={days}
            dayStatuses={dayStatuses}
            selectedStatuses={selectedStatuses}
            onToggleStatus={onToggleStatus}
            onSelectDate={onSelectDate}
            onChangeWeek={onChangeWeek}
          />
          <div className="grid gap-1 rounded-2xl border border-(--c-border) bg-(--c-surface) p-3 sm:p-4">
            {loading ? (
              <p className="text-sm" role="status">
                Cargando horarios…
              </p>
            ) : (
              days.map((day) => {
                const date = dayKey(day)
                const options = weekSlots.filter((slot) => slot.date === date)
                if (!options.length) return null
                return (
                  <div
                    key={date}
                    className={`grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-2 rounded-xl p-2 ${date === today ? 'bg-cyan-300' : ''}`}
                  >
                    <div>
                      {date === today && (
                        <span className="mb-1 inline-flex rounded-full bg-(--c-ocean) px-2 py-0.5 text-[9px] font-bold leading-none text-white">
                          Hoy
                        </span>
                      )}
                      <h3 className="text-sm font-bold capitalize">
                        {day.toLocaleDateString('es-MX', { weekday: 'long' })}
                      </h3>
                      <p className="text-xs text-(--c-text-2)">
                        {day.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set(options.map((slot) => slot.startTime))].sort().map((time) => (
                        <div
                          key={time}
                          className="flex gap-1 rounded-xl border border-(--c-border) bg-white p-1"
                        >
                          {options
                            .filter((slot) => slot.startTime === time)
                            .map((slot) => (
                              <button
                                key={slot.key}
                                type="button"
                                title={slot.label}
                                aria-label={slot.label}
                                aria-pressed={slot.selected}
                                disabled={disabled || slot.disabled}
                                onClick={() => onSelectSlot(slot.key)}
                                className={`min-h-9 rounded-xl px-2 py-1 text-xs font-bold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50 ${slot.selected ? 'bg-(--c-ocean) text-white ring-1 ring-(--c-ocean)' : 'bg-white text-(--c-ocean) hover:bg-(--c-surface)'}`}
                              >
                                {time}
                              </button>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
            {!loading && !weekSlots.length && (
              <p className="text-sm text-(--c-text-2)">
                No hay horarios disponibles esta semana. Elige otra semana.
              </p>
            )}
          </div>
          {horizontalDetails}
        </>
      )}
    </div>
  )
}
