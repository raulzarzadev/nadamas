'use client'
import type { CoachMetricDefinition } from '@/lib/coach-metrics'

export default function CoachMetricSlider({
  metric,
  value,
  onChange,
}: {
  metric: CoachMetricDefinition
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="group rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--c-surface)] text-base">
            {metric.icon}
          </span>
          <span className="font-bold text-[var(--c-ocean)]">{metric.label}</span>
        </div>
        <span className="rounded-full bg-[var(--c-ocean)] px-2.5 py-1 text-sm font-bold text-white transition-transform group-hover:scale-105">
          {value}
        </span>
      </div>

      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range range-primary mt-4 range-sm"
      />

      <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[var(--c-text-2)]">
        <span>{metric.minLabel}</span>
        <span>{metric.maxLabel}</span>
      </div>
    </label>
  )
}
