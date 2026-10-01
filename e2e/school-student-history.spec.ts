import { expect, test } from '@playwright/test'
import type { Booking } from '../lib/coach-booking'
import { schoolBookingHistoryStatus } from '../lib/school-student-history'

test('el historial no cuenta reservas futuras, canceladas o sin asistencia como clases tomadas', () => {
  const now = Date.parse('2026-09-30T18:00:00Z')
  const booking: Pick<Booking, 'date' | 'endTime' | 'status' | 'attended'> = {
    date: '2026-09-29',
    endTime: '10:00',
    status: 'confirmed',
  }
  const status = (overrides: Partial<typeof booking>) =>
    schoolBookingHistoryStatus({ ...booking, ...overrides }, 'America/Mexico_City', now)
  expect(status({})).toBe('unconfirmed')
  expect(status({ attended: false })).toBe('absent')
  expect(status({ attended: true })).toBe('taken')
  expect(status({ status: 'cancelled', attended: true })).toBe('cancelled')
  expect(status({ date: '2026-10-01', attended: true })).toBe('scheduled')
  expect(status({ status: 'pending', attended: true })).not.toBe('taken')
})
