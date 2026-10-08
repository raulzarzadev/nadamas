import type { SchoolClassOccurrence } from '@/lib/school'

/** Classes are scoped to the requesting teacher by the server. */
export function coachVisibleSchoolStudentIds(
  classes: SchoolClassOccurrence[],
  _timezone: string,
  _now = new Date()
) {
  const visibleIds = new Set<string>()
  for (const occurrence of classes) {
    if (occurrence.status !== 'scheduled' && occurrence.status !== 'completed') continue
    for (const studentId of occurrence.studentIds) visibleIds.add(studentId)
  }
  return visibleIds
}
