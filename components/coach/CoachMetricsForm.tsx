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
      <div className="grid gap-4 md:grid-cols-2">
        {METRIC_GROUPS.map((group) => (
          <section
            key={group.id}
            className="flex flex-col gap-3 rounded-[var(--r-md)] border p-4"
            style={{ background: group.bg, borderColor: group.border }}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm shadow-[var(--shadow-sm)]">
                {group.icon}
              </span>
              <h3 className="font-bold text-[var(--c-ocean)]">{group.label}</h3>
            </div>
            <div className="grid gap-3">
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
        <div className="relative">
          {/* diffuse wash blending both group colors behind the diagram */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] blur-2xl"
            style={{
              background:
                'radial-gradient(60% 60% at 25% 20%, #f9a8d4 0%, transparent 70%), radial-gradient(60% 60% at 80% 85%, #90e0ef 0%, transparent 70%)',
              opacity: 0.4,
            }}
          />
          <CoachRadarChart metrics={metrics} />
        </div>
      </div>
    </div>
  )
}
