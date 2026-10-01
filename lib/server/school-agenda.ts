import { WEEKDAY_LABELS } from '@/lib/coach-offerings'

export function legacySchoolOfferings(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const slot = item as Record<string, unknown>
    const day = typeof slot.day === 'number' ? WEEKDAY_LABELS[slot.day] : undefined
    const startTime = typeof slot.start === 'string' ? slot.start : ''
    const endTime = typeof slot.end === 'string' ? slot.end : ''
    if (!day || !startTime || !endTime) return []
    return [
      {
        id: `school-legacy-${index}`,
        mode: 'fixed' as const,
        placeName: '',
        groupType: 'particular' as const,
        maxPeople: null,
        schedules: [
          {
            id: `school-legacy-${index}-schedule`,
            timeMode: 'fixed' as const,
            days: [day],
            startTime,
            endTime,
            availabilityMode: 'always' as const,
            availableDates: [],
          },
        ],
        currency: 'MXN' as const,
        unit: 'clase' as const,
        priceCents: null,
      },
    ]
  })
}
