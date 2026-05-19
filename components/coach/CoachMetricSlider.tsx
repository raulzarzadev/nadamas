'use client'
import { useEffect, useRef, useState } from 'react'
import {
  type CoachMetricDefinition,
  getMetricScaleLabels,
  getMetricSelectedLabel,
  METRIC_MAX,
} from '@/lib/coach-metrics'

export default function CoachMetricSlider({
  metric,
  value,
  onChange,
}: {
  metric: CoachMetricDefinition
  value: number
  onChange: (value: number) => void
}) {
  const [bumping, setBumping] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function handleChange(next: number) {
    onChange(next)
    setBumping(false)
    // next frame so the animation restarts even on rapid changes
    requestAnimationFrame(() => setBumping(true))
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setBumping(false), 340)
  }

  const selectedLabel = getMetricSelectedLabel(metric, value)
  const scaleLabels = getMetricScaleLabels(metric)

  return (
    <label className="group min-w-0 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-3 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--c-surface)] text-base">
            {metric.icon}
          </span>
          <span className="truncate font-bold text-[var(--c-ocean)]">{metric.label}</span>
        </div>
        <span
          className={`max-w-[9rem] shrink-0 truncate rounded-full bg-[var(--c-ocean)] px-2.5 py-1 text-right text-xs font-bold text-white transition-transform duration-200 sm:max-w-[11rem] ${
            bumping ? 'scale-125' : 'group-hover:scale-105'
          }`}
        >
          {selectedLabel}
        </span>
      </div>

      <input
        type="range"
        min={1}
        max={METRIC_MAX}
        step={1}
        value={value}
        onChange={(event) => handleChange(Number(event.target.value))}
        className={`metric-range mt-4 w-full touch-pan-x ${bumping ? 'is-bumping' : ''}`}
      />

      <div
        className="mt-2 grid min-h-10 min-w-0 gap-1 pb-1 text-[0.68rem] text-[var(--c-text-2)] sm:gap-2 sm:text-xs"
        style={{ gridTemplateColumns: `repeat(${scaleLabels.length}, minmax(0, 1fr))` }}
      >
        {scaleLabels.map((label, index) => (
          <span
            key={`${metric.key}-${label}`}
            className={`inline-block max-w-[5.5rem] origin-top truncate whitespace-nowrap leading-tight sm:max-w-none ${
              index === 0 ? 'justify-self-start' : ''
            } ${index === scaleLabels.length - 1 ? 'justify-self-end' : 'justify-self-center'} ${
              label === selectedLabel ? 'font-bold text-[var(--c-ocean)]' : ''
            } -rotate-12`}
          >
            {label}
          </span>
        ))}
      </div>
    </label>
  )
}
