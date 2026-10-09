import type { Booking } from '@/lib/coach-booking'
import type { SchoolClassOccurrence, SchoolStudent } from '@/lib/school'
import { schoolBookingHistoryStatus, studentSchoolBookings } from './school-student-history'

type Record = {
  sourceId: string
  studentId: string
  coachId: string
  attended?: boolean
  updatedAt?: number
}

export function schoolStudentSummaries(
  students: SchoolStudent[],
  classes: SchoolClassOccurrence[],
  bookings: Booking[],
  records: Record[],
  timezone: string,
  teacherId?: string
) {
  const attendance = new Map<string, Record>()
  for (const record of records) {
    if (teacherId && record.coachId !== teacherId) continue
    const key = `${record.sourceId}|${record.studentId}`
    if ((record.updatedAt || 0) >= (attendance.get(key)?.updatedAt || 0))
      attendance.set(key, record)
  }
  return Object.fromEntries(
    students.map((student) => {
      const statuses = new Map<string, ReturnType<typeof schoolBookingHistoryStatus>>()
      let related = false
      for (const occurrence of classes) {
        if (
          !occurrence.studentIds?.includes(student.id) ||
          (teacherId && !occurrence.teacherIds?.includes(teacherId))
        )
          continue
        if (occurrence.status === 'scheduled' || occurrence.status === 'completed') related = true
        statuses.set(
          `class:${occurrence.id}`,
          schoolBookingHistoryStatus(
            {
              date: occurrence.date,
              endTime: occurrence.endTime,
              status: occurrence.status === 'cancelled' ? 'cancelled' : 'confirmed',
              attended: attendance.get(`${occurrence.id}|${student.id}`)?.attended,
            },
            timezone
          )
        )
      }
      for (const booking of studentSchoolBookings(bookings, student, teacherId)) {
        if (booking.status !== 'cancelled') related = true
        const key = booking.schoolClassId
          ? `class:${booking.schoolClassId}`
          : `booking:${booking.id}`
        if (!statuses.has(key)) statuses.set(key, schoolBookingHistoryStatus(booking, timezone))
      }
      return [
        student.id,
        {
          taken: [...statuses.values()].filter((status) => status === 'taken').length,
          scheduled: [...statuses.values()].filter((status) => status === 'scheduled').length,
          related,
        },
      ]
    })
  )
}
