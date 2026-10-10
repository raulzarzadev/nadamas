import type { Booking } from '@/lib/coach-booking'
import type { PaymentEvent } from './reservations'
export function bookingPaymentEvent(
  booking: Pick<Booking, 'id' | 'coachId' | 'athleteId' | 'date' | 'startTime'> & Partial<Booking>,
  action: PaymentEvent['action'],
  actorId: string,
  options: Partial<PaymentEvent> = {}
): PaymentEvent {
  return {
    scope: booking.schoolId ? `school:${booking.schoolId}` : `coach:${booking.coachId}`,
    studentId: booking.additionalProfileId || booking.athleteProfileId || booking.athleteId,
    sourceId: booking.id,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    actorId,
    action,
    ...options,
  }
}
