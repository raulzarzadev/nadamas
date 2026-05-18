'use client'
import { useEffect, useRef, useState } from 'react'
import { type CoachMetricDefinition, METRIC_MAX } from '@/lib/coach-metrics'

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

  const pct = ((value - 1) / (METRIC_MAX - 1)) * 100

  return (
    <label className="group rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--c-surface)] text-base">
            {metric.icon}
          </span>
          <span className="font-bold text-[var(--c-ocean)]">{metric.label}</span>
        </div>
        <span
          className={`rounded-full bg-[var(--c-ocean)] px-2.5 py-1 text-sm font-bold text-white transition-transform duration-200 ${
            bumping ? 'scale-125' : 'group-hover:scale-105'
          }`}
        >
          {value}
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
        style={{
          background: `linear-gradient(90deg, var(--c-aqua) 0 ${pct}%, var(--c-border) ${pct}% 100%)`,
        }}
      />

      <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--c-text-2)]">
        <span>{metric.minLabel}</span>
        <span>{metric.maxLabel}</span>
      </div>
    </label>
  )
}
