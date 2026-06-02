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
          status: slotStatus(slot, bookings, blocks),
        })
      }
    }
  }
  return slots.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
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
