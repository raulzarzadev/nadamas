import type { TrainingCycle } from './training-planner'

const DAY = 86400000
const parseDay = (value: string) => {
  const time = Date.parse(`${value}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 10) === value
    ? time
    : NaN
}

export function sessionCalendarGroup(value: string) {
  const time = parseDay(value)
  if (!Number.isFinite(time)) return null
  const date = new Date(time)
  const monday = time - ((date.getUTCDay() + 6) % 7) * DAY
  const short = (time: number) =>
    new Date(time).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return {
    month: value.slice(0, 7),
    monthLabel: date.toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    week: new Date(monday).toISOString().slice(0, 10),
    weekLabel: `Semana del ${short(monday)} al ${short(monday + 6 * DAY)}`,
  }
}

/** Append missing dates only, retaining existing descriptions, IDs and workouts. */
export function buildDailySessions(cycle: TrainingCycle, newId: () => string): TrainingCycle {
  const start = parseDay(cycle.startDate),
    end = parseDay(cycle.endDate)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return cycle
  const descriptions = cycle.objectives ?? [
    ...new Set(
      cycle.goal
        .split('\n')
        .map((text) => text.trim())
        .filter(Boolean)
    ),
  ]
  const existing = new Set(cycle.objectiveDates?.filter(Boolean))
  const next = {
    ...cycle,
    objectives: [...descriptions],
    objectiveIds: descriptions.map((_, index) => cycle.objectiveIds?.[index] ?? newId()),
    objectiveTitles: descriptions.map(
      (text, index) => cycle.objectiveTitles?.[index] ?? text.split('\n')[0]
    ),
    objectiveDates: descriptions.map((_, index) => cycle.objectiveDates?.[index] ?? ''),
    objectiveWorkouts: descriptions.map((_, index) => cycle.objectiveWorkouts?.[index] ?? []),
  }
  for (let time = start; time <= end; time += DAY) {
    const date = new Date(time).toISOString().slice(0, 10)
    if (existing.has(date)) continue
    next.objectives.push('')
    next.objectiveIds.push(newId())
    next.objectiveTitles.push(
      new Date(time).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    )
    next.objectiveDates.push(date)
    next.objectiveWorkouts.push([])
  }
  const order = next.objectiveDates
    .map((_, index) => index)
    .sort((a, b) => next.objectiveDates[a].localeCompare(next.objectiveDates[b]))
  const sorted = {
    ...next,
    objectives: order.map((index) => next.objectives[index]),
    objectiveIds: order.map((index) => next.objectiveIds[index]),
    objectiveTitles: order.map((index) => next.objectiveTitles[index]),
    objectiveDates: order.map((index) => next.objectiveDates[index]),
    objectiveWorkouts: order.map((index) => next.objectiveWorkouts[index]),
  }
  sorted.goal = sorted.objectives.join('\n')
  return sorted
}
