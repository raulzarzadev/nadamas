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
    description:
      'Etapa inicial. La persona puede no saber nadar, tener miedo o incluso pánico al agua. Aquí trabaja seguridad, respiración, flotación y primeros desplazamientos.',
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
    description:
      'La persona ya se mueve con mayor confianza y comienza a nadar de forma autónoma. Desarrolla coordinación, control corporal y seguridad básica en alberca.',
    objectives: ['Coordinación', 'Respiración', 'Flotación segura', 'Nado básico', 'Autonomía'],
  },
  {
    value: 3,
    label: '3',
    title: 'Rendimiento y desarrollo deportivo',
    description:
      'Aquí el enfoque cambia hacia velocidad, resistencia, fuerza y técnica. También mejora la posición del cuerpo en el agua y la capacidad de sostener entrenamientos. Aún le falta experiencia para el dominio total.',
    objectives: ['Velocidad', 'Resistencia', 'Fuerza', 'Técnica', 'Posición en el agua'],
  },
  {
    value: 4,
    label: '4',
    title: 'Dominio acuático integral',
    description:
      'Nivel avanzado. Combina capacidad deportiva, experiencia, seguridad acuática y adaptación a distintos entornos. El 4.4 representa a un deportista de alto nivel, idealmente con certificación de guardavidas y gran control en el agua.',
    objectives: ['Experiencia', 'Rendimiento', 'Seguridad', 'Rescate', 'Dominio total'],
  },
]

export const PROGRESS_SUBLEVELS: ProgressScaleOption[] = [
  { value: 1, label: '1', sublabel: 'Novato' },
  { value: 2, label: '2', sublabel: 'Curioso' },
  { value: 3, label: '3', sublabel: 'Aventurero' },
  { value: 4, label: '4', sublabel: 'Maestro' },
]

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
