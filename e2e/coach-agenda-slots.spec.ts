import { expect, test } from '@playwright/test'
import { buildAvailableSlots } from '../lib/coach-agenda'
import { createOffering, offeringWithHours, resolveOfferingSchedules } from '../lib/coach-offerings'
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
})
