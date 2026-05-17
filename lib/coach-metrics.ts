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
  { key: 'methodology', label: 'Metodología', minLabel: 'Intuitiva', maxLabel: 'Estructurada', icon: '🧭' },
  { key: 'communication', label: 'Comunicación', minLabel: 'Motivacional', maxLabel: 'Técnico', icon: '💬' },
  { key: 'patience', label: 'Paciencia', minLabel: 'Rápido', maxLabel: 'Paciente', icon: '🌊' },
  { key: 'attention', label: 'Atención', minLabel: 'Grupal', maxLabel: 'Personalizada', icon: '🎯' },
  { key: 'training', label: 'Entrenamiento', minLabel: 'Recreativo', maxLabel: 'Competitivo', icon: '🏊' },
  { key: 'planning', label: 'Planeación', minLabel: 'Improvisado', maxLabel: 'Planeado', icon: '📋' },
  { key: 'connection', label: 'Relación con el agua', minLabel: 'Deportiva', maxLabel: 'Meditativa', icon: '🌿' },
]

export const DEFAULT_COACH_METRICS: CoachMetrics = {
  intensity: 3,
  methodology: 3,
  communication: 3,
  patience: 3,
  attention: 3,
  training: 3,
  planning: 3,
  connection: 3,
}

export const RADAR_METRICS: Array<{
  key: keyof CoachMetrics
  label: string
}> = COACH_METRICS.map(({ key, label }) => ({ key, label }))

export function normalizeCoachMetrics(
  metrics?: Partial<CoachMetrics> | null
): CoachMetrics {
  return { ...DEFAULT_COACH_METRICS, ...(metrics || {}) }
}
