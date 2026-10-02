import type { SchoolClassOccurrence } from '@/lib/school'

function schoolDateTimeKey(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .replace(',', '')
}

export function coachVisibleSchoolStudentIds(
  classes: SchoolClassOccurrence[],
  timezone: string,
  now = new Date()
) {
  const nowKey = schoolDateTimeKey(now, timezone)
  const visibleIds = new Set<string>()

  for (const occurrence of classes) {
    if (
      occurrence.status === 'scheduled' &&
      `${occurrence.date} ${occurrence.startTime}` >= nowKey
    ) {
      for (const studentId of occurrence.studentIds) visibleIds.add(studentId)
    }
  }

  const latestTaughtStudentIds = new Set<string>()
  const completedClasses = classes
    .filter(
      (occurrence) =>
        occurrence.status === 'completed' && `${occurrence.date} ${occurrence.startTime}` < nowKey
    )
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))

  for (const occurrence of completedClasses) {
    for (const studentId of occurrence.studentIds) {
      latestTaughtStudentIds.add(studentId)
      if (latestTaughtStudentIds.size >= 3) break
    }
    if (latestTaughtStudentIds.size >= 3) break
  }

  for (const studentId of latestTaughtStudentIds) visibleIds.add(studentId)
  return visibleIds
}
