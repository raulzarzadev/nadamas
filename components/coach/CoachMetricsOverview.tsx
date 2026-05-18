import { COACH_METRICS, type CoachMetrics, METRIC_GROUPS, METRIC_MAX } from '@/lib/coach-metrics'
import CoachRadarChart from './CoachRadarChart'

export default function CoachMetricsOverview({ metrics }: { metrics: CoachMetrics }) {
  return (
    <section className="grid gap-5">
      <CoachRadarChart metrics={metrics} />

      <div className="grid gap-3 md:grid-cols-2">
        {METRIC_GROUPS.map((group) => (
          <section
            key={group.id}
            className="flex flex-col gap-3 rounded-[var(--r-md)] border p-3"
            style={{ background: group.bg, borderColor: group.border }}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs shadow-[var(--shadow-sm)]">
                {group.icon}
              </span>
              <h3 className="text-sm font-bold text-[var(--c-ocean)]">{group.label}</h3>
            </div>

            <div className="grid gap-2">
              {COACH_METRICS.filter((metric) => metric.group === group.id).map((metric) => {
                const value = metrics[metric.key]
                const pct = ((value - 1) / (METRIC_MAX - 1)) * 100

                return (
                  <article
                    key={metric.key}
                    className="rounded-[18px] border border-[var(--c-border)] bg-white p-3 shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--c-surface)] text-sm">
                          {metric.icon}
                        </span>
                        <span className="text-sm font-bold text-[var(--c-ocean)]">
                          {metric.label}
                        </span>
                      </div>
                      <span className="rounded-full bg-[var(--c-ocean)] px-2 py-0.5 text-xs font-bold text-white">
                        {value}
                      </span>
                    </div>

                    <div
                      aria-hidden="true"
                      className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--c-border)]"
                    >
                      <div
                        className="h-full rounded-full bg-[var(--c-aqua)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-[var(--c-text-2)]">
                      <span>{metric.minLabel}</span>
                      <span>{metric.maxLabel}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
