'use client'

import { useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { HOUR_STATUS_STYLE, type HourStatus } from '@/lib/coach-agenda-status'
import { dateKey } from '@/lib/coach-offerings'

const WEEKDAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']
const BAR_KEYS = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6']

export default function CoachAgendaDateSelector({
  selectedDate,
  weekDates,
  dayStatuses,
  monthCount,
  weekCount,
  onSelectDate,
  onChangeMonth,
  onChangeWeek,
}: {
  selectedDate: string
  weekDates: Date[]
  dayStatuses: Map<string, HourStatus[]>
  monthCount: string
  weekCount: string
  onSelectDate: (date: string) => void
  onChangeMonth: (delta: number) => void
  onChangeWeek: (delta: number) => void
}) {
  const touchStartX = useRef<number | null>(null)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const today = dateKey(new Date())
  const monthLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', {
    month: 'long',
  })
  const weekLabel = `${weekDates[0]?.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${weekDates[6]?.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`
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
        label={monthLabel}
        count={monthCount}
        prevLabel="Mes anterior"
        nextLabel="Mes siguiente"
        onPrev={() => onChangeMonth(-1)}
        onNext={() => onChangeMonth(1)}
        labelClassName="text-xl font-extrabold capitalize"
      />
      <NavStepper
        label={weekLabel}
        count={weekCount}
        prevLabel="Semana anterior"
        nextLabel="Semana siguiente"
        onPrev={() => changeWeek(-1)}
        onNext={() => changeWeek(1)}
        labelClassName="text-sm font-semibold"
      />
      {selectedDate !== today && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onSelectDate(today)}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--c-aqua-strong)] px-5 py-2 text-sm font-bold text-white hover:bg-[var(--c-ocean-mid)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
          >
            Hoy
          </button>
        </div>
      )}
      <ul
        aria-label="Significado de los colores"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[var(--c-text-2)]"
      >
        {(['available', 'booked', 'groupAvailable', 'group', 'blocked'] as const).map((status) => (
          <li key={status} className="flex items-center gap-1.5">
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
          </li>
        ))}
      </ul>
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
          className="grid w-6 shrink-0 place-items-center rounded-[var(--r-md)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
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
            const bars =
              statuses.length > 6
                ? Array.from(
                    { length: 6 },
                    (_, index) => statuses[Math.floor((index * statuses.length) / 6)]
                  )
                : statuses
            const count = (status: HourStatus) =>
              statuses.filter((value) => value === status).length
            const weekday = date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
            const label = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()}`
            return (
              <button
                type="button"
                key={key}
                onClick={() => onSelectDate(key)}
                aria-label={
                  statuses.length
                    ? `${label}: ${count('booked')} ocupadas, ${count('group')} grupales ocupadas, ${count('groupAvailable')} grupales disponibles, ${count('available')} disponibles, ${count('blocked')} bloqueadas`
                    : label
                }
                className={`flex min-h-[68px] flex-col items-center gap-1 rounded-[var(--r-md)] border py-2 transition-colors ${selected ? 'border-[var(--c-aqua)] bg-gradient-to-b from-[var(--c-aqua)] to-[var(--c-ocean)] text-white shadow-[var(--shadow-sm)]' : `border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)] ${[0, 6].includes(date.getDay()) ? 'bg-[var(--c-surface)]' : 'bg-white'}`} ${isToday ? 'ring-2 ring-[var(--c-aqua)] ring-offset-1' : ''}`}
              >
                <span
                  className={`text-[10px] font-bold ${selected ? 'text-white/80' : 'text-[var(--c-text-2)]'}`}
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
          className="grid w-6 shrink-0 place-items-center rounded-[var(--r-md)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
        >
          <FiChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function NavStepper({
  label,
  count,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  labelClassName = '',
}: {
  label: string
  count: string
  prevLabel: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
  labelClassName?: string
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        aria-label={prevLabel}
        onClick={onPrev}
        className="grid h-8 w-8 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
      >
        <FiChevronLeft aria-hidden="true" />
      </button>
      <span className="inline-flex items-baseline justify-center gap-2 text-center">
        <span className={`text-[var(--c-ocean)] ${labelClassName}`}>{label}</span>
        <span className="text-xs font-semibold text-[var(--c-text-2)]">{count}</span>
      </span>
      <button
        type="button"
        aria-label={nextLabel}
        onClick={onNext}
        className="grid h-8 w-8 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
      >
        <FiChevronRight aria-hidden="true" />
      </button>
    </div>
  )
}
