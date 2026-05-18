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
    icon: '🧠',
    bg: 'rgba(249,168,212,0.28)',
    border: 'rgba(236,72,153,0.55)',
  },
  {
    id: 'method',
    label: 'Metodología',
    icon: '⚙️',
    bg: 'rgba(144,224,239,0.32)',
    border: 'rgba(0,180,216,0.55)',
  },
]

export interface CoachMetricDefinition {
  key: keyof CoachMetrics
  label: string
  minLabel: string
  maxLabel: string
  icon: string
  group: MetricGroupId
}

export const COACH_METRICS: CoachMetricDefinition[] = [
  {
    key: 'intensity',
    label: 'Intensidad',
    minLabel: 'Relajado',
    maxLabel: 'Exigente',
    icon: '⚡',
    group: 'method',
  },
  {
    key: 'methodology',
    label: 'Metodología',
    minLabel: 'Intuitiva',
    maxLabel: 'Estructurada',
    icon: '🧭',
    group: 'method',
  },
  {
    key: 'communication',
    label: 'Comunicación',
    minLabel: 'Motivacional',
    maxLabel: 'Técnico',
    icon: '💬',
    group: 'personality',
  },
  {
    key: 'patience',
    label: 'Paciencia',
    minLabel: 'Rápido',
    maxLabel: 'Paciente',
    icon: '🌊',
    group: 'personality',
  },
  {
    key: 'attention',
    label: 'Atención',
    minLabel: 'Grupal',
    maxLabel: 'Personalizada',
    icon: '🎯',
    group: 'personality',
  },
  {
    key: 'training',
    label: 'Entrenamiento',
    minLabel: 'Recreativo',
    maxLabel: 'Competitivo',
    icon: '🏊',
    group: 'method',
  },
  {
    key: 'planning',
    label: 'Planeación',
    minLabel: 'Improvisado',
    maxLabel: 'Planeado',
    icon: '📋',
    group: 'method',
  },
  {
    key: 'connection',
    label: 'Relación con el agua',
    minLabel: 'Deportiva',
    maxLabel: 'Meditativa',
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

export const RADAR_METRICS: Array<{
  key: keyof CoachMetrics
  label: string
}> = COACH_METRICS.map(({ key, label }) => ({ key, label }))

export function normalizeCoachMetrics(metrics?: Partial<CoachMetrics> | null): CoachMetrics {
  return { ...DEFAULT_COACH_METRICS, ...(metrics || {}) }
}
