'use client'
import CoachMetricSlider from './CoachMetricSlider'
import CoachRadarChart from './CoachRadarChart'
import {
  COACH_METRICS,
  normalizeCoachMetrics,
  type CoachMetrics,
} from '@/lib/coach-metrics'

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
      <div className="grid gap-3 sm:grid-cols-2">
        {COACH_METRICS.map((metric) => (
          <CoachMetricSlider
            key={metric.key}
            metric={metric}
            value={metrics[metric.key]}
            onChange={(nextValue) =>
              onChange({ ...metrics, [metric.key]: nextValue })
            }
          />
        ))}
      </div>
      <div className="lg:sticky lg:top-24">
        <CoachRadarChart metrics={metrics} />
      </div>
    </div>
  )
}
