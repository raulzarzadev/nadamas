import { expect, test } from '@playwright/test'
import { buildAvailableSlots } from '../lib/coach-agenda'
import {
  createOffering,
  existingOccurrenceCount,
  existingTimesForSelectedDates,
  offeringsWithoutHours,
  offeringWithHours,
  resolveOfferingSchedules,
} from '../lib/coach-offerings'
import type { CoachClassOffering } from '../types/coach'

const DATE = '2030-01-07'

function scheduledOffering(id: string, scheduleId: string): CoachClassOffering {
  return {
    ...createOffering(),
    id,
    placeName: 'Alberca de prueba',
    schedules: [
      {
        id: scheduleId,
        timeMode: 'fixed',
        startTime: '17:30',
        endTime: '18:30',
        availabilityMode: 'dates',
        days: ['Lun'],
        availableDates: [DATE],
      },
    ],
  }
}

test.describe('horarios de la agenda del coach', () => {
  test('muestra una sola fila cuando varias ofertas generan la misma fecha y hora', () => {
    const first = scheduledOffering('offering-1', 'schedule-1')
    const second = scheduledOffering('offering-2', 'schedule-2')
    first.schedules?.push({ ...first.schedules[0], id: 'schedule-duplicate' })

    const slots = buildAvailableSlots({
      coachId: 'coach-1',
      offerings: [first, second],
      bookings: [],
      blocks: [],
      startDate: new Date(2030, 0, 7),
      endDate: new Date(2030, 0, 7),
    })

    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({ date: DATE, startTime: '17:30', endTime: '18:30' })
  })

  test('guardar repetidamente la misma clase conserva un solo horario', () => {
    const initial = createOffering()
    const firstSave = offeringWithHours(initial, [DATE], ['17:30'], 60)
    const secondSave = offeringWithHours(firstSave, [DATE], ['17:30'], 60)
    const schedules = resolveOfferingSchedules(secondSave)

    expect(schedules).toHaveLength(1)
    expect(schedules[0]).toMatchObject({
      startTime: '17:30',
      endTime: '18:30',
      availableDates: [DATE],
      days: ['Lun'],
    })
  })

  test('elimina la hora de todas las ofertas que la contienen', () => {
    const offerings = [
      scheduledOffering('offering-1', 'schedule-1'),
      scheduledOffering('offering-2', 'schedule-2'),
    ]

    const updated = offeringsWithoutHours(offerings, [{ date: DATE, time: '17:30' }])
    const slots = buildAvailableSlots({
      coachId: 'coach-1',
      offerings: updated,
      bookings: [],
      blocks: [],
      startDate: new Date(2030, 0, 7),
      endDate: new Date(2030, 0, 7),
    })

    expect(updated.every((offering) => resolveOfferingSchedules(offering).length === 0)).toBe(true)
    expect(slots).toHaveLength(0)
  })

  test('un horario eliminado individualmente no vuelve a mostrarse', () => {
    const slots = buildAvailableSlots({
      coachId: 'coach-1',
      offerings: [scheduledOffering('offering-1', 'schedule-1')],
      bookings: [],
      blocks: [
        {
          id: 'hidden-block-1',
          coachId: 'coach-1',
          date: DATE,
          startTime: '17:30',
          endTime: '18:30',
          allDay: false,
          note: '',
          hidden: true,
          createdAt: 0,
          updatedAt: 0,
        },
      ],
      startDate: new Date(2030, 0, 7),
      endDate: new Date(2030, 0, 7),
    })

    expect(slots).toHaveLength(0)
  })

  test('restaurar un horario oculto reutiliza su schedule sin duplicarlo', () => {
    const offering = scheduledOffering('offering-1', 'schedule-1')
    const restored = offeringWithHours(offering, [DATE], ['17:30'], 60)
    const slots = buildAvailableSlots({
      coachId: 'coach-1',
      offerings: [restored],
      bookings: [],
      blocks: [],
      startDate: new Date(2030, 0, 7),
      endDate: new Date(2030, 0, 7),
    })

    expect(resolveOfferingSchedules(restored)).toHaveLength(1)
    expect(slots).toHaveLength(1)
  })

  test('reúne sin duplicados las horas existentes de todos los días seleccionados', () => {
    const existingTimesByDate = {
      '2030-01-07': ['17:30', '18:30'],
      '2030-01-08': ['18:30', '19:30'],
    }
    const dates = new Set(['2030-01-07', '2030-01-08'])
    const times = existingTimesForSelectedDates(existingTimesByDate, dates)

    expect(times).toEqual(['17:30', '18:30', '19:30'])
    expect(existingOccurrenceCount(existingTimesByDate, dates, new Set(times))).toBe(4)
  })
})
