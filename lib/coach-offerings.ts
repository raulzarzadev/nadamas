import type {
  CoachClassOffering,
  CoachOfferingSchedule,
  CoachPublic,
} from '@/firebase/coaches/coach.model'

export const OFFERING_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const OFFERING_UNITS: { value: CoachClassOffering['unit']; label: string }[] = [
  { value: 'clase', label: 'por clase' },
  { value: 'sesión', label: 'por sesión' },
  { value: 'mes', label: 'por mes' },
  { value: 'paquete', label: 'por paquete' },
]

export function createOffering(): CoachClassOffering {
  return {
    id: crypto.randomUUID(),
    mode: 'fixed',
    placeName: '',
    locationUrl: '',
    coverageArea: '',
    onlineDetails: '',
    groupType: 'particular',
    maxPeople: null,
    schedules: [createOfferingSchedule()],
    priceCents: null,
    currency: 'MXN',
    unit: 'clase',
    details: '',
  }
}

export function createOfferingSchedule(): CoachOfferingSchedule {
  return {
    id: crypto.randomUUID(),
    timeMode: 'fixed',
    days: [],
    startTime: '06:00',
    endTime: '07:00',
    availabilityMode: 'always',
    availableDates: [],
  }
}

/**
 * Derive offerings from legacy teachingLocations when classOfferings is
 * absent. Offering id embeds the legacy location id + slot index so old
 * booking links keep resolving.
 */
export function deriveOfferingsFromLegacy(
  coach: Pick<CoachPublic, 'teachingLocations' | 'priceOptions'>
): CoachClassOffering[] {
  const locations = coach.teachingLocations || []
  const prices = coach.priceOptions || []
  const onlyPrice =
    locations.length <= 1 && prices.length === 1 && prices[0].amount !== null ? prices[0] : null

  return locations.flatMap((location) =>
    location.availability.map((slot, slotIndex) => ({
      id: `${location.id}:${slotIndex}`,
      mode: 'fixed' as const,
      placeName: location.name || '',
      locationUrl: location.locationUrl || '',
      imageUrl: location.imageUrl,
      coverageArea: '',
      groupType: 'particular' as const,
      maxPeople: null,
      schedules: [
        {
          id: `${location.id}:${slotIndex}:schedule`,
          days: slot.days,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
      ],
      days: slot.days,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: onlyPrice?.durationMinutes ?? 60,
      price: onlyPrice?.amount ?? null,
      priceCents: onlyPrice?.amount !== null && onlyPrice ? onlyPrice.amount * 100 : null,
      currency: 'MXN' as const,
      unit: onlyPrice?.unit ?? ('clase' as const),
      details: onlyPrice?.details || '',
    }))
  )
}

/** classOfferings if present, else legacy-derived. */
export function resolveOfferings(
  coach: Pick<CoachPublic, 'classOfferings' | 'teachingLocations' | 'priceOptions'>
): CoachClassOffering[] {
  if (coach.classOfferings?.length) return coach.classOfferings
  return deriveOfferingsFromLegacy(coach)
}

export function offeringPlaceLabel(offering: CoachClassOffering): string {
  if (offering.mode === 'home') {
    return offering.coverageArea?.trim() || 'A domicilio'
  }
  if (offering.mode === 'online') {
    return offering.onlineDetails?.trim() || 'En línea'
  }
  return offering.placeName?.trim() || 'Lugar por definir'
}

export function offeringTypeLabel(offering: CoachClassOffering): string {
  if (offering.groupType === 'grupal') {
    return offering.maxPeople ? `Grupal (máx ${offering.maxPeople})` : 'Grupal'
  }
  return 'Particular'
}

export function offeringContextLabel(offering: CoachClassOffering): string {
  if (offering.mode === 'online') return 'En línea'
  if (offering.mode === 'home') {
    const area = offering.coverageArea?.trim()
    return area ? `En ${area}` : 'A domicilio'
  }
  return offering.placeName?.trim() || 'Lugar por definir'
}

export function offeringIcon(offering: CoachClassOffering): string {
  return offering.mode === 'home' ? '🏠' : offering.mode === 'online' ? '💻' : '📍'
}

export function offeringWhen(offering: CoachClassOffering): string {
  const schedules = resolveOfferingSchedules(offering)
  if (!schedules.length) return 'Horarios por definir'
  return schedules
    .map((schedule) => {
      if (scheduleIsOpen(schedule)) return 'Horario abierto'
      const days = schedule.days.join(', ') || 'Días por definir'
      const time =
        schedule.startTime && schedule.endTime ? ` · ${schedule.startTime}–${schedule.endTime}` : ''
      return `${days}${time}`
    })
    .join(' · ')
}

export function offeringScheduleSummary(offering: CoachClassOffering): string {
  const schedules = resolveOfferingSchedules(offering)
  if (!schedules.length) return 'Horarios por definir'
  if (schedules.some(scheduleIsOpen)) return 'Horario abierto'

  const availableCount = schedules.reduce((total, schedule) => total + schedule.days.length, 0)
  if (!availableCount) return 'Horarios por definir'

  return `Horario disponible (${availableCount})`
}

export function offeringPrice(offering: CoachClassOffering): string {
  const unit = OFFERING_UNITS.find((u) => u.value === offering.unit)?.label || 'por clase'
  const cents = offeringPriceCents(offering)
  return cents !== null ? `${formatPesos(cents)} ${unit}` : `$ — ${unit}`
}

export function offeringsAvailabilitySummary(offerings: CoachClassOffering[]): string {
  if (!offerings.length) return 'Horarios por publicar'
  const schedules = offerings.flatMap(resolveOfferingSchedules)
  const openScheduleCount = schedules.filter(scheduleIsOpen).length
  const now = new Date()
  const dateWindowStart = firstUpcomingAvailableDate(schedules, now)
  const dateWindowEnd = dateWindowStart ? dateKey(addDays(dateFromKey(dateWindowStart), 6)) : null
  const slotCounts = schedules.reduce(
    (totals, schedule) => {
      if (scheduleIsOpen(schedule)) return totals

      const mode = schedule.availabilityMode ?? 'always'
      if (mode === 'always') {
        totals.weekly += schedule.days.length
        return totals
      }
      if (mode === 'next_week') {
        totals.nextWeek += schedule.days.length
        return totals
      }

      totals.published += upcomingAvailableDateCount(schedule, now, dateWindowStart, dateWindowEnd)
      return totals
    },
    { weekly: 0, nextWeek: 0, published: 0 }
  )
  const totalSlots = slotCounts.weekly + slotCounts.nextWeek + slotCounts.published
  const openLabel = openScheduleCount ? ' + abierto' : ''

  if (openScheduleCount && !totalSlots) return 'Horario abierto'
  if (!totalSlots) return 'Horarios por publicar'
  if (slotCounts.weekly && !slotCounts.nextWeek && !slotCounts.published) {
    return `${slotCounts.weekly} ${slotCounts.weekly === 1 ? 'horario' : 'horarios'} por semana${openLabel}`
  }
  if (slotCounts.nextWeek && !slotCounts.weekly && !slotCounts.published) {
    return `${slotCounts.nextWeek} ${slotCounts.nextWeek === 1 ? 'horario' : 'horarios'} la próxima semana${openLabel}`
  }
  if (slotCounts.published && !slotCounts.weekly && !slotCounts.nextWeek) {
    return `${slotCounts.published} ${slotCounts.published === 1 ? 'horario publicado' : 'horarios publicados'}${openLabel}`
  }
  return `${totalSlots} ${totalSlots === 1 ? 'horario disponible' : 'horarios disponibles'}${openLabel}`
}

export function hasPublishedOfferingSchedules(offerings: CoachClassOffering[]): boolean {
  const now = new Date()
  return offerings.flatMap(resolveOfferingSchedules).some((schedule) => {
    if (scheduleIsOpen(schedule)) return true
    const mode = schedule.availabilityMode ?? 'always'
    if (mode === 'dates') return upcomingAvailableDateCount(schedule, now) > 0
    return schedule.days.length > 0
  })
}

function firstUpcomingAvailableDate(schedules: CoachOfferingSchedule[], now: Date) {
  return schedules
    .filter((schedule) => (schedule.availabilityMode ?? 'always') === 'dates')
    .flatMap((schedule) =>
      [...new Set(schedule.availableDates || [])].filter((date) =>
        isUpcomingAvailableDate(schedule, date, now)
      )
    )
    .sort()[0]
}

function upcomingAvailableDateCount(
  schedule: CoachOfferingSchedule,
  now: Date,
  windowStart?: string | null,
  windowEnd?: string | null
) {
  return [...new Set(schedule.availableDates || [])].filter((date) => {
    if (!isUpcomingAvailableDate(schedule, date, now)) return false
    if (windowStart && date < windowStart) return false
    if (windowEnd && date > windowEnd) return false
    return true
  }).length
}

function isUpcomingAvailableDate(schedule: CoachOfferingSchedule, date: string, now: Date) {
  const today = dateKey(now)
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`

  if (date < today) return false
  if (date === today && schedule.startTime <= currentTime) return false
  if (!schedule.days.length) return true

  const day = WEEKDAY_LABELS[new Date(`${date}T12:00:00`).getDay()]
  return schedule.days.includes(day)
}

export function resolveOfferingSchedules(offering: CoachClassOffering): CoachOfferingSchedule[] {
  if (offering.schedules?.length) return offering.schedules
  if (offering.days?.length && offering.startTime && offering.endTime) {
    return [
      {
        id: `${offering.id}:legacy`,
        days: offering.days,
        startTime: offering.startTime,
        endTime: offering.endTime,
      },
    ]
  }
  return []
}

export function offeringPriceCents(offering: CoachClassOffering) {
  if (offering.priceCents !== undefined) return offering.priceCents
  return offering.price !== undefined && offering.price !== null ? offering.price * 100 : null
}

export function scheduleIsOpen(schedule: CoachOfferingSchedule) {
  return schedule.timeMode === 'open'
}

export function formatPesos(cents: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatPesosCompact(cents: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export const DAY_TO_INDEX: Record<string, number> = {
  Dom: 0,
  Lun: 1,
  Mar: 2,
  Mié: 3,
  Jue: 4,
  Vie: 5,
  Sáb: 6,
}

export function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay()
  const distance = day === 0 ? -6 : 1 - day
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() + distance)
  return next
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function scheduleIsAvailableOn(schedule: CoachOfferingSchedule, date: Date) {
  if (scheduleIsOpen(schedule)) return false

  const day = Object.entries(DAY_TO_INDEX).find(([, index]) => index === date.getDay())?.[0]
  if (!day || !schedule.days.includes(day)) return false

  const mode = schedule.availabilityMode ?? 'always'
  if (mode === 'always') return true
  if (mode === 'dates') return (schedule.availableDates || []).includes(dateKey(date))

  const nextWeek = startOfWeek(addDays(new Date(), 7))
  const weekStart = startOfWeek(date)
  return dateKey(nextWeek) === dateKey(weekStart)
}

/** Weekday short labels indexed by Date.getDay() (0 = Sunday). */
export const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** Selectable hour slots for the schedule editors (06:00–21:30). */
export const HOUR_OPTIONS = Array.from({ length: 32 }, (_, index) => {
  const totalMinutes = (index + 12) * 30
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
})

export function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00`)
}

export function addMinutes(time: string, minutesToAdd: number) {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  const total = Math.min(hour * 60 + minute + minutesToAdd, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function dayLabelsFromDates(dates: string[]) {
  return [...new Set(dates.map((date) => WEEKDAY_LABELS[new Date(`${date}T12:00:00`).getDay()]))]
}

export function initialDatesForOffering(offering: CoachClassOffering) {
  return [
    ...new Set(
      resolveOfferingSchedules(offering).flatMap((schedule) => schedule.availableDates || [])
    ),
  ].sort()
}

export function initialTimesForOffering(offering: CoachClassOffering) {
  return [
    ...new Set(
      resolveOfferingSchedules(offering)
        .filter((schedule) => !scheduleIsOpen(schedule) && schedule.startTime)
        .map((schedule) => schedule.startTime)
    ),
  ].sort()
}

/** Add (date × time) availability to an offering: one schedule per startTime with
 * merged availableDates (deduped). Recomputes day labels from the dates. */
export function offeringWithHours(
  offering: CoachClassOffering,
  dates: string[],
  times: string[],
  durationMinutes: number
): CoachClassOffering {
  const schedules = resolveOfferingSchedules(offering)
    .filter(
      (schedule) =>
        scheduleIsOpen(schedule) ||
        (schedule.availabilityMode === 'dates'
          ? (schedule.availableDates?.length ?? 0) > 0
          : schedule.days.length > 0)
    )
    .map((schedule) => ({ ...schedule }))
  for (const time of times) {
    let schedule = schedules.find((s) => !scheduleIsOpen(s) && s.startTime === time)
    if (!schedule) {
      schedule = {
        id: crypto.randomUUID(),
        timeMode: 'fixed',
        startTime: time,
        endTime: addMinutes(time, durationMinutes),
        availabilityMode: 'dates',
        days: [],
        availableDates: [],
      }
      schedules.push(schedule)
    }
    const merged = [...new Set([...(schedule.availableDates || []), ...dates])].sort()
    schedule.availableDates = merged
    schedule.days = dayLabelsFromDates(merged)
  }
  return { ...offering, schedules }
}

/** Remove (date,time) pairs from an offering. Drops schedules left with no dates. */
export function offeringWithoutHours(
  offering: CoachClassOffering,
  pairs: { date: string; time: string }[]
): CoachClassOffering {
  const remove = new Set(pairs.map((p) => `${p.date}|${p.time}`))
  const schedules = resolveOfferingSchedules(offering)
    .map((schedule) => {
      if (scheduleIsOpen(schedule)) return schedule
      const availableDates = (schedule.availableDates || []).filter(
        (date) => !remove.has(`${date}|${schedule.startTime}`)
      )
      return { ...schedule, availableDates, days: dayLabelsFromDates(availableDates) }
    })
    .filter((schedule) => scheduleIsOpen(schedule) || (schedule.availableDates?.length ?? 0) > 0)
  return { ...offering, schedules }
}

/** Remove (date,time) pairs from every offering that may contain them. */
export function offeringsWithoutHours(
  offerings: CoachClassOffering[],
  pairs: { date: string; time: string }[]
): CoachClassOffering[] {
  return offerings.map((offering) => offeringWithoutHours(offering, pairs))
}

export function existingTimesForSelectedDates(
  existingTimesByDate: Record<string, string[]>,
  dates: Iterable<string>
) {
  return [...new Set([...dates].flatMap((date) => existingTimesByDate[date] || []))].sort()
}

export function existingOccurrenceCount(
  existingTimesByDate: Record<string, string[]>,
  dates: Iterable<string>,
  selectedTimes: Set<string>
) {
  return [...dates].reduce(
    (total, date) =>
      total + (existingTimesByDate[date] || []).filter((time) => selectedTimes.has(time)).length,
    0
  )
}
