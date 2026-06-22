import type { CoachClassOffering } from '@/firebase/coaches/coach.model'
import type { Booking } from '@/lib/coach-booking'
import {
  DAY_TO_INDEX,
  offeringPlaceLabel,
  resolveOfferingSchedules,
  scheduleIsAvailableOn,
} from '@/lib/coach-offerings'

export interface CoachScheduleBlock {
  id: string
  coachId: string
  date: string
  startTime: string | null
  endTime: string | null
  allDay: boolean
  note: string
  /** hidden = removed entirely (not shown to the coach). false = blocked but
   * still visible to the coach so they can add a student manually. */
  hidden?: boolean
  createdAt: number
  updatedAt: number
}

export interface CoachAvailableSlot {
  id: string
  coachId: string
  offeringId: string
  scheduleId: string
  date: string
  startTime: string
  endTime: string
  locationName: string
  status: 'available' | 'booked' | 'blocked'
  /** 'offering' = derived from an offering schedule, 'open' = ad-hoc published hour */
  source: 'offering' | 'open'
  /** present when source === 'open' so the row can be removed */
  openSlotId?: string
}

/** Ad-hoc hour a coach publishes from the agenda, independent of offerings. */
export interface CoachOpenSlot {
  id: string
  coachId: string
  date: string
  startTime: string
  endTime: string
  /** Defaults inherited from the coach's offerings when published. */
  locationName?: string
  priceCents?: number | null
  createdAt: number
  updatedAt: number
}

export interface CoachAgendaPayload {
  bookings: Booking[]
  availableSlots: CoachAvailableSlot[]
  blocks: CoachScheduleBlock[]
}

export type ScheduleBlockInput = {
  date?: string
  startTime?: string | null
  endTime?: string | null
  allDay?: boolean
  note?: string
  hidden?: boolean
}

export function normalizeScheduleBlockInput(input: ScheduleBlockInput) {
  const date = typeof input.date === 'string' ? input.date.trim() : ''
  const allDay = input.allDay === true
  const startTime = allDay ? null : normalizeTime(input.startTime)
  const endTime = allDay ? null : normalizeTime(input.endTime)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (!allDay && (!startTime || !endTime || endTime <= startTime)) return null

  return {
    date,
    allDay,
    startTime,
    endTime,
    note: typeof input.note === 'string' ? input.note.trim().slice(0, 160) : '',
    hidden: input.hidden === true,
  }
}

export function buildAvailableSlots({
  coachId,
  offerings,
  bookings,
  blocks,
  startDate,
  endDate,
}: {
  coachId: string
  offerings: CoachClassOffering[]
  bookings: Booking[]
  blocks: CoachScheduleBlock[]
  startDate: Date
  endDate: Date
}) {
  const slots: CoachAvailableSlot[] = []
  for (const date of enumerateDates(startDate, endDate)) {
    const key = localDateKey(date)
    for (const offering of offerings) {
      for (const schedule of resolveOfferingSchedules(offering)) {
        if (!scheduleIsAvailableOn(schedule, date)) continue
        const slot = {
          id: [offering.id, schedule.id, key, schedule.startTime, schedule.endTime].join('::'),
          coachId,
          offeringId: offering.id,
          scheduleId: schedule.id,
          date: key,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          locationName: offeringPlaceLabel(offering),
          status: 'available' as const,
        }
        slots.push({
          ...slot,
          source: 'offering' as const,
          status: slotStatus(slot, bookings, blocks),
        })
      }
    }
  }
  return slots.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
}

/** Materialize coach-published open slots into available-slot rows. */
export function openSlotsToAvailable(
  openSlots: CoachOpenSlot[],
  bookings: Booking[],
  blocks: CoachScheduleBlock[]
): CoachAvailableSlot[] {
  return openSlots.map((openSlot) => {
    const base = {
      id: `open::${openSlot.id}`,
      coachId: openSlot.coachId,
      offeringId: 'open',
      scheduleId: `open:${openSlot.id}`,
      date: openSlot.date,
      startTime: openSlot.startTime,
      endTime: openSlot.endTime,
      locationName: openSlot.locationName || 'Horario abierto',
      source: 'open' as const,
      openSlotId: openSlot.id,
    }
    return { ...base, status: slotStatus(base, bookings, blocks) }
  })
}

/** Expand a {dates, times} selection into 1-hour open-slot rows. */
export function normalizeOpenSlotInput(input: { dates?: unknown; times?: unknown }) {
  const dates = Array.isArray(input.dates)
    ? input.dates.filter(
        (value): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      )
    : []
  const times = Array.isArray(input.times)
    ? input.times.filter(
        (value): value is string => typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)
      )
    : []
  if (!dates.length || !times.length) return null

  const combos: { date: string; startTime: string; endTime: string }[] = []
  for (const date of dates) {
    for (const startTime of times) {
      const [hour, minute] = startTime.split(':').map(Number)
      const endTime = `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      combos.push({ date, startTime, endTime })
    }
  }
  return combos
}

export function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateFromKey(date: string) {
  return new Date(`${date}T12:00:00`)
}

export function monthRange(month: string | null) {
  const base = month && /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T12:00:00`) : new Date()
  const first = new Date(base.getFullYear(), base.getMonth(), 1)
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1
  const start = addDays(first, -offset)
  const end = addDays(start, 41)
  return { start, end }
}

function slotStatus(
  slot: Pick<CoachAvailableSlot, 'date' | 'startTime' | 'endTime'>,
  bookings: Booking[],
  blocks: CoachScheduleBlock[]
) {
  if (
    bookings.some(
      (booking) =>
        booking.status !== 'cancelled' &&
        booking.date === slot.date &&
        timesOverlap(slot.startTime, slot.endTime, booking.startTime, booking.endTime)
    )
  ) {
    return 'booked'
  }

  if (
    blocks.some(
      (block) =>
        block.date === slot.date &&
        (block.allDay ||
          (block.startTime &&
            block.endTime &&
            timesOverlap(slot.startTime, slot.endTime, block.startTime, block.endTime)))
    )
  ) {
    return 'blocked'
  }

  return 'available'
}

function enumerateDates(start: Date, end: Date) {
  const dates: Date[] = []
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    const day = Object.values(DAY_TO_INDEX).includes(date.getDay())
    if (day) dates.push(date)
  }
  return dates
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function normalizeTime(value: unknown) {
  if (typeof value !== 'string') return null
  const time = value.trim()
  return /^\d{2}:\d{2}$/.test(time) ? time : null
}

function timesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA
}
