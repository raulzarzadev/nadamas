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

export interface CoachMetricDefinition {
  key: keyof CoachMetrics
  label: string
  minLabel: string
  maxLabel: string
  icon: string
}

export const COACH_METRICS: CoachMetricDefinition[] = [
  { key: 'intensity', label: 'Intensidad', minLabel: 'Relajado', maxLabel: 'Exigente', icon: '⚡' },
  {
    key: 'methodology',
    label: 'Metodología',
    minLabel: 'Intuitiva',
    maxLabel: 'Estructurada',
    icon: '🧭',
  },
  {
    key: 'communication',
    label: 'Comunicación',
    minLabel: 'Motivacional',
    maxLabel: 'Técnico',
    icon: '💬',
  },
  { key: 'patience', label: 'Paciencia', minLabel: 'Rápido', maxLabel: 'Paciente', icon: '🌊' },
  {
    key: 'attention',
    label: 'Atención',
    minLabel: 'Grupal',
    maxLabel: 'Personalizada',
    icon: '🎯',
  },
  {
    key: 'training',
    label: 'Entrenamiento',
    minLabel: 'Recreativo',
    maxLabel: 'Competitivo',
    icon: '🏊',
  },
  {
    key: 'planning',
    label: 'Planeación',
    minLabel: 'Improvisado',
    maxLabel: 'Planeado',
    icon: '📋',
  },
  {
    key: 'connection',
    label: 'Relación con el agua',
    minLabel: 'Deportiva',
    maxLabel: 'Meditativa',
    icon: '🌿',
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
