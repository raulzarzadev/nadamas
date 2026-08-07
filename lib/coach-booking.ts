import type { CoachClassOffering, CoachPublic } from '@/firebase/coaches/coach.model'
import {
  addDays,
  DAY_TO_INDEX,
  dateKey,
  offeringPlaceLabel,
  offeringPriceCents,
  resolveOfferingSchedules,
  resolveOfferings,
  scheduleIsAvailableOn,
} from '@/lib/coach-offerings'

export type CoachBookingSelection = {
  coachId: string
  offeringId: string
  scheduleId: string
  /** display label: place name or coverage area */
  locationName: string
  mode: CoachClassOffering['mode']
  groupType: CoachClassOffering['groupType']
  days: string[]
  date: string
  startTime: string
  endTime: string
  price?: number | null
  priceCents: number | null
  currency: 'MXN'
  unit: CoachClassOffering['unit']
}

export interface Booking extends CoachBookingSelection {
  id: string
  athleteId: string
  athleteName: string
  /** Coach-controlled capacity state for this specific date and time. */
  classFull?: boolean
  /** Coach-confirmed attendance for this athlete and class. */
  attended?: boolean
  athletePhone?: string
  athleteEmail: string | null
  coachName: string | null
  status: string
  source: string
  createdAt: number
  updatedAt: number
}

export interface PublicBookedSlot {
  offeringId: string
  scheduleId: string
  date: string
  startTime: string
  endTime: string
  bookedCount: number
}

/** Hour (or whole day) the coach blocked — surfaced so the public schedule can
 * hide it. `allDay` blocks the whole `date`; otherwise `startTime` is the hour. */
export interface PublicBlockedSlot {
  date: string
  startTime: string | null
  allDay: boolean
  /** Hidden blocks remove recurring offering hours, but should not suppress an
   * explicitly published open slot at the same time. */
  hidden?: boolean
}

export function formatSlotLabel(
  selection: Pick<CoachBookingSelection, 'days' | 'startTime' | 'endTime'>
) {
  const days = selection.days.join(', ')
  return `${days} · ${selection.startTime}–${selection.endTime}`
}

export function flattenCoachBookingSelections(
  coach: CoachPublic & { id: string },
  weekStart: Date,
  dayCount = 7
): CoachBookingSelection[] {
  return resolveOfferings(coach).flatMap((offering) =>
    resolveOfferingSchedules(offering).flatMap((schedule) =>
      Array.from({ length: dayCount }, (_, offset) => addDays(weekStart, offset))
        .filter((date) => scheduleIsAvailableOn(schedule, date))
        .map((date) => ({
          coachId: coach.id as string,
          offeringId: offering.id,
          scheduleId: schedule.id,
          locationName: offeringPlaceLabel(offering),
          mode: offering.mode,
          groupType: offering.groupType,
          days: [
            Object.entries(DAY_TO_INDEX).find(([, index]) => index === date.getDay())?.[0] || '',
          ],
          date: dateKey(date),
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          price: offering.price,
          priceCents: offeringPriceCents(offering),
          currency: offering.currency,
          unit: offering.unit,
        }))
    )
  )
}

export function bookingSelectionKey(
  selection: Pick<
    CoachBookingSelection,
    'coachId' | 'offeringId' | 'scheduleId' | 'date' | 'days' | 'startTime' | 'endTime'
  >
) {
  return [
    selection.coachId,
    selection.offeringId,
    selection.scheduleId,
    selection.date,
    selection.days.join(','),
    selection.startTime,
    selection.endTime,
  ].join('::')
}

export function serializeBookingSelections(selections: CoachBookingSelection[]) {
  return encodeURIComponent(JSON.stringify(selections))
}

export function parseBookingSelections(raw: string | null) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown
    const list = Array.isArray(parsed) ? parsed : [parsed]
    const selections = list.map(normalizeBookingSelection).filter(Boolean)
    return selections.length ? (selections as CoachBookingSelection[]) : null
  } catch {
    return null
  }
}

function normalizeBookingSelection(raw: unknown): CoachBookingSelection | null {
  const parsed = raw as Partial<CoachBookingSelection> & { locationId?: string }
  const offeringId = parsed.offeringId || parsed.locationId
  const scheduleId = parsed.scheduleId || `${offeringId}:legacy`
  const date = parsed.date || dateKey(new Date())
  if (
    !parsed.coachId ||
    !offeringId ||
    !parsed.locationName ||
    !Array.isArray(parsed.days) ||
    parsed.days.length === 0 ||
    !parsed.startTime ||
    !parsed.endTime
  ) {
    return null
  }
  return {
    coachId: parsed.coachId,
    offeringId,
    scheduleId,
    locationName: parsed.locationName,
    mode: parsed.mode ?? 'fixed',
    groupType: parsed.groupType ?? 'particular',
    days: parsed.days,
    date,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    price: parsed.price ?? null,
    priceCents:
      parsed.priceCents ??
      (parsed.price !== undefined && parsed.price !== null ? parsed.price * 100 : null),
    currency: 'MXN',
    unit: parsed.unit ?? 'clase',
  }
}

export function buildCoachBookingTarget(selections: CoachBookingSelection[]) {
  return `/athlete/coach/${selections[0].coachId}?bookings=${serializeBookingSelections(selections)}`
}
