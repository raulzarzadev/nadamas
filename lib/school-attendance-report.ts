import { fromZonedTime } from 'date-fns-tz'
import type { SchoolClassOccurrence } from './school'

export interface AttendanceReportClass {
  id: string
  date: string
  startTime: string
  endTime: string
  title: string
  bookingCoachId?: string
  enrolled: number
  attended: number
  studentIds: string[]
  attendedStudentIds: string[]
}
export interface SchoolAttendanceReport {
  today: string
  classes: AttendanceReportClass[]
  students: Array<{
    id: string
    name: string
    month: number
    week: number
    today: number
    expiresOn: string | null
    remaining: number | null
  }>
}

export function attendanceReportClasses(
  classes: Array<SchoolClassOccurrence & { sourceOccurrenceIds?: string[] }>,
  records: Array<{ sourceId: string; studentId: string; attended?: boolean; updatedAt?: number }>,
  timezone: string,
  now = Date.now()
): AttendanceReportClass[] {
  const latest = new Map<string, (typeof records)[number]>()
  for (const record of records) {
    const key = `${record.sourceId}|${record.studentId}`
    if ((record.updatedAt || 0) >= (latest.get(key)?.updatedAt || 0)) latest.set(key, record)
  }
  return classes
    .filter(
      (item) =>
        item.status !== 'cancelled' &&
        fromZonedTime(`${item.date}T${item.endTime}`, timezone).getTime() <= now
    )
    .map((item) => {
      const sources = new Set([item.id, ...(item.sourceOccurrenceIds || [])])
      const studentIds = [...new Set(item.studentIds)]
      const attendedStudentIds = studentIds.filter((id) =>
        [...sources].some((source) => latest.get(`${source}|${id}`)?.attended === true)
      )
      return {
        id: item.id,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        title: item.title,
        enrolled: studentIds.length,
        attended: attendedStudentIds.length,
        studentIds,
        attendedStudentIds,
      }
    })
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
}
