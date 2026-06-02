export const STUDENT_LEVELS = [
  'Inicial',
  'Básico',
  'Intermedio',
  'Avanzado',
  'Competitivo',
] as const

export type StudentLevel = (typeof STUDENT_LEVELS)[number]

export interface StudentProgress {
  id: string
  coachId: string
  athleteId: string
  athleteName: string
  athleteEmail: string | null
  athletePhone?: string
  level: StudentLevel
  goal: string
  lastNote: string
  nextFocus: string
  coachAssessment: number
  createdAt: number
  updatedAt: number
}

export type StudentProgressInput = Partial<
  Pick<StudentProgress, 'level' | 'goal' | 'lastNote' | 'nextFocus' | 'coachAssessment'>
>

export function studentProgressId(coachId: string, athleteId: string) {
  return `${coachId}_${athleteId}`
}

export function normalizeStudentProgressInput(input: StudentProgressInput) {
  const level = STUDENT_LEVELS.includes(input.level as StudentLevel)
    ? (input.level as StudentLevel)
    : 'Inicial'

  return {
    level,
    goal: limitText(input.goal, 240),
    lastNote: limitText(input.lastNote, 800),
    nextFocus: limitText(input.nextFocus, 240),
    coachAssessment: clampScore(input.coachAssessment),
  }
}

function limitText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function clampScore(value: unknown) {
  const score = Number(value)
  if (!Number.isFinite(score)) return 1
  return Math.min(5, Math.max(1, Math.round(score)))
}
