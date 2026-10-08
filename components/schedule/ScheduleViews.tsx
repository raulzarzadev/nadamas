'use client'

import { type ReactNode, useState } from 'react'
import { FaPersonSwimming } from 'react-icons/fa6'
import { FiUsers } from 'react-icons/fi'
import CoachAgendaDateSelector from '@/components/coach/CoachAgendaDateSelector'
import Avatar from '@/components/ui/avatar'
import StatusBadge from '@/components/ui/status-badge'
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
  bookingStatus?: 'pending' | 'confirmed' | 'cancelled'
  pendingApproval?: boolean
  blocked?: boolean
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
  showStudentCounts = true,
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
  showStudentCounts?: boolean
  children: ReactNode
  horizontalDetails?: ReactNode
  monthCount?: string
  weekCount?: string
}) {
  const [view, setView] = useState<'vertical' | 'horizontal'>('horizontal')
  const weekSlots = slots.filter((slot) => days.some((day) => dayKey(day) === slot.date))
  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap">
        <div className="ml-auto shrink-0">{title}</div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold text-(--c-text-2)">Vista</span>
          <fieldset
            aria-label="Visualización de horarios"
            className="inline-flex rounded-full border border-(--c-border) bg-(--c-surface) p-0.5"
          >
            {(['horizontal', 'vertical'] as const).map((option) => (
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
          <div className="@container grid gap-1 rounded-2xl bg-(--c-surface)">
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
                    className={`grid grid-cols-1 items-start gap-2 rounded-xl p-2 @min-[420px]:grid-cols-[5.5rem_minmax(0,1fr)] ${date === today ? 'bg-cyan-300' : ''}`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 @min-[420px]:block">
                      <h3 className="text-sm font-bold capitalize">
                        {day.toLocaleDateString('es-MX', { weekday: 'long' })}
                      </h3>
                      <p className="text-xs text-(--c-text-2)">
                        <span className="@min-[420px]:hidden">
                          {day.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
                        </span>
                        <span className="hidden @min-[420px]:inline">
                          {day.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                        </span>
                      </p>
                      {date === today && (
                        <span className="ml-auto inline-flex @min-[420px]:ml-0 rounded-full bg-(--c-ocean) @min-[420px]:mb-1 px-2 py-0.5 text-[9px] font-bold leading-none text-white">
                          Hoy
                        </span>
                      )}
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
                        return (
                          <div
                            key={time}
                            className={`flex flex-col gap-1 ${choices.length > 1 ? 'rounded-xl border border-dashed border-(--c-ocean)/40 p-1' : 'py-1'}`}
                          >
                            <span className="text-sm font-extrabold tabular-nums">{time}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {choices.map((slot) => (
                                <button
                                  key={slot.key}
                                  type="button"
                                  aria-label={`${date} · ${time} · ${slot.coachName || 'Sin profe aún'} · ${slot.groupType}${slot.bookingStatus ? ` · ${slot.bookingStatus === 'pending' ? 'Pendiente' : slot.bookingStatus === 'confirmed' ? 'Inscrito' : 'Cancelada'}` : ''}`}
                                  aria-pressed={Boolean(slot.selected)}
                                  disabled={disabled || slot.disabled}
                                  onClick={() => onSelectSlot(slot.key)}
                                  className={`relative flex min-h-9 min-w-20 flex-col gap-1 rounded-lg border px-1.5 py-1 text-xs before:absolute before:-inset-y-1 before:inset-x-0 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:opacity-50 ${slot.selected ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : slot.blocked ? 'border-slate-400 bg-slate-200 text-slate-600 hover:bg-slate-300' : (slot.enrolledCount || 0) > 0 ? (slot.groupType === 'grupal' ? 'border-blue-400 bg-blue-200 text-(--c-ocean) hover:bg-blue-300' : 'border-emerald-400 bg-emerald-200 text-(--c-ocean) hover:bg-emerald-300') : 'border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface)'}`}
                                >
                                  <span className="flex w-full items-center justify-between gap-2">
                                    {slot.unassigned ? (
                                      <span
                                        aria-hidden="true"
                                        className="size-5 shrink-0 rounded-full border border-(--c-border) bg-white"
                                      />
                                    ) : (
                                      <Avatar
                                        name={slot.coachName || 'Profe'}
                                        size={20}
                                        tone="white"
                                      />
                                    )}
                                    <span className="inline-flex items-center gap-1">
                                      {showStudentCounts && (
                                        <span>{slot.enrolledCount ?? '—'}</span>
                                      )}
                                      {slot.groupType === 'grupal' ? (
                                        <FiUsers aria-hidden="true" size={12} />
                                      ) : showStudentCounts ? (
                                        <FaPersonSwimming aria-hidden="true" size={12} />
                                      ) : null}
                                    </span>
                                  </span>
                                  {!showStudentCounts &&
                                    (slot.pendingApproval || slot.bookingStatus) && (
                                      <span className="pointer-events-none absolute -top-1.5 right-1 flex">
                                        <StatusBadge
                                          status={
                                            slot.pendingApproval
                                              ? 'pending'
                                              : slot.bookingStatus || 'confirmed'
                                          }
                                          compact
                                        />
                                      </span>
                                    )}
                                  {showStudentCounts &&
                                    (slot.pendingApproval || slot.bookingStatus) && (
                                      <StatusBadge
                                        status={
                                          slot.pendingApproval
                                            ? 'pending'
                                            : slot.bookingStatus || 'confirmed'
                                        }
                                      />
                                    )}
                                </button>
                              ))}
                            </div>
                          </div>
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
    </div>
  )
}
