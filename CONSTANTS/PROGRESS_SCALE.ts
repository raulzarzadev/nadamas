export interface ProgressScaleOption {
  value: number
  label: string
  emoji?: string
  /** Short scale name shown under the number (sub-levels). */
  sublabel?: string
  /** Level title, e.g. 'Adaptación y confianza'. */
  title?: string
  description?: string
  objectives?: string[]
}

// Methodology: "Del primer contacto al dominio del medio acuático".
// Animal names per level exist in the methodology poster but are omitted
// in-app for now.
export const PROGRESS_LEVELS: ProgressScaleOption[] = [
  {
    value: 1,
    label: '1',
    title: 'Adaptación y confianza',
    description: 'Etapa inicial: seguridad, respiración, flotación y primeros desplazamientos.',
    objectives: [
      'Miedo al agua',
      'Primer contacto',
      'Respiración',
      'Flotación',
      'Desplazamiento básico',
    ],
  },
  {
    value: 2,
    label: '2',
    title: 'Autonomía y aprendizaje',
    description: 'Nada de forma autónoma: coordinación, control corporal y seguridad en el agua.',
    objectives: ['Coordinación', 'Respiración', 'Flotación segura', 'Nado básico', 'Autonomía'],
  },
  {
    value: 3,
    label: '3',
    title: 'Rendimiento y desarrollo deportivo',
    description: 'Enfoque deportivo: velocidad, resistencia, fuerza y técnica.',
    objectives: ['Velocidad', 'Resistencia', 'Fuerza', 'Técnica', 'Posición en el agua'],
  },
  {
    value: 4,
    label: '4',
    title: 'Dominio acuático integral',
    description:
      'Nivel avanzado: capacidad deportiva, seguridad acuática y adaptación a distintos entornos.',
    objectives: ['Experiencia', 'Rendimiento', 'Seguridad', 'Rescate', 'Dominio total'],
  },
]

export const PROGRESS_SUBLEVELS: ProgressScaleOption[] = [
  { value: 1, label: '1', sublabel: 'Novato', description: 'Inicia esta etapa.' },
  { value: 2, label: '2', sublabel: 'Curioso', description: 'Gana confianza y explora.' },
  { value: 3, label: '3', sublabel: 'Aventurero', description: 'Asume nuevos retos.' },
  {
    value: 4,
    label: '4',
    sublabel: 'Maestro',
    description: 'Domina el nivel y está listo para avanzar.',
  },
]

export function progressSublevelInfo(value: number | undefined) {
  return PROGRESS_SUBLEVELS.find((item) => item.value === value)
}

export const PROGRESS_RESULTS: ProgressScaleOption[] = [
  { value: 1, label: 'Triste', emoji: '😢' },
  { value: 2, label: 'Enojado', emoji: '😠' },
  { value: 3, label: 'Neutro', emoji: '😐' },
  { value: 4, label: 'Feliz', emoji: '😊' },
]

export function progressResultEmoji(value: number | undefined) {
  return PROGRESS_RESULTS.find((item) => item.value === value)?.emoji || ''
}

export function progressLevelInfo(value: number | undefined) {
  return PROGRESS_LEVELS.find((item) => item.value === value)
}
