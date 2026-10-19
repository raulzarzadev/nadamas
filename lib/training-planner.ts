import type { ClassTrainingBlock } from './class-training'

export interface ObjectiveWorkout {
  id: string
  observations?: string
  title?: string
  blocks: ClassTrainingBlock[]
}

export type CycleType = 'macro' | 'meso' | 'micro'
export interface TrainingCycle {
  id: string
  parentId: string | null
  type: CycleType
  title: string
  startDate: string
  endDate: string
  goal: string
  objectiveDates?: string[]
  objectiveIds?: string[]
  objectiveTitles?: string[]
  objectives?: string[]
  objectiveWorkouts?: (string | ObjectiveWorkout)[][]
  content: string
}
export const CYCLE_LABELS = { macro: 'MACRO-ciclo', meso: 'MESO-ciclo', micro: 'MICRO-ciclo' }
export const CHILD_CYCLE = { macro: 'meso', meso: 'micro' } as const

export function nextMesocycleRange(macro: TrainingCycle, cycles: TrainingCycle[]) {
  const day = (value: string) => Date.parse(`${value}T00:00:00Z`) / 86400000
  const first = day(macro.startDate)
  const last = day(macro.endDate)
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) return null
  const ends = cycles
    .filter((cycle) => cycle.parentId === macro.id)
    .map((cycle) => day(cycle.endDate))
    .filter(Number.isFinite)
  const start = Math.max(first, ...ends.map((end) => end + 1))
  if (start >= last) return null
  const end = Math.min(last, start + Math.max(2, Math.floor((last - first + 1) / 3)) - 1)
  const format = (value: number) => new Date(value * 86400000).toISOString().slice(0, 10)
  return { startDate: format(start), endDate: format(end) }
}

export function validateTrainingCycle(
  cycle: TrainingCycle,
  cycles: TrainingCycle[]
): string | null {
  if (!cycle.title.trim()) return 'Escribe un nombre para el ciclo.'
  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  if (
    (cycle.startDate && !validDate(cycle.startDate)) ||
    (cycle.endDate && !validDate(cycle.endDate))
  )
    return 'Elige fechas válidas.'
  if (cycle.startDate && cycle.endDate && cycle.endDate <= cycle.startDate)
    return 'La fecha final debe ser al menos el día siguiente al inicio.'
  const outside = (child: TrainingCycle, parent: TrainingCycle) =>
    [child.startDate, child.endDate].some(
      (date) =>
        date &&
        ((parent.startDate && date < parent.startDate) || (parent.endDate && date > parent.endDate))
    )
  if (cycle.type === 'macro') {
    if (cycle.parentId !== null) return 'El MACRO-ciclo debe ser el ciclo principal.'
  } else {
    const parent = cycles.find((item) => item.id === cycle.parentId)
    if (!parent || parent.type === 'micro' || CHILD_CYCLE[parent.type] !== cycle.type) {
      return 'Selecciona el ciclo al que pertenece.'
    }
    if (outside(cycle, parent)) {
      return 'Las fechas deben quedar dentro del ciclo principal.'
    }
  }
  if (cycles.some((item) => item.parentId === cycle.id && outside(item, cycle))) {
    return 'Las fechas deben incluir todos los ciclos que contiene.'
  }
  return null
}

/** Earlier starts extend ancestors instead of rejecting historical planning. */
export function updateCycleWithEarlierStart(
  cycles: TrainingCycle[],
  updated: TrainingCycle
): TrainingCycle[] {
  const next = cycles.some((cycle) => cycle.id === updated.id)
    ? cycles.map((cycle) => (cycle.id === updated.id ? updated : cycle))
    : [...cycles, updated]
  if (!updated.startDate) return next
  const visited = new Set([updated.id])
  let parentId = updated.parentId
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const index = next.findIndex((cycle) => cycle.id === parentId)
    if (index < 0) break
    const parent = next[index]
    if (parent.startDate && parent.startDate > updated.startDate)
      next[index] = { ...parent, startDate: updated.startDate }
    parentId = parent.parentId
  }
  return next
}
