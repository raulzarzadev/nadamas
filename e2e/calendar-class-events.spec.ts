import { expect, test } from '@playwright/test'
import { calendarClassEvents } from '../lib/calendar-class-events'
import type { Booking } from '../lib/coach-booking'

const booking = (id: string, name: string, changes: Partial<Booking> = {}): Booking => ({
  id,
  athleteId: id,
  athleteName: name,
  athleteEmail: null,
  coachId: 'coach',
  coachName: 'Coach',
  date: '2026-10-09',
  startTime: '07:00',
  endTime: '08:00',
  groupType: 'grupal',
  locationName: 'Alberca',
  mode: 'fixed',
  days: [],
  priceCents: null,
  currency: 'MXN',
  unit: 'clase',
  offeringId: 'offering',
  scheduleId: 'schedule',
  status: 'confirmed',
  source: 'coach',
  createdAt: 1,
  updatedAt: 2,
  ...changes,
})

test('el calendario del entrenador reúne alumnos y mantiene el evento al cambiar la lista', () => {
  const first = booking('a', 'Adri')
  const second = booking('b', 'Justi')
  const third = booking('c', 'Luis')
  const before = calendarClassEvents([first, second], 'coach')
  const after = calendarClassEvents([first, second, third, { ...third, id: 'duplicate' }], 'coach')
  expect(after).toHaveLength(1)
  expect(after[0].names).toEqual(['Adri', 'Justi', 'Luis'])
  expect(after[0].uid).toBe(before[0].uid)
  expect(
    calendarClassEvents([first, { ...second, status: 'cancelled' }], 'coach')[0].names
  ).toEqual(['Adri'])
})

test('separa escuelas, entrenadores y horarios y conserva la vista individual del atleta', () => {
  const first = booking('a', 'Adri')
  expect(
    calendarClassEvents(
      [
        first,
        booking('b', 'Justi', { schoolId: 'school' }),
        booking('c', 'Luis', { coachId: 'other' }),
        booking('d', 'Ana', { startTime: '09:00' }),
      ],
      'coach'
    )
  ).toHaveLength(4)
  expect(calendarClassEvents([first, booking('b', 'Justi')], 'athlete')).toHaveLength(2)
})
