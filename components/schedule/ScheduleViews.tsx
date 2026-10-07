'use client'

import { type ReactNode, useState } from 'react'
import { FiUser, FiUsers } from 'react-icons/fi'
import CoachAgendaDateSelector from '@/components/coach/CoachAgendaDateSelector'
import ScheduleTag from '@/components/ui/schedule-tag'
import Sheet from '@/components/ui/sheet'
import type { HourStatus } from '@/lib/coach-agenda-status'

export interface ScheduleViewSlot {
  key: string
  date: string
  startTime: string
  label: string
  coachName?: string
  unassigned?: boolean
  groupType: 'particular' | 'grupal'
  selected?: boolean
  disabled?: boolean
  enrolledCount?: number
  bookingStatus?: 'pending' | 'confirmed'
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
  const [optionGroup, setOptionGroup] = useState<{ date: string; time: string } | null>(null)
  const groupOptions = optionGroup
    ? slots.filter((slot) => slot.date === optionGroup.date && slot.startTime === optionGroup.time)
    : []
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
                if (!options.length && date !== today) return null
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
                    <div
                      className={`flex flex-wrap gap-2 ${!options.length ? 'self-stretch items-center' : ''}`}
                    >
                      {!options.length && (
                        <p className="text-center text-xs text-(--c-ocean)">
                          Sin horarios para hoy
                        </p>
                      )}
                      {[...new Set(options.map((slot) => slot.startTime))].sort().map((time) => {
                        const choices = options.filter((slot) => slot.startTime === time)
                        const selected = choices.some((slot) => slot.selected)
                        const hasGroup = choices.some((slot) => slot.groupType === 'grupal')
                        const enrolledCount = choices.reduce(
                          (total, slot) => total + (slot.enrolledCount || 0),
                          0
                        )
                        return (
                          <button
                            key={time}
                            type="button"
                            aria-label={`${date} · ${time}${choices.length > 1 ? ` · ${choices.length} opciones de clase` : ` · ${choices[0].label}`}`}
                            aria-pressed={selected}
                            aria-haspopup={choices.length > 1 ? 'dialog' : undefined}
                            disabled={disabled || choices.every((slot) => slot.disabled)}
                            onClick={() =>
                              choices.length > 1
                                ? setOptionGroup({ date, time })
                                : onSelectSlot(choices[0].key)
                            }
                            style={
                              hasGroup && !selected
                                ? { backgroundColor: '#eff6ff', borderColor: '#60a5fa' }
                                : undefined
                            }
                            className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50 ${selected ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : hasGroup ? 'border-blue-300 bg-blue-50 text-(--c-ocean) hover:bg-blue-100' : 'border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface)'} ${hasGroup ? 'pt-1' : ''}`}
                          >
                            {(hasGroup || enrolledCount > 0) && (
                              <span className="mb-0.5 flex items-center justify-end gap-1">
                                {enrolledCount > 0 && (
                                  <span
                                    className="font-light"
                                    role="img"
                                    aria-label={`${enrolledCount} inscritos`}
                                  >
                                    ({enrolledCount})
                                  </span>
                                )}
                                <span
                                  role="img"
                                  aria-label={hasGroup ? 'Grupal' : 'Particular'}
                                  className={
                                    hasGroup
                                      ? 'inline-flex rounded-full bg-blue-100 p-1 text-blue-700'
                                      : 'inline-flex'
                                  }
                                >
                                  {hasGroup ? (
                                    <FiUsers aria-hidden="true" size={12} />
                                  ) : (
                                    <FiUser aria-hidden="true" size={12} />
                                  )}
                                </span>
                              </span>
                            )}
                            {time}
                            {choices.length > 1 ? ` (${choices.length})` : ''}
                            {choices.some((slot) => slot.bookingStatus) && (
                              <span className="mt-1 block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-950">
                                {choices.some((slot) => slot.bookingStatus === 'pending')
                                  ? 'Pendiente de aprobación'
                                  : 'Inscrito'}
                              </span>
                            )}
                          </button>
                        )
                      })}
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
      <Sheet
        open={optionGroup !== null}
        onClose={() => setOptionGroup(null)}
        label="Escoger clase"
        keyboardAware
        fullBleedMobile
      >
        <div className="grid gap-3 px-4 pb-3 sm:px-0">
          <h2 className="text-xl font-bold">Clases disponibles · {optionGroup?.time}</h2>
          {optionGroup && (
            <p className="text-sm text-(--c-text-2)">
              {new Date(`${optionGroup.date}T12:00:00`).toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          )}
          <p className="text-sm text-(--c-text-2)">Elige una sola clase para este horario.</p>
          {groupOptions.map((slot) => (
            <button
              key={slot.key}
              type="button"
              disabled={disabled || slot.disabled}
              aria-pressed={slot.selected}
              onClick={() => {
                setOptionGroup(null)
                onSelectSlot(slot.key)
              }}
              className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border border-(--c-border) p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50 ${slot.selected ? 'bg-(--c-ocean) text-white' : 'bg-white text-(--c-ocean) hover:bg-(--c-surface)'}`}
            >
              <ScheduleTag
                time={slot.startTime}
                coachName={slot.coachName}
                unassigned={slot.unassigned}
                groupType={slot.groupType}
                selected={slot.selected}
                enrolledCount={slot.enrolledCount}
              />
              <span className="shrink-0 text-xs font-bold">
                {slot.bookingStatus === 'pending'
                  ? 'Pendiente de aprobación'
                  : slot.bookingStatus === 'confirmed'
                    ? 'Inscrito'
                    : slot.selected
                      ? 'Seleccionada'
                      : 'Elegir'}
              </span>
            </button>
          ))}
          {!groupOptions.length && (
            <p className="text-sm">Estas opciones ya no están disponibles.</p>
          )}
        </div>
      </Sheet>
    </div>
  )
}
