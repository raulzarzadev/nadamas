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
  schoolId?: string
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
  enrolledCount?: number
  assignedCoachIds?: string[]
  id: string
  coachId: string
  schoolId?: string
  offeringId: string
  scheduleId: string
  date: string
  startTime: string
  endTime: string
  locationName: string
  groupType: 'particular' | 'grupal'
  status: 'available' | 'booked' | 'blocked'
  coachName?: string
  agendaLabel?: string
}

export interface CoachAgendaPayload {
  bookings: Booking[]
  availableSlots: CoachAvailableSlot[]
  blocks: CoachScheduleBlock[]
  offerings: CoachClassOffering[]
  coachNames?: Record<string, string>
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
  const seenSlots = new Set<string>()
  for (const date of enumerateDates(startDate, endDate)) {
    const key = localDateKey(date)
    for (const offering of offerings) {
      for (const schedule of resolveOfferingSchedules(offering)) {
        if (!scheduleIsAvailableOn(schedule, date)) continue
        const occurrenceKey = `${key}|${schedule.startTime}`
        if (seenSlots.has(occurrenceKey)) continue
        seenSlots.add(occurrenceKey)
        const matchingBooking = bookings.find(
          (booking) =>
            booking.status !== 'cancelled' &&
            booking.date === key &&
            timesOverlap(schedule.startTime, schedule.endTime, booking.startTime, booking.endTime)
        )
        const slot = {
          id: [offering.id, schedule.id, key, schedule.startTime, schedule.endTime].join('::'),
          coachId,
          offeringId: offering.id,
          ...(offering.assignedCoachIds ? { assignedCoachIds: offering.assignedCoachIds } : {}),
          scheduleId: schedule.id,
          date: key,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          locationName: offeringPlaceLabel(offering),
          groupType: matchingBooking?.groupType ?? schedule.groupType ?? offering.groupType,
          status: 'available' as const,
        }
        if (blocks.some((block) => block.hidden && blockOverlapsSlot(block, slot))) continue
        slots.push({
          ...slot,
          status: slotStatus(slot, bookings, blocks, offering.maxPeople),
        })
      }
    }
  }
  return slots.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
}

function blockOverlapsSlot(
  block: CoachScheduleBlock,
  slot: Pick<CoachAvailableSlot, 'date' | 'startTime' | 'endTime'>
) {
  return (
    block.date === slot.date &&
    (block.allDay ||
      (block.startTime &&
        block.endTime &&
        timesOverlap(slot.startTime, slot.endTime, block.startTime, block.endTime)))
  )
}

export function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
  slot: Pick<CoachAvailableSlot, 'date' | 'startTime' | 'endTime' | 'groupType'>,
  bookings: Booking[],
  blocks: CoachScheduleBlock[],
  maxPeople?: number | null
) {
  const matchingBookings = bookings.filter(
    (booking) =>
      booking.status !== 'cancelled' &&
      booking.date === slot.date &&
      timesOverlap(slot.startTime, slot.endTime, booking.startTime, booking.endTime)
  )
  const groupOccupancy = matchingBookings.reduce(
    (count, booking) => count + Math.max(1, booking.schoolClassStudentCount || 1),
    0
  )
  const groupCapacity =
    typeof maxPeople === 'number' && maxPeople > 0 ? Math.max(2, maxPeople) : Infinity
  const canJoinExistingGroup =
    slot.groupType === 'grupal' &&
    matchingBookings.length > 0 &&
    matchingBookings.every((booking) => booking.groupType === 'grupal' && !booking.classFull) &&
    groupOccupancy < groupCapacity

  if (matchingBookings.length > 0 && !canJoinExistingGroup) {
    return 'booked'
  }

  if (blocks.some((block) => blockOverlapsSlot(block, slot))) {
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

export function timesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA
}
