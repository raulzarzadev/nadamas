import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import type { TrainingCycle } from './training-planner'

export interface TodayTrainingSession {
  planId: string
  macro: TrainingCycle
  meso: TrainingCycle
  micro: TrainingCycle
  sessionIndex: number
  title: string
  description: string
}

/** Match explicit session dates only, within the configured cycle hierarchy. */
export function getTrainingSessionsForDate(
  plans: TrainingPlan[],
  date: string
): TodayTrainingSession[] {
  const result: TodayTrainingSession[] = []
  const contains = (cycle: TrainingCycle) =>
    (!cycle.startDate || date >= cycle.startDate) && (!cycle.endDate || date <= cycle.endDate)
  for (const plan of plans) {
    const byId = new Map(plan.cycles.map((cycle) => [cycle.id, cycle]))
    for (const micro of plan.cycles) {
      if (micro.type !== 'micro' || !contains(micro)) continue
      const meso = micro.parentId ? byId.get(micro.parentId) : undefined
      const macro = meso?.parentId ? byId.get(meso.parentId) : undefined
      if (meso?.type !== 'meso' || macro?.type !== 'macro' || !contains(meso) || !contains(macro))
        continue
      for (const [sessionIndex, sessionDate] of (micro.objectiveDates ?? []).entries()) {
        if (sessionDate !== date) continue
        result.push({
          planId: plan.id,
          macro,
          meso,
          micro,
          sessionIndex,
          title: micro.objectiveTitles?.[sessionIndex]?.trim() || `Sesión ${sessionIndex + 1}`,
          description: micro.objectives?.[sessionIndex] ?? '',
        })
      }
    }
  }
  return result
}

export function localCalendarDate(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function sessionHasTraining(session: TodayTrainingSession): boolean {
  return (session.micro.objectiveWorkouts?.[session.sessionIndex] ?? []).some((workout) =>
    typeof workout === 'string'
      ? Boolean(workout.trim())
      : workout.blocks.some((block) => block.series.length > 0)
  )
}

export function getTodayTraining(
  plans: TrainingPlan[],
  today: string
): {
  sessions: TodayTrainingSession[]
  date: string
  context: 'today' | 'next' | 'last' | 'none'
} {
  const sessions = getTrainingSessionsForDate(plans, today).filter(sessionHasTraining)
  if (sessions.length) return { sessions, date: today, context: 'today' }
  const dates = [
    ...new Set(plans.flatMap((plan) => plan.cycles.flatMap((cycle) => cycle.objectiveDates ?? []))),
  ]
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date !== today)
    .sort()
  const candidates = [
    ...dates.filter((date) => date > today),
    ...dates.filter((date) => date < today).reverse(),
  ]
  for (const date of candidates) {
    const found = getTrainingSessionsForDate(plans, date).filter(sessionHasTraining)
    if (found.length) return { sessions: found, date, context: date > today ? 'next' : 'last' }
  }
  return { sessions: [], date: today, context: 'none' }
}

export function getTrainingDateNeighbors(
  plans: TrainingPlan[],
  date: string
): { previous: string | null; next: string | null } {
  const dates = [
    ...new Set(plans.flatMap((plan) => plan.cycles.flatMap((cycle) => cycle.objectiveDates ?? []))),
  ]
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort()
  const find = (values: string[]) =>
    values.find((value) => getTrainingSessionsForDate(plans, value).some(sessionHasTraining)) ??
    null
  return {
    previous: find(dates.filter((value) => value < date).reverse()),
    next: find(dates.filter((value) => value > date)),
  }
}
