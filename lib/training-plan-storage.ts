import type { TrainingCycle } from './training-planner'

type Workouts = NonNullable<TrainingCycle['objectiveWorkouts']>
export type StoredTrainingCycle = Omit<TrainingCycle, 'objectiveWorkouts'> & {
  objectiveWorkouts?: Record<string, Workouts[number]> | Workouts
}

/** Firestore does not accept arrays directly nested inside another array. */
export function encodeTrainingCycles(cycles: TrainingCycle[]): StoredTrainingCycle[] {
  return cycles.map((cycle) => {
    if (!cycle.objectiveWorkouts) return cycle
    return {
      ...cycle,
      objectiveWorkouts: Object.fromEntries(
        cycle.objectiveWorkouts.map((items, index) => [String(index), items])
      ),
    }
  })
}

export function decodeTrainingCycles(cycles: StoredTrainingCycle[]): TrainingCycle[] {
  return cycles.map((cycle) => {
    const stored = cycle.objectiveWorkouts
    if (!stored || Array.isArray(stored)) return cycle as TrainingCycle
    const count = Math.max(
      cycle.objectives?.length ?? 0,
      ...Object.keys(stored).map((key) => Number(key) + 1)
    )
    return {
      ...cycle,
      objectiveWorkouts: Array.from({ length: count }, (_, index) => stored[String(index)] ?? []),
    }
  })
}
