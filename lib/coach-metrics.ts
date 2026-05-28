export interface CoachMetrics {
  communication: number
  energy: number
  motivation: number
  attention: number
  goal: number
  methodology: number
  planning: number
  correction: number
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
    label: 'Método',
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
    key: 'communication',
    label: 'Comunicación',
    minLabel: 'Motivacional',
    middleLabel: 'Balanceada',
    maxLabel: 'Técnica',
    icon: '💬',
    group: 'personality',
  },
  {
    key: 'energy',
    label: 'Energía',
    minLabel: 'Calmada',
    middleLabel: 'Dinámica',
    maxLabel: 'Intensa',
    icon: '⚡',
    group: 'personality',
  },
  {
    key: 'motivation',
    label: 'Motivación',
    minLabel: 'Paciente',
    middleLabel: 'Balanceada',
    maxLabel: 'Retadora',
    icon: '🔥',
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
    key: 'goal',
    label: 'Objetivo',
    minLabel: 'Recreativo',
    maxLabel: 'Rendimiento',
    optionLabels: ['Recreativo', 'Aprendizaje', 'Fitness', 'Rendimiento'],
    icon: '🏁',
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
    key: 'planning',
    label: 'Planeación',
    minLabel: 'Flexible',
    middleLabel: 'Intermedia',
    maxLabel: 'Programada',
    icon: '📋',
    group: 'method',
  },
  {
    key: 'correction',
    label: 'Corrección',
    minLabel: 'General',
    middleLabel: 'Balanceada',
    maxLabel: 'Detallada',
    icon: '🔍',
    group: 'method',
  },
]

export interface CoachTagDefinition {
  key: string
  label: string
  icon: string
}

export const COACH_AUDIENCE_TAGS: CoachTagDefinition[] = [
  { key: 'babies', label: 'Bebés', icon: '👶' },
  { key: 'kids', label: 'Niños', icon: '🧒' },
  { key: 'teens', label: 'Adolescentes', icon: '🏊' },
  { key: 'adults', label: 'Adultos', icon: '👤' },
  { key: 'older_adults', label: 'Adultos mayores', icon: '🌿' },
]

export const COACH_SPECIALTY_TAGS: CoachTagDefinition[] = [
  { key: 'beginners', label: 'Principiantes', icon: '🌱' },
  { key: 'intermediate', label: 'Intermedios', icon: '🏊' },
  { key: 'advanced', label: 'Avanzados', icon: '💪' },
  { key: 'technique', label: 'Técnica', icon: '🧠' },
  { key: 'open_water', label: 'Aguas abiertas', icon: '🌊' },
  { key: 'triathlon', label: 'Triatlón', icon: '🚴' },
  { key: 'competition', label: 'Competencia', icon: '🏆' },
  { key: 'rehab', label: 'Rehabilitación', icon: '🩺' },
  { key: 'fitness', label: 'Condición física', icon: '🔥' },
]

/** Form scale is 1..METRIC_MAX; the radar still draws on a 5-ring scheme. */
export const METRIC_MAX = 10
/** Radar rings (visual scheme), unchanged regardless of METRIC_MAX. */
export const RADAR_LEVELS = 5

export const DEFAULT_COACH_METRICS: CoachMetrics = {
  communication: 5,
  energy: 5,
  motivation: 5,
  attention: 5,
  goal: 5,
  methodology: 5,
  planning: 5,
  correction: 5,
}

// Radar principal: 7 dimensiones más representativas del estilo del coach.
// Planning se muestra en el perfil detallado pero queda fuera del radar
// para mantener la gráfica limpia.
export const RADAR_METRICS: Array<{
  key: keyof CoachMetrics
  label: string
}> = [
  'goal',
  'methodology',
  'correction',
  'attention',
  'motivation',
  'energy',
  'communication',
].map((key) => {
  const metric = COACH_METRICS.find((m) => m.key === key)
  if (!metric) throw new Error(`Metric definition not found for key: ${key}`)
  return { key: metric.key, label: metric.label }
})

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
