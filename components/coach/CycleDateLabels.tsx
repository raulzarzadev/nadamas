'use client'

import { useEffect, useRef, useState } from 'react'

const format = (value: string, year: boolean) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        ...(year ? { year: 'numeric' as const } : {}),
      })
    : 'Sin fecha'

export default function CycleDateLabels({
  startDate,
  endDate,
  min,
  max,
  title,
  onEdit,
  disabled,
}: {
  startDate: string
  endDate: string
  min: string
  max: string
  title: string
  onEdit?: () => void
  disabled: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const measure = useRef<HTMLDivElement>(null)
  const [sizes, setSizes] = useState({ width: 0, full: 0, short: 0, range: 0 })
  const startFull = format(startDate, true),
    endFull = format(endDate, true)
  const startShort = format(startDate, false),
    endShort = format(endDate, false)
  const sameDate = startDate === endDate
  const range = sameDate ? startFull : `${startShort} — ${endShort}`
  useEffect(() => {
    const update = () => {
      if (!container.current || !measure.current) return
      const labels = Array.from(measure.current.children).map(
        (node) => node.getBoundingClientRect().width
      )
      setSizes({
        width: container.current.clientWidth,
        full: labels[0] + labels[1] + 8,
        short: labels[2] + labels[3] + 8,
        range: labels[4],
      })
    }
    update()
    const observer = new ResizeObserver(update)
    if (container.current) observer.observe(container.current)
    if (measure.current) for (const label of measure.current.children) observer.observe(label)
    return () => observer.disconnect()
  }, [])
  const duration = Date.parse(max) - Date.parse(min) + 86400000
  const start = Math.max(0, Math.min(1, (Date.parse(startDate) - Date.parse(min)) / duration)) || 0
  const end =
    Math.max(start, Math.min(1, (Date.parse(endDate) - Date.parse(min) + 86400000) / duration)) || 0
  const available = (end - start) * sizes.width
  const showYear = available >= sizes.full && sizes.full > 0
  const separate = !sameDate && available >= sizes.short && sizes.short > 0
  const rangeLeft = Math.max(
    0,
    Math.min(sizes.width - sizes.range, ((start + end) / 2) * sizes.width - sizes.range / 2)
  )
  const buttonClass =
    'absolute top-0 cursor-pointer whitespace-nowrap rounded p-0 text-xs font-semibold text-(--c-aqua-strong) hover:underline focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'
  const textClass = 'absolute top-0 whitespace-nowrap text-xs font-semibold text-(--c-aqua-strong)'
  const label = (
    text: string,
    ariaLabel: string,
    hint: string,
    style: { left?: string | number; right?: string }
  ) =>
    onEdit ? (
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        title={hint}
        onClick={onEdit}
        className={buttonClass}
        style={style}
      >
        {text}
      </button>
    ) : (
      <span title={hint} className={textClass} style={style}>
        {text}
      </span>
    )
  return (
    <div ref={container} className="relative h-4 min-w-0 w-full text-xs font-semibold">
      <div
        ref={measure}
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-0 flex gap-0 overflow-hidden whitespace-nowrap"
      >
        <span>{startFull}</span>
        <span>{endFull}</span>
        <span>{startShort}</span>
        <span>{endShort}</span>
        <span>{range}</span>
      </div>
      {separate ? (
        <>
          {label(showYear ? startFull : startShort, `Editar fecha inicio de ${title}`, startFull, {
            left: `${start * 100}%`,
          })}
          {label(showYear ? endFull : endShort, `Editar fecha final de ${title}`, endFull, {
            right: `${(1 - end) * 100}%`,
          })}
        </>
      ) : (
        label(range, `Editar fechas de ${title}`, `${startFull} — ${endFull}`, { left: rangeLeft })
      )}
    </div>
  )
}
