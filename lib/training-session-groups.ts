import type { TrainingCycle } from './training-planner'
import { sessionCalendarGroup } from './training-session-builder'

export interface SessionItem {
  id: string
  index: number
}
export interface SessionWeek {
  id: string
  title: string
  items: SessionItem[]
}
export interface SessionMonth {
  id: string
  title: string
  weeks: SessionWeek[]
  count: number
}

/** Count sessions in a cycle and its descendants. */
export function countCycleSessions(cycles: TrainingCycle[], rootId: string): number {
  const visited = new Set<string>()
  const count = (id: string): number => {
    if (visited.has(id)) return 0
    visited.add(id)
    const cycle = cycles.find((item) => item.id === id)
    if (!cycle) return 0
    const own =
      cycle.type === 'micro'
        ? groupTrainingSessions(cycle).reduce((sum, month) => sum + month.count, 0)
        : 0
    return (
      own +
      cycles.filter((item) => item.parentId === id).reduce((sum, child) => sum + count(child.id), 0)
    )
  }
  return count(rootId)
}

export function groupTrainingSessions(value: TrainingCycle): SessionMonth[] {
  const descriptions = value.objectives ?? [
    ...new Set(
      value.goal
        .split('\n')
        .map((text) => text.trim())
        .filter(Boolean)
    ),
  ]
  const months = new Map<string, SessionMonth>()
  for (const [index] of descriptions.entries()) {
    const group = sessionCalendarGroup(value.objectiveDates?.[index] ?? '')
    const monthId = group?.month ?? 'undated'
    let month = months.get(monthId)
    if (!month) {
      month = { id: monthId, title: group?.monthLabel ?? 'Sin fecha', weeks: [], count: 0 }
      months.set(monthId, month)
    }
    const weekId = `${monthId}-${group?.week ?? 'undated'}`
    let week = month.weeks.find((item) => item.id === weekId)
    if (!week) {
      week = { id: weekId, title: group?.weekLabel ?? 'Sesiones sin fecha', items: [] }
      month.weeks.push(week)
    }
    week.items.push({ id: value.objectiveIds?.[index] ?? `objective-${index}`, index })
    month.count++
  }
  return [...months.values()]
}

/** Apply an index permutation while keeping all session data attached. */
export function reorderTrainingSessions(value: TrainingCycle, order: number[]): TrainingCycle {
  const descriptions = value.objectives ?? [
    ...new Set(
      value.goal
        .split('\n')
        .map((text) => text.trim())
        .filter(Boolean)
    ),
  ]
  if (
    order.length !== descriptions.length ||
    new Set(order).size !== descriptions.length ||
    order.some((index) => !Number.isInteger(index) || index < 0 || index >= descriptions.length)
  )
    return value
  const objectives = order.map((index) => descriptions[index])
  return {
    ...value,
    objectives,
    goal: objectives.join('\n'),
    objectiveIds: order.map((index) => value.objectiveIds?.[index] ?? `objective-${index}`),
    objectiveTitles: order.map(
      (index) => value.objectiveTitles?.[index] ?? descriptions[index].split('\n')[0]
    ),
    objectiveDates: order.map((index) => value.objectiveDates?.[index] ?? ''),
    objectiveWorkouts: order.map((index) => value.objectiveWorkouts?.[index] ?? []),
  }
}
