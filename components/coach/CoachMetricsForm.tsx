'use client'
import {
  COACH_METRICS,
  type CoachMetrics,
  METRIC_GROUPS,
  normalizeCoachMetrics,
} from '@/lib/coach-metrics'
import CoachMetricSlider from './CoachMetricSlider'
import CoachRadarChart from './CoachRadarChart'

export default function CoachMetricsForm({
  value,
  onChange,
}: {
  value?: Partial<CoachMetrics>
  onChange: (metrics: CoachMetrics) => void
}) {
  const metrics = normalizeCoachMetrics(value)

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_19rem] lg:items-start">
      <div className="grid gap-4">
        {METRIC_GROUPS.map((group) => (
          <section
            key={group.id}
            className="rounded-[var(--r-md)] border p-4"
            style={{ background: group.bg, borderColor: group.border }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm shadow-[var(--shadow-sm)]">
                {group.icon}
              </span>
              <h3 className="font-bold text-[var(--c-ocean)]">{group.label}</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {COACH_METRICS.filter((m) => m.group === group.id).map((metric) => (
                <CoachMetricSlider
                  key={metric.key}
                  metric={metric}
                  value={metrics[metric.key]}
                  onChange={(nextValue) => onChange({ ...metrics, [metric.key]: nextValue })}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="lg:sticky lg:top-24">
        <CoachRadarChart metrics={metrics} />
      </div>
    </div>
  )
}
