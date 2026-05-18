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
  return offering.placeName?.trim() || 'Lugar por definir'
}

export function offeringHeadline(offering: CoachClassOffering): string {
  const icon = offering.mode === 'home' ? '🏠' : '📍'
  const group =
    offering.groupType === 'grupal'
      ? offering.maxPeople
        ? `Grupal (máx ${offering.maxPeople})`
        : 'Grupal'
      : 'Particular'
  return `${icon} ${group} · ${offeringPlaceLabel(offering)}`
}

export function offeringWhen(offering: CoachClassOffering): string {
  const schedules = resolveOfferingSchedules(offering)
  if (!schedules.length) return 'Horarios por definir'
  return schedules
    .map((schedule) => {
      const days = schedule.days.join(', ') || 'Días por definir'
      const time =
        schedule.startTime && schedule.endTime ? ` · ${schedule.startTime}–${schedule.endTime}` : ''
      return `${days}${time}`
    })
    .join(' · ')
}

export function offeringPrice(offering: CoachClassOffering): string {
  const unit = OFFERING_UNITS.find((u) => u.value === offering.unit)?.label || 'por clase'
  const cents = offeringPriceCents(offering)
  return cents !== null ? `${formatPesos(cents)} ${unit}` : `$ — ${unit}`
}

/** Compact card label: a price range when comparable, otherwise the cheapest priced offering. */
export function offeringsPriceSummary(offerings: CoachClassOffering[]): string {
  const priced = offerings
    .filter((o) => offeringPriceCents(o) !== null)
    .sort((a, b) => (offeringPriceCents(a) as number) - (offeringPriceCents(b) as number))
  if (!priced.length) return 'Precio por definir'

  const units = new Set(priced.map((offering) => offering.unit))
  const min = offeringPriceCents(priced[0]) as number
  const max = offeringPriceCents(priced[priced.length - 1]) as number
  if (units.size === 1 && min !== max) {
    return `${formatPesosCompact(min)} - ${formatPesosCompact(max)}`
  }

  return offeringPrice(priced[0])
}

export function offeringsAvailabilitySummary(offerings: CoachClassOffering[]): string {
  if (!offerings.length) return 'Horarios por publicar'
  const weeklySlotCount = offerings.reduce(
    (total, offering) =>
      total +
      resolveOfferingSchedules(offering).reduce(
        (scheduleTotal, schedule) => scheduleTotal + schedule.days.length,
        0
      ),
    0
  )
  if (!weeklySlotCount) return 'Horarios por publicar'
  return `${weeklySlotCount} ${weeklySlotCount === 1 ? 'horario' : 'horarios'} por semana`
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
  const day = Object.entries(DAY_TO_INDEX).find(([, index]) => index === date.getDay())?.[0]
  if (!day || !schedule.days.includes(day)) return false

  const mode = schedule.availabilityMode ?? 'always'
  if (mode === 'always') return true
  if (mode === 'dates') return (schedule.availableDates || []).includes(dateKey(date))

  const nextWeek = startOfWeek(addDays(new Date(), 7))
  const weekStart = startOfWeek(date)
  return dateKey(nextWeek) === dateKey(weekStart)
}
