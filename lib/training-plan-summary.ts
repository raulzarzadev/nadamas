import type {
  TrainingPlanAuthor,
  TrainingPlanSummary,
} from '@/firebase/training-plans/training-plan.model'
import type { TrainingCycle } from '@/lib/training-planner'

const DAY_MS = 86400000
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const WEEKDAY_LABELS: Record<number, string> = {
  1: 'L',
  2: 'Ma',
  3: 'Mi',
  4: 'J',
  5: 'V',
  6: 'S',
  0: 'D',
}

export type TrainingPlanStatus =
  | { kind: 'upcoming'; days: number }
  | { kind: 'active' }
  | { kind: 'finished' }

const dayNumber = (value: string) => Date.parse(`${value}T00:00:00Z`) / DAY_MS

export function buildTrainingPlanSummary(
  cycles: TrainingCycle[],
  author: TrainingPlanAuthor
): TrainingPlanSummary {
  const macro = cycles.find((cycle) => cycle.type === 'macro')
  return {
    title: (macro?.title ?? '').slice(0, 300),
    goal: (macro?.goal ?? '').slice(0, 300),
    content: (macro?.content ?? '').slice(0, 2000),
    startDate: macro?.startDate ?? '',
    endDate: macro?.endDate ?? '',
    sessionWeekdays: macro?.sessionWeekdays ?? [],
    authorName: author.name,
    authorPhoto: author.photo,
    authorRole: author.role,
  }
}

export function trainingPlanStatus(
  startDate: string,
  endDate: string,
  today: string
): TrainingPlanStatus {
  const now = dayNumber(today)
  const start = dayNumber(startDate)
  const end = dayNumber(endDate)
  if (Number.isFinite(start) && now < start) return { kind: 'upcoming', days: start - now }
  if (Number.isFinite(end) && now > end) return { kind: 'finished' }
  return { kind: 'active' }
}

export function trainingPlanStatusLabel(status: TrainingPlanStatus): string {
  if (status.kind === 'upcoming')
    return status.days === 1 ? 'Empieza mañana' : `Empieza en ${status.days} días`
  return status.kind === 'active' ? 'En curso' : 'Terminado'
}

export function weekdayLabels(days: number[]): string {
  return WEEKDAY_ORDER.filter((day) => days.includes(day))
    .map((day) => WEEKDAY_LABELS[day])
    .join(' · ')
}

export function planWeeks(startDate: string, endDate: string): number {
  const days = dayNumber(endDate) - dayNumber(startDate) + 1
  return Number.isFinite(days) ? Math.max(1, Math.ceil(days / 7)) : 1
}

const shortDay = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

/** `6 ene – 30 mar · 12 semanas` */
export function planRangeLabel(startDate: string, endDate: string): string {
  const weeks = planWeeks(startDate, endDate)
  return `${shortDay(startDate)} – ${shortDay(endDate)} · ${weeks === 1 ? '1 semana' : `${weeks} semanas`}`
}

export function subscriberCountLabel(count: number): string {
  return count === 1 ? '1 suscriptor' : `${count} suscriptores`
}
