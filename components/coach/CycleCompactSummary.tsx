'use client'

import { useEffect, useState } from 'react'
import { FiArrowUp } from 'react-icons/fi'
import { localCalendarDate } from '@/lib/today-training'
import type { TrainingCycle } from '@/lib/training-planner'

const day = (value: string) => Date.parse(`${value}T00:00:00Z`) / 86400000

/** Compact, proportional preview of actual child periods inside a collapsed cycle. */
export default function CycleCompactSummary({
  cycle,
  periods,
  subPeriods = [],
  showDates = true,
  onEditDates,
  disabled = false,
}: {
  cycle: TrainingCycle
  periods: TrainingCycle[]
  subPeriods?: TrainingCycle[]
  showDates?: boolean
  onEditDates?: () => void
  disabled?: boolean
}) {
  const [today, setToday] = useState(() => localCalendarDate(new Date()))
  useEffect(() => {
    const timer = setInterval(() => setToday(localCalendarDate(new Date())), 60000)
    return () => clearInterval(timer)
  }, [])
  const first = day(cycle.startDate),
    last = day(cycle.endDate)
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) return null
  const length = last - first + 1
  const segments = periods.flatMap((child) => {
    const start = Math.max(first, day(child.startDate)),
      end = Math.min(last, day(child.endDate))
    return Number.isFinite(start) && Number.isFinite(end) && start <= end
      ? [{ ...child, start, end }]
      : []
  })
  const current = day(today)
  const showToday = current >= first && current <= last
  const palette = ['#287ca6', '#398fae', '#56a3b7', '#317e9b']
  const monthTicks: { label: string; position: number }[] = []
  const cursor = new Date(first * 86400000)
  cursor.setUTCDate(1)
  cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  const monthCount =
    (new Date(last * 86400000).getUTCFullYear() - cursor.getUTCFullYear()) * 12 +
    new Date(last * 86400000).getUTCMonth() -
    cursor.getUTCMonth() +
    1
  const step = Math.max(1, Math.ceil(monthCount / 6))
  for (let index = 0; day(cursor.toISOString().slice(0, 10)) <= last; index++) {
    const position = ((cursor.getTime() / 86400000 - first) / length) * 100
    if (index % step === 0 && position > 4 && position < 96)
      monthTicks.push({
        label: cursor
          .toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' })
          .replace('.', ''),
        position,
      })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return (
    <section
      aria-label={`Resumen de ${cycle.title}`}
      className="relative my-0.5 block w-full min-w-0 pt-1 pb-1 text-left"
    >
      <span className="sr-only">
        {segments.length} MESO-ciclos y {subPeriods.length} MICRO-ciclos distribuidos
        proporcionalmente entre {cycle.startDate} y {cycle.endDate}.{' '}
        {showToday ? `Hoy: ${today}. El MICRO-ciclo actual se muestra destacado.` : ''}
      </span>

      <span aria-hidden="true" className="relative grid w-full gap-2">
        <span className="flex h-6 w-full min-w-0 items-center rounded-full bg-[#a8d2df] px-2 text-[10px] font-semibold text-(--c-ocean)">
          <span className="truncate">{cycle.title}</span>
        </span>
        <span className="relative block h-6 w-full">
          {segments.map((segment, index) => {
            const width = ((segment.end - segment.start + 1) / length) * 100
            const active = current >= segment.start && current <= segment.end
            return (
              <span
                key={segment.id}
                title={segment.title}
                className="absolute inset-y-0 flex min-w-0 items-center overflow-hidden rounded-full"
                style={{
                  left: `calc(${((segment.start - first) / length) * 100}% + 2px)`,
                  width: `max(2px, calc(${width}% - 4px))`,
                  backgroundColor: active ? '#236b8a' : palette[index % palette.length],
                }}
              >
                {width >= 12 && (
                  <span className="truncate px-2 text-[10px] leading-none font-semibold text-white">
                    {segment.title}
                  </span>
                )}
              </span>
            )
          })}
        </span>
        {subPeriods.length > 0 && (
          <span className="relative block h-6 w-full">
            {subPeriods.flatMap((micro) => {
              const parent = segments.find((segment) => segment.id === micro.parentId)
              if (!parent) return []
              const start = Math.max(parent.start, day(micro.startDate)),
                end = Math.min(parent.end, day(micro.endDate))
              if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return []
              const width = ((end - start + 1) / length) * 100
              const active = current >= start && current <= end
              return [
                <span
                  key={micro.id}
                  title={micro.title}
                  className={`absolute flex min-w-0 items-center overflow-hidden rounded-full ${active ? 'top-0 h-6 bg-[#1f7766]' : 'top-1 h-4 bg-[#80c6b6]'}`}
                  style={{
                    left: `calc(${((start - first) / length) * 100}% + 2px)`,
                    width: `max(2px, calc(${width}% - 4px))`,
                  }}
                >
                  {width >= (active ? 5 : 10) && (
                    <span
                      className={`truncate px-1 text-[8px] font-semibold ${active ? 'text-white' : 'text-[#164e46]'}`}
                    >
                      {micro.title}
                    </span>
                  )}
                </span>,
              ]
            })}
          </span>
        )}
        {showToday && (
          <span
            className="absolute top-[calc(100%+1.25rem)] z-20 w-0"
            style={{
              left: `${((current - first) / length) * 100}%`,
            }}
          >
            <span
              className={`absolute top-4 w-max text-[11px] leading-none font-medium text-(--c-ocean) ${current - first < length * 0.04 ? 'left-0' : 'right-1'}`}
            >
              Hoy
            </span>
            <FiArrowUp
              aria-hidden="true"
              className="absolute top-0 -left-2 size-4 text-(--c-ocean)"
            />
          </span>
        )}
      </span>
      <div
        className={`${showToday ? 'mb-9' : ''} relative mt-1 h-3 text-[9px] leading-none font-medium text-(--c-ocean)/60`}
      >
        {monthTicks
          .filter((tick) => !showDates || (tick.position > 20 && tick.position < 80))
          .map((tick) => (
            <span
              aria-hidden="true"
              key={tick.position}
              className="absolute -translate-x-1/2"
              style={{ left: `${tick.position}%` }}
            >
              {tick.label}
            </span>
          ))}
        {showDates &&
          (['startDate', 'endDate'] as const).map((field) => {
            const label = new Date(`${cycle[field]}T00:00:00Z`).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              timeZone: 'UTC',
            })
            return (
              <span
                key={field}
                className={`absolute top-0 ${field === 'startDate' ? 'left-0' : 'right-0'}`}
              >
                {onEditDates ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={onEditDates}
                    aria-label={
                      field === 'startDate'
                        ? 'Editar fecha de inicio del MACRO-ciclo'
                        : 'Editar fecha final del MACRO-ciclo'
                    }
                    className="rounded p-0 text-inherit hover:underline focus-visible:outline-2"
                  >
                    <time dateTime={cycle[field]}>{label}</time>
                  </button>
                ) : (
                  <time dateTime={cycle[field]}>{label}</time>
                )}
              </span>
            )
          })}
      </div>
    </section>
  )
}
