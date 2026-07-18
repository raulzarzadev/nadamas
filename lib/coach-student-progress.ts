/** Legacy string levels stored before the numeric 1-4 scale. */
const LEGACY_LEVEL_MAP: Record<string, number> = {
  Inicial: 1,
  Básico: 2,
  Intermedio: 3,
  Avanzado: 4,
  Competitivo: 4,
}

export interface StudentProgress {
  id: string
  coachId: string
  athleteId: string
  athleteName: string
  athleteEmail: string | null
  athletePhone?: string
  athleteAddress?: string
  athleteLocation?: string
  /** 1-4. Legacy docs may still hold a string; normalize with normalizeLevelValue. */
  level: number
  /** Sub-level 1-4 (field name kept for data compatibility). */
  coachAssessment: number
  /** Last session result 1-4; absent on docs saved before this field existed. */
  result?: number
  lastNote: string
  createdAt: number
  updatedAt: number
}

export interface StudentProgressInput {
  level?: unknown
  coachAssessment?: unknown
  result?: unknown
  lastNote?: unknown
}

/** One timestamped progress record in a student's history, anchored to a class. */
export interface StudentProgressEntry {
  id: string
  coachId: string
  athleteId: string
  /** Booking the entry belongs to; absent on entries saved before anchoring. */
  bookingId?: string
  level: number
  coachAssessment: number
  result?: number
  note: string
  createdAt: number
  updatedAt?: number
}

/** Deterministic entry id: one progress record per class. */
export function bookingProgressEntryId(bookingId: string) {
  return `booking_${bookingId}`
}

export function studentProgressId(coachId: string, athleteId: string) {
  return `${coachId}_${athleteId}`
}

export function clampScale(value: unknown, fallback: number) {
  const score = Number(value)
  if (!Number.isFinite(score)) return fallback
  return Math.min(4, Math.max(1, Math.round(score)))
}

export function normalizeLevelValue(value: unknown): number {
  if (typeof value === 'string' && value in LEGACY_LEVEL_MAP) return LEGACY_LEVEL_MAP[value]
  return clampScale(value, 1)
}

/** Renders the combined position, e.g. level 3 + sub-level 2 -> "3.2". */
export function formatStudentLevel(item: { level: unknown; coachAssessment: unknown }) {
  return `${normalizeLevelValue(item.level)}.${clampScale(item.coachAssessment, 1)}`
}

/**
 * Student position derived from the most recent entries: average of the last
 * `window` entries on the combined 1-16 scale ((level-1)*4 + subLevel),
 * rounded up so recent good sessions pull the level upward.
 */
export function computeStudentPosition(
  entries: Array<Pick<StudentProgressEntry, 'level' | 'coachAssessment' | 'createdAt'>>,
  window = 5
) {
  const recent = [...entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, window)
  if (recent.length === 0) return { level: 1, coachAssessment: 1 }
  const total = recent.reduce(
    (sum, entry) =>
      sum + (normalizeLevelValue(entry.level) - 1) * 4 + clampScale(entry.coachAssessment, 1),
    0
  )
  const score = Math.ceil(total / recent.length)
  return { level: Math.floor((score - 1) / 4) + 1, coachAssessment: ((score - 1) % 4) + 1 }
}

export function normalizeStudentProgressInput(input: StudentProgressInput) {
  return {
    level: normalizeLevelValue(input.level),
    coachAssessment: clampScale(input.coachAssessment, 1),
    result: clampScale(input.result, 3),
    lastNote: limitText(input.lastNote, 800),
  }
}

function limitText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
