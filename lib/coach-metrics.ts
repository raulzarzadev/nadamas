export interface CoachMetrics {
  intensity: number
  methodology: number
  communication: number
  patience: number
  attention: number
  training: number
  planning: number
  connection: number
}

export type MetricGroupId = 'personality' | 'method'

export interface MetricGroup {
  id: MetricGroupId
  label: string
  icon: string
  /** Light background tint for the group block. */
  bg: string
  border: string
}

export const METRIC_GROUPS: MetricGroup[] = [
  {
    id: 'personality',
    label: 'Personalidad',
    icon: '😊',
    bg: 'rgba(249,168,212,0.28)',
    border: 'rgba(236,72,153,0.55)',
  },
  {
    id: 'method',
    label: 'Metodología',
    icon: '📖',
    bg: 'rgba(144,224,239,0.32)',
    border: 'rgba(0,180,216,0.55)',
  },
]

export interface CoachMetricDefinition {
  key: keyof CoachMetrics
  label: string
  minLabel: string
  middleLabel?: string
  maxLabel: string
  optionLabels?: string[]
  icon: string
  group: MetricGroupId
}

export const COACH_METRICS: CoachMetricDefinition[] = [
  {
    key: 'intensity',
    label: 'Objetivo',
    minLabel: 'Relajación',
    maxLabel: 'Entrenamiento',
    optionLabels: ['Relajación', 'Aprendizaje', 'Mantenimiento', 'Entrenamiento'],
    icon: '⚡',
    group: 'method',
  },
  {
    key: 'methodology',
    label: 'Metodología',
    minLabel: 'Intuitiva',
    middleLabel: 'Adaptativa',
    maxLabel: 'Estructurada',
    icon: '🧭',
    group: 'method',
  },
  {
    key: 'communication',
    label: 'Comunicación',
    minLabel: 'Motivacional',
    middleLabel: 'Balanceada',
    maxLabel: 'Técnico',
    icon: '💬',
    group: 'personality',
  },
  {
    key: 'patience',
    label: 'Paciencia',
    minLabel: 'Ágil',
    middleLabel: 'Intermedia',
    maxLabel: 'Pausada',
    icon: '🌊',
    group: 'personality',
  },
  {
    key: 'attention',
    label: 'Atención',
    minLabel: 'Grupal',
    middleLabel: 'Mixta',
    maxLabel: 'Personalizada',
    icon: '🎯',
    group: 'personality',
  },
  {
    key: 'training',
    label: 'Alumnos',
    minLabel: 'Todos',
    maxLabel: 'Solo bebés',
    optionLabels: ['Todos', 'Adultos', 'Niños', 'Solo bebés'],
    icon: '🏊',
    group: 'method',
  },
  {
    key: 'planning',
    label: 'Planeación',
    minLabel: 'Espontánea',
    middleLabel: 'Intermedia',
    maxLabel: 'Planeado',
    icon: '📋',
    group: 'method',
  },
  {
    key: 'connection',
    label: 'Habilidad',
    minLabel: 'Principiantes',
    maxLabel: 'Multideporte',
    optionLabels: ['Principiantes', 'Intermedio', 'Avanzados', 'Multideporte'],
    icon: '🌿',
    group: 'personality',
  },
]

/** Form scale is 1..METRIC_MAX; the radar still draws on a 5-ring scheme. */
export const METRIC_MAX = 10
/** Radar rings (visual scheme), unchanged regardless of METRIC_MAX. */
export const RADAR_LEVELS = 5

export const DEFAULT_COACH_METRICS: CoachMetrics = {
  intensity: 5,
  methodology: 5,
  communication: 5,
  patience: 5,
  attention: 5,
  training: 5,
  planning: 5,
  connection: 5,
}

// Radar axes grouped: personality dimensions on one half, methodology on
// the other, so the chart visually splits the two sides.
export const RADAR_METRICS: Array<{
  key: keyof CoachMetrics
  label: string
}> = [
  // Right half = method (top→bottom in card order). Left half = personality
  // reversed so it reads top→bottom too. Chart is rotated by half a step
  // (see CoachRadarChart) so the split is a clean vertical 4 / 4.
  ...COACH_METRICS.filter((m) => m.group === 'method'),
  ...COACH_METRICS.filter((m) => m.group === 'personality').reverse(),
].map(({ key, label }) => ({ key, label }))

export function normalizeCoachMetrics(metrics?: Partial<CoachMetrics> | null): CoachMetrics {
  return { ...DEFAULT_COACH_METRICS, ...(metrics || {}) }
}

export function getMetricScaleLabels(metric: CoachMetricDefinition) {
  return (
    metric.optionLabels || [metric.minLabel, metric.middleLabel, metric.maxLabel].filter(Boolean)
  )
}

export function getMetricSelectedLabel(metric: CoachMetricDefinition, value: number) {
  const labels = getMetricScaleLabels(metric)
  const position = Math.max(1, Math.min(METRIC_MAX, value))
  const index = Math.round(((position - 1) / (METRIC_MAX - 1)) * (labels.length - 1))
  return labels[index]
}
