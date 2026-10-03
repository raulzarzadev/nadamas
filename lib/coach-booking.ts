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
  evaluation?: import('@/lib/class-evaluation').ClassEvaluation
  /** Set when this row mirrors an occurrence from the school's class scheduler. */
  schoolClassId?: string
  schoolClassStudentIds?: string[]
  schoolClassStudents?: Array<{ id: string; name: string; pending: boolean }>
  schoolRequestId?: string
  schoolClassTitle?: string
  schoolClassStudentCount?: number
  /** Origin label used when personal and school schedules share one agenda. */
  agendaLabel?: string
  id: string
  schoolId?: string
  athleteId: string
  athleteProfileId?: string
  additionalProfileId?: string
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
