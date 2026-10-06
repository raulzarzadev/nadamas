'use client'

import { type ReactNode, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { HOUR_STATUS_STYLE, HOUR_STATUSES, type HourStatus } from '@/lib/coach-agenda-status'
import { dateKey } from '@/lib/coach-offerings'

const WEEKDAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']
const BAR_KEYS = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6']

export default function CoachAgendaDateSelector({
  selectedDate,
  weekDates,
  dayStatuses,
  monthCount,
  weekCount,
  selectedStatuses,
  onToggleStatus,
  onSelectDate,
  onChangeWeek,
}: {
  selectedDate: string
  weekDates: Date[]
  dayStatuses: Map<string, HourStatus[]>
  monthCount?: string
  weekCount?: string
  selectedStatuses: Set<HourStatus>
  onToggleStatus: (status: HourStatus) => void
  onSelectDate: (date: string) => void
  onChangeWeek: (delta: number) => void
}) {
  const touchStartX = useRef<number | null>(null)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const today = dateKey(new Date())
  const monthLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', {
    month: 'long',
  })
  const weekRange = `${weekDates[0]?.getDate()} – ${weekDates[6]?.getDate()}`
  const weekStatuses = new Set(weekDates.flatMap((date) => dayStatuses.get(dateKey(date)) || []))
  const changeWeek = (delta: number) => onChangeWeek(delta)
  const touchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    touchStartX.current = null
    setDragging(false)
    setDragX(0)
    if (Math.abs(dx) > 40) changeWeek(dx < 0 ? 1 : -1)
  }

  return (
    <div className="flex flex-col gap-3">
      <NavStepper
        label={
          <>
            <span>{monthLabel}</span>
            {monthCount && (
              <span className="text-[11px] font-medium text-slate-400">{monthCount}</span>
            )}
            <span className="px-0.5">·</span>
            <span>{weekRange}</span>
            {weekCount && (
              <span className="text-[11px] font-medium text-slate-400">{weekCount}</span>
            )}
          </>
        }
        prevLabel="Semana anterior"
        nextLabel="Semana siguiente"
        onPrev={() => changeWeek(-1)}
        onNext={() => changeWeek(1)}
        onToday={() => onSelectDate(today)}
        isToday={selectedDate === today}
        labelClassName="text-sm font-semibold capitalize"
      />
      {weekStatuses.size > 0 && (
        <ul
          aria-label="Significado de los colores"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[var(--c-text-2)]"
        >
          {HOUR_STATUSES.filter((status) => weekStatuses.has(status)).map((status) => (
            <li key={status}>
              <button
                type="button"
                aria-pressed={selectedStatuses.has(status)}
                onClick={() => onToggleStatus(status)}
                className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] transition hover:-translate-y-px hover:bg-[var(--c-surface)] hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] ${selectedStatuses.has(status) ? 'text-[var(--c-text-2)]' : 'opacity-40 grayscale'}`}
              >
                <span
                  aria-hidden="true"
                  className={`h-[4px] w-4 rounded-full ${HOUR_STATUS_STYLE[status].bar}`}
                />
                {
                  {
                    available: 'Disponible',
                    booked: 'Ocupado',
                    groupAvailable: 'Grupal disponible',
                    group: 'Grupal ocupada',
                    blocked: 'Bloqueado',
                  }[status]
                }
              </button>
            </li>
          ))}
        </ul>
      )}
      <div
        className="flex touch-pan-y items-stretch gap-1"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null
          setDragging(true)
          setDragX(0)
        }}
        onTouchMove={(event) => {
          if (touchStartX.current === null) return
          const dx = (event.touches[0]?.clientX ?? touchStartX.current) - touchStartX.current
          setDragX(Math.max(-100, Math.min(100, dx)))
        }}
        onTouchEnd={touchEnd}
      >
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={() => changeWeek(-1)}
          className="grid w-6 shrink-0 place-items-center self-stretch rounded-[var(--r-md)] border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
        >
          <FiChevronLeft aria-hidden="true" />
        </button>
        <div
          className="grid flex-1 grid-cols-7 gap-1.5"
          style={{
            transform: `translateX(${dragX}px)`,
            opacity: dragging ? 0.85 : 1,
            transition: dragging ? 'none' : 'transform 200ms ease, opacity 200ms ease',
          }}
        >
          {weekDates.map((date) => {
            const key = dateKey(date)
            const selected = key === selectedDate
            const isToday = key === today
            const statuses = dayStatuses.get(key) || []
            const visibleStatuses = statuses.filter((status) => selectedStatuses.has(status))
            const bars =
              visibleStatuses.length > 6
                ? Array.from(
                    { length: 6 },
                    (_, index) => visibleStatuses[Math.floor((index * visibleStatuses.length) / 6)]
                  )
                : visibleStatuses
            const count = (status: HourStatus) =>
              statuses.filter((value) => value === status).length
            const weekday = date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
            const label = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()}`
            return (
              <button
                type="button"
                key={key}
                aria-pressed={selected}
                aria-current={isToday ? 'date' : undefined}
                onClick={() => onSelectDate(key)}
                aria-label={
                  statuses.length
                    ? `${label}: ${count('booked')} ocupadas, ${count('group')} grupales ocupadas, ${count('groupAvailable')} grupales disponibles, ${count('available')} disponibles, ${count('blocked')} bloqueadas`
                    : label
                }
                className={`relative flex min-h-[68px] flex-col items-center gap-1 rounded-[var(--r-md)] border py-2 transition-colors ${isToday ? 'border-transparent bg-cyan-300 text-[var(--c-ocean)] shadow-[var(--shadow-sm)]' : `border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)] ${[0, 6].includes(date.getDay()) ? 'bg-[var(--c-surface)]' : 'bg-white'}`} ${selected ? 'ring-2 ring-[var(--c-aqua)] ring-offset-1' : ''}`}
              >
                {isToday && (
                  <span className="absolute -top-2 rounded-full bg-(--c-ocean) px-2 py-0.5 text-[9px] font-bold leading-none text-white">
                    Hoy
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold ${isToday ? 'text-[var(--c-ocean)]' : 'text-[var(--c-text-2)]'}`}
                >
                  {WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                </span>
                <span className="text-lg font-extrabold leading-none">{date.getDate()}</span>
                <span
                  aria-hidden="true"
                  className="flex min-h-[14px] flex-col items-center justify-center gap-[2px] pt-0.5"
                >
                  {bars.map((status, index) => (
                    <span
                      key={BAR_KEYS[index]}
                      className={`h-[4px] w-4 rounded-full ${HOUR_STATUS_STYLE[status].bar}`}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          aria-label="Semana siguiente"
          onClick={() => changeWeek(1)}
          className="grid w-6 shrink-0 place-items-center self-stretch rounded-[var(--r-md)] border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
        >
          <FiChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function NavStepper({
  label,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  onToday,
  isToday,
  labelClassName = '',
}: {
  label: ReactNode
  prevLabel: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  isToday: boolean
  labelClassName?: string
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        aria-label={prevLabel}
        onClick={onPrev}
        className="grid h-6 w-6 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
      >
        <FiChevronLeft aria-hidden="true" />
      </button>
      <span className="inline-flex items-baseline justify-center gap-2 text-center">
        <span className={`text-[var(--c-ocean)] ${labelClassName}`}>{label}</span>
      </span>
      <button
        type="button"
        aria-label={nextLabel}
        onClick={onNext}
        className="grid h-6 w-6 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
      >
        <FiChevronRight aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={isToday ? 'Hoy' : 'Volver a hoy'}
        aria-current={isToday ? 'date' : undefined}
        disabled={isToday}
        onClick={onToday}
        className="min-h-7 rounded-full border border-[var(--c-border)] bg-white px-2.5 text-xs font-bold text-[var(--c-ocean)] transition hover:border-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)] disabled:border-[var(--c-aqua)] disabled:bg-[var(--c-surface)] disabled:opacity-70"
      >
        Hoy
      </button>
    </div>
  )
}
