import {
  COACH_METRICS,
  type CoachMetrics,
  getMetricScaleLabels,
  getMetricSelectedLabel,
  METRIC_GROUPS,
  METRIC_MAX,
} from '@/lib/coach-metrics'
import CoachRadarChart from './CoachRadarChart'

export default function CoachMetricsOverview({
  metrics,
  showChart = true,
}: {
  metrics: CoachMetrics
  showChart?: boolean
}) {
  return (
    <section className="grid gap-5">
      {showChart && <CoachRadarChart metrics={metrics} />}

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
                const selectedLabel = getMetricSelectedLabel(metric, value)
                const scaleLabels = getMetricScaleLabels(metric)

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
                        {selectedLabel}
                      </span>
                    </div>

                    <div
                      aria-hidden="true"
                      className="relative mt-3 h-1.5 rounded-full bg-[var(--c-border)]"
                    >
                      <div
                        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--c-aqua)] shadow-[0_2px_8px_rgba(0,119,182,0.28)]"
                        style={{ left: `${pct}%` }}
                      />
                    </div>

                    <div
                      className="mt-1.5 grid min-h-7 gap-1 text-[0.62rem] leading-tight text-[var(--c-text-2)]"
                      style={{
                        gridTemplateColumns: `repeat(${scaleLabels.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {scaleLabels.map((label, index) => (
                        <span
                          key={`${metric.key}-${label}`}
                          className={`inline-block origin-top whitespace-nowrap ${
                            index === 0 ? 'justify-self-start' : ''
                          } ${
                            index === scaleLabels.length - 1
                              ? 'justify-self-end'
                              : 'justify-self-center'
                          } ${label === selectedLabel ? 'font-bold text-[var(--c-ocean)]' : ''} -rotate-12`}
                        >
                          {label}
                        </span>
                      ))}
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
