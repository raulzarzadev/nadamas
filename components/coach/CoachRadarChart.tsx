import { CARD_PROPIERTIES_AND_STYLES_LABEL } from '@/CONSTANTS/LABELS'
import { type CoachMetrics, METRIC_MAX, RADAR_LEVELS, RADAR_METRICS } from '@/lib/coach-metrics'

// Stored values use the 1..METRIC_MAX form scale; the radar keeps its
// 5-ring scheme, so map every value down to that scheme.
const toScheme = (value: number) => (value / METRIC_MAX) * RADAR_LEVELS

function buildSoftPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return ''
  // Straight radar polygon — one segment per axis (no bezier blob).
  const [first, ...rest] = points
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(' ')} Z`
}

export default function CoachRadarChart({ metrics }: { metrics: CoachMetrics }) {
  const size = 320
  const center = size / 2
  const radius = 102
  const levels = [1, 2, 3, 4, 5]
  const angleStep = (Math.PI * 2) / RADAR_METRICS.length

  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + index * angleStep
    const distance = (value / 5) * radius
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    }
  }

  const stylePoints = RADAR_METRICS.map((metric, index) =>
    point(index, toScheme(metrics[metric.key]))
  )

  return (
    <div className="rounded-[var(--r-md)] border border-[rgba(0,119,182,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(244,251,255,0.72)_100%)] p-4 shadow-[var(--shadow-md)]">
      <div className="mb-2">
        <h3 className="text-lg font-bold text-[var(--c-ocean)]">
          {CARD_PROPIERTIES_AND_STYLES_LABEL}
        </h3>
      </div>

      <svg
        viewBox={`-34 -6 ${size + 68} ${size + 12}`}
        className="mx-auto h-auto w-full max-w-[360px]"
      >
        <defs>
          <linearGradient id="style-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f9a8d4" stopOpacity="0.56" />
            <stop offset="100%" stopColor="#90e0ef" stopOpacity="0.48" />
          </linearGradient>
        </defs>

        {RADAR_METRICS.map((_, index) => {
          const p = point(index, 5)
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="rgba(10,37,64,0.06)"
              strokeWidth="1"
            />
          )
        })}

        {levels.map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 5) * radius}
            fill="none"
            stroke="rgba(10,37,64,0.09)"
          />
        ))}

        <path
          d={buildSoftPath(stylePoints)}
          fill="url(#style-fill)"
          stroke="#ec4899"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {RADAR_METRICS.map((metric, index) => {
          const p = point(index, toScheme(metrics[metric.key]))
          const label = point(index, 6.3)
          return (
            <g key={metric.key}>
              <circle cx={p.x} cy={p.y} r="4" fill="#ec4899" stroke="#fff" strokeWidth="2" />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[var(--c-ocean)] text-[9px] font-semibold"
              >
                {metric.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function CoachStyleMapPreview({ metrics }: { metrics: CoachMetrics }) {
  const size = 108
  const center = size / 2
  const radius = 38
  const angleStep = (Math.PI * 2) / RADAR_METRICS.length

  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + index * angleStep
    const distance = (value / 5) * radius
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    }
  }

  const stylePoints = RADAR_METRICS.map((metric, index) =>
    point(index, toScheme(metrics[metric.key]))
  )

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="h-24 w-24 shrink-0 sm:h-28 sm:w-28"
    >
      <defs>
        <linearGradient id="style-preview-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f9a8d4" stopOpacity="0.68" />
          <stop offset="100%" stopColor="#90e0ef" stopOpacity="0.58" />
        </linearGradient>
      </defs>

      {[1, 2, 3].map((level) => (
        <circle
          key={level}
          cx={center}
          cy={center}
          r={(level / 3) * radius}
          fill="none"
          stroke="rgba(10,37,64,0.10)"
        />
      ))}

      {RADAR_METRICS.map((_, index) => {
        const p = point(index, 5)
        return (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="rgba(10,37,64,0.10)"
          />
        )
      })}

      <path
        d={buildSoftPath(stylePoints)}
        fill="url(#style-preview-fill)"
        stroke="#ec4899"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
