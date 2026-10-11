import type { Booking } from '@/lib/coach-booking'

export const ATHLETE_UPCOMING_COUNT_EVENT = 'nadamas:athlete-upcoming-count'
export type AthleteUpcomingCountUpdate = { uid: string; schoolId: string | null; count: number }

export function isPastAthleteBooking(booking: Booking) {
  if (booking.status === 'cancelled') return true
  const endTimestamp = Date.parse(
    `${booking.date}T${booking.endTime || booking.startTime || '23:59'}`
  )
  return Number.isFinite(endTimestamp) && endTimestamp < Date.now()
}
