import { fromZonedTime } from 'date-fns-tz'
import type { Booking } from '@/lib/coach-booking'
import type { SchoolStudent } from '@/lib/school'

export interface SchoolHistoryEvaluation {
  id: string
  direction: 'from-coach' | 'to-coach'
  coachId: string
  rating?: number
  comment: string
  level?: string
  result?: number
}

export interface SchoolHistoryClass {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  location: string
  coachIds: string[]
  status: 'taken' | 'scheduled' | 'cancelled' | 'absent' | 'unconfirmed'
  evaluations: SchoolHistoryEvaluation[]
}

export interface SchoolStudentHistory {
  classes: SchoolHistoryClass[]
  coachNames: Record<string, string>
}

export function studentSchoolBookings(
  bookings: readonly Booking[],
  student: SchoolStudent,
  teacherId?: string
) {
  const ids = new Set(
    [student.id, student.studentUserId, student.additionalProfileId].filter(Boolean)
  )
  return bookings.filter(
    (booking) =>
      booking.schoolId === student.schoolId &&
      ids.has(booking.athleteId) &&
      (!teacherId || booking.coachId === teacherId)
  )
}

export function schoolBookingHistoryStatus(
  booking: Pick<Booking, 'date' | 'endTime' | 'status' | 'attended'>,
  timezone: string,
  now = Date.now()
): SchoolHistoryClass['status'] {
  if (booking.status === 'cancelled') return 'cancelled'
  const end = fromZonedTime(`${booking.date}T${booking.endTime}`, timezone).getTime()
  if (!Number.isFinite(end) || end > now) return 'scheduled'
  if (
    booking.status === 'completed' ||
    (booking.status === 'confirmed' && booking.attended === true)
  )
    return 'taken'
  if (booking.attended === false) return 'absent'
  return 'unconfirmed'
}
