import type { Booking } from '@/lib/coach-booking'

export function isPastAthleteBooking(booking: Booking) {
  if (booking.status === 'cancelled') return true
  const endTimestamp = Date.parse(
    `${booking.date}T${booking.endTime || booking.startTime || '23:59'}`
  )
  return Number.isFinite(endTimestamp) && endTimestamp < Date.now()
}
