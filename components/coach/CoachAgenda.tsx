'use client'

import Loading from '@comps/Loading'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiLock,
  FiPlus,
  FiUnlock,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import SchoolReassignStudent from '@/components/school/SchoolReassignStudent'
import Sheet from '@/components/ui/sheet'
import { useUser } from '@/context/UserContext'
import type { CoachClassOffering } from '@/firebase/coaches/coach.model'
import { deleteAuthed, getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import { useSchoolAgendaUpdates } from '@/lib/client/use-school-agenda-updates'
import type { CoachAgendaPayload, CoachAvailableSlot, CoachScheduleBlock } from '@/lib/coach-agenda'
import { HOUR_STATUS_STYLE, type HourStatus } from '@/lib/coach-agenda-status'
import type { Booking } from '@/lib/coach-booking'
import {
  addDays,
  createOffering,
  dateKey,
  offeringsWithoutHours,
  offeringWithHours,
  resolveOfferingSchedules,
  startOfWeek,
} from '@/lib/coach-offerings'
import {
  DAY_LABELS,
  formatWhatsappScheduleText,
  type WhatsappScheduleDay,
} from '@/lib/coach-whatsapp-schedule'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import AgendaAddStudentModal, { type AddStudentPayload } from './AgendaAddStudentModal'
import { useCoachAgendaShare } from './CoachAgendaShareContext'
import ScheduleHoursEditor, {
  type HoursMode,
  type ScheduleCoachOption,
} from './ScheduleHoursEditor'
import StudentProgressModal from './StudentProgressModal'

const WEEKDAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']
const OCCUPANCY_BAR_KEYS = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'] as const
const OCCUPANCY_MAX_BARS = OCCUPANCY_BAR_KEYS.length

// One thick line per hour, colored by status, in the SAME chronological order as
// the day's hour list (earliest at top). When a day has more hours than
// OCCUPANCY_MAX_BARS, evenly downsample while preserving order.
function occupancyBars(statuses: HourStatus[]): string[] {
  if (statuses.length === 0) return []
  let picked = statuses
  if (statuses.length > OCCUPANCY_MAX_BARS) {
    picked = Array.from(
      { length: OCCUPANCY_MAX_BARS },
      (_, index) => statuses[Math.floor((index * statuses.length) / OCCUPANCY_MAX_BARS)]
    )
  }
  return picked.map((status) => HOUR_STATUS_STYLE[status].bar)
}

function bookingSlotKey(booking: Pick<Booking, 'date' | 'startTime'>) {
  return `${booking.date}|${booking.startTime}`
}

function activeClassSlotCount(bookings: Booking[], separateByCoach = false) {
  return new Set(
    bookings.map((booking) =>
      separateByCoach ? `${booking.coachId}|${bookingSlotKey(booking)}` : bookingSlotKey(booking)
    )
  ).size
}

function blockCoversClassAt(block: CoachScheduleBlock, date: string, time: string) {
  if (block.date !== date) return false
  if (block.allDay) return true
  if (!block.startTime || !block.endTime) return false
  return block.startTime <= time && time < block.endTime
}

type ActiveSlot = {
  coachId?: string
  date: string
  startTime: string
  endTime: string
  locationName: string
  groupType: 'particular' | 'grupal'
}
type ConfirmAction =
  | { kind: 'cancel-booking'; booking: Booking }
  | { kind: 'delete-slot'; slot: CoachAvailableSlot }

export default function CoachAgenda({
  coachId,
  schoolId,
  aggregateSchool = false,
  readOnly = false,
  manageSchoolSchedule = false,
  allowSchoolScheduleEdit = false,
  scheduleEditorOpen = false,
  onScheduleEditorClose,
  scheduleCoachOptions = [],
  onScheduleCoachChange,
}: {
  coachId?: string
  schoolId?: string
  /** Load every active school's coach into the same agenda. */
  aggregateSchool?: boolean
  /** Hide booking, block, and schedule-editing controls. */
  readOnly?: boolean
  manageSchoolSchedule?: boolean
  /** A school director may open the hours editor while viewing all coaches. */
  allowSchoolScheduleEdit?: boolean
  scheduleEditorOpen?: boolean
  onScheduleEditorClose?: () => void
  scheduleCoachOptions?: ScheduleCoachOption[]
  onScheduleCoachChange?: (coachId: string) => void
}) {
  // When an admin opens another coach's agenda, `coachId` targets that coach and
  // booking actions (add/cancel students) are hidden — admin mode manages
  // blocks only and does not edit the coach's offering here.
  const adminMode = Boolean(coachId)
  const readOnlyAgenda = readOnly || (aggregateSchool && !manageSchoolSchedule)
  const multiCoachAgenda = readOnlyAgenda || (aggregateSchool && !coachId)
  const hideBookingActions = readOnlyAgenda || (adminMode && !manageSchoolSchedule)
  const scheduleEndpoint =
    manageSchoolSchedule && schoolId && coachId
      ? `/api/schools/${encodeURIComponent(schoolId)}/teachers/${encodeURIComponent(coachId)}/schedule`
      : '/api/coach/agenda'
  const coachQuery = coachId ? `&coachId=${encodeURIComponent(coachId)}` : ''
  const schoolQuery = schoolId ? `&schoolId=${encodeURIComponent(schoolId)}` : ''
  const contextQuery = `${coachQuery}${schoolQuery}`
  const { user } = useUser() as { user: { uid?: string; id?: string } | null }
  const { setScheduleText } = useCoachAgendaShare()
  const selfUid = user?.uid || user?.id

  const [agenda, setAgenda] = useState<CoachAgendaPayload | undefined>(undefined)
  const [loadedCoachId, setLoadedCoachId] = useState<string | undefined>(coachId)
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const today = dateKey(new Date())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addStudentSlot, setAddStudentSlot] = useState<ActiveSlot | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [progressBooking, setProgressBooking] = useState<Booking | null>(null)
  // Classes that already have a saved progress entry (labels the row button).
  const [progressBookingIds, setProgressBookingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (hideBookingActions || manageSchoolSchedule) return
    getAuthed('/api/coach/progress-entries')
      .then((response) => response.json())
      .then((payload: { bookingIds?: string[] }) =>
        setProgressBookingIds(new Set(payload.bookingIds || []))
      )
      .catch((err) => reportInternalError('COACH_PROGRESS_IDS_LOAD', err))
  }, [hideBookingActions, manageSchoolSchedule])
  // The school editor manages availability hours only.
  const [hoursEditorOpen, setHoursEditorOpen] = useState(false)
  const [reassignBooking, setReassignBooking] = useState<Booking | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const agendaRequestRef = useRef(0)

  const monthOfSelected = selectedDate.slice(0, 7)

  useEffect(() => {
    if (scheduleEditorOpen) setHoursEditorOpen(true)
  }, [scheduleEditorOpen])

  const closeScheduleEditor = () => {
    setHoursEditorOpen(false)
    onScheduleEditorClose?.()
  }

  const loadAgenda = useCallback(
    async (month: string) => {
      const requestId = ++agendaRequestRef.current
      setError(null)
      try {
        const endpoint =
          (aggregateSchool || manageSchoolSchedule) && schoolId
            ? `/api/schools/${encodeURIComponent(schoolId)}/agenda?month=${month}${coachQuery}${readOnly ? '&view=public' : ''}`
            : `/api/coach/agenda?month=${month}${contextQuery}`
        const response = await getAuthed(endpoint)
        const nextAgenda = (await response.json()) as CoachAgendaPayload
        if (requestId !== agendaRequestRef.current) return
        setAgenda(nextAgenda)
        setLoadedCoachId(coachId)
      } catch (err) {
        if (requestId !== agendaRequestRef.current) return
        reportInternalError('COACH_AGENDA_LOAD', err)
        setError(GENERIC_USER_ERROR)
        setAgenda({ bookings: [], availableSlots: [], blocks: [], offerings: [] })
        setLoadedCoachId(undefined)
      }
    },
    [aggregateSchool, manageSchoolSchedule, coachQuery, contextQuery, schoolId, coachId, readOnly]
  )

  useEffect(() => {
    loadAgenda(monthOfSelected)
  }, [loadAgenda, monthOfSelected])

  useSchoolAgendaUpdates(schoolId, () => {
    void loadAgenda(monthOfSelected)
  })

  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date(`${selectedDate}T12:00:00`))
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [selectedDate])

  const changeWeek = (delta: number) =>
    setSelectedDate(dateKey(addDays(new Date(`${selectedDate}T12:00:00`), delta * 7)))

  const changeMonth = (delta: number) => {
    const base = new Date(`${selectedDate}T12:00:00`)
    setSelectedDate(dateKey(new Date(base.getFullYear(), base.getMonth() + delta, 1)))
  }

  // Swipe lateral sobre la tira de días para cambiar de semana. La tira sigue el
  // dedo (dragX) y rebota al soltar para que se note que es deslizable.
  const touchStartX = useRef<number | null>(null)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const onStripTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
    setDragging(true)
    setDragX(0)
  }
  const onStripTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = (e.touches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    setDragX(Math.max(-100, Math.min(100, dx)))
  }
  const onStripTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    touchStartX.current = null
    setDragging(false)
    setDragX(0)
    if (Math.abs(dx) > 40) changeWeek(dx < 0 ? 1 : -1)
  }

  const activeBookings = useMemo(
    () => (agenda?.bookings || []).filter((booking) => booking.status !== 'cancelled'),
    [agenda?.bookings]
  )

  // Per-day hour statuses in chronological order — drives the colored bar meter
  // on each weekday chip so the bars line up with the day's hour list.
  const dayStatuses = useMemo(() => {
    const map = new Map<string, { time: string; status: HourStatus }[]>()
    const push = (date: string, time: string, status: HourStatus) => {
      const entries = map.get(date) || []
      entries.push({ time, status })
      map.set(date, entries)
    }
    const bookingsByTime = new Map<string, Booking[]>()
    for (const booking of activeBookings) {
      const key = multiCoachAgenda
        ? `${booking.coachId}|${booking.date}|${booking.startTime}`
        : bookingSlotKey(booking)
      const bookings = bookingsByTime.get(key) || []
      bookings.push(booking)
      bookingsByTime.set(key, bookings)
    }
    for (const bookings of bookingsByTime.values()) {
      const booking = bookings[0]
      if (!booking) continue
      push(
        booking.date,
        booking.startTime,
        bookings.length > 1 || booking.groupType === 'grupal' ? 'group' : 'booked'
      )
    }
    const bookedKeys = new Set(
      activeBookings.map((booking) =>
        multiCoachAgenda
          ? `${booking.coachId}|${booking.date}|${booking.startTime}`
          : bookingSlotKey(booking)
      )
    )
    const slotKeys = new Set<string>()
    const groupSlotKeys = new Set<string>()
    for (const slot of agenda?.availableSlots || []) {
      const key = multiCoachAgenda
        ? `${slot.coachId}|${slot.date}|${slot.startTime}`
        : `${slot.date}|${slot.startTime}`
      slotKeys.add(key)
      if (slot.groupType === 'grupal') groupSlotKeys.add(key)
      if (slot.status === 'available') {
        push(
          slot.date,
          slot.startTime,
          slot.groupType === 'grupal' ? 'groupAvailable' : 'available'
        )
      }
    }
    for (const block of agenda?.blocks || []) {
      if (block.allDay || block.hidden) continue
      const blockKey = multiCoachAgenda
        ? `${block.coachId}|${block.date}|${block.startTime || ''}`
        : `${block.date}|${block.startTime || ''}`
      if (groupSlotKeys.has(blockKey)) continue
      // A blocked hour that already has a student shows as booked, not blocked.
      if (bookedKeys.has(blockKey)) continue
      // Skip orphan blocks: a block whose underlying slot no longer exists
      // (offering changed / open hour deleted) must not paint a phantom bar.
      if (!slotKeys.has(blockKey)) continue
      push(block.date, block.startTime || '', 'blocked')
    }
    const ordered = new Map<string, HourStatus[]>()
    for (const [date, entries] of map) {
      entries.sort((a, b) => a.time.localeCompare(b.time))
      ordered.set(
        date,
        entries.map((entry) => entry.status)
      )
    }
    return ordered
  }, [activeBookings, agenda?.availableSlots, agenda?.blocks, multiCoachAgenda])

  // Month-level occupancy: class slots vs total offered, restricted to the month shown
  // in the header (the payload can bleed into adjacent months on boundary weeks).
  const monthStats = useMemo(() => {
    const inMonth = (date: string) => date.startsWith(monthOfSelected)
    const booked = activeClassSlotCount(
      activeBookings.filter((booking) => inMonth(booking.date)),
      multiCoachAgenda
    )
    const available = (agenda?.availableSlots || []).filter(
      (slot) => slot.status === 'available' && inMonth(slot.date)
    ).length
    return { booked, total: booked + available }
  }, [activeBookings, agenda?.availableSlots, monthOfSelected, multiCoachAgenda])

  // Week-level occupancy: sum booked/total across the 7 visible days.
  const weekStats = useMemo(() => {
    let booked = 0
    let total = 0
    for (const date of weekDates) {
      const statuses = dayStatuses.get(dateKey(date)) || []
      for (const status of statuses) {
        if (status === 'booked' || status === 'group') {
          booked += 1
          total += 1
        } else if (status === 'available' || status === 'groupAvailable') {
          total += 1
        }
      }
    }
    return { booked, total }
  }, [weekDates, dayStatuses])

  const existingTimesByDate = useMemo(() => {
    const result: Record<string, string[]> = {}
    for (const slot of agenda?.availableSlots || []) {
      if (slot.status === 'booked') continue
      const times = result[slot.date] || []
      if (!times.includes(slot.startTime)) times.push(slot.startTime)
      result[slot.date] = times
    }
    for (const times of Object.values(result)) times.sort()
    return result
  }, [agenda?.availableSlots])

  const whatsappDayRows = useMemo<WhatsappScheduleDay[]>(() => {
    return weekDates
      .map((date) => {
        const key = dateKey(date)
        const dayKey = whatsappDayKey(date)
        const slots = (agenda?.availableSlots || [])
          .filter((slot) => slot.date === key)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))

        return {
          dayKey,
          dayLabel: DAY_LABELS[dayKey] || dayKey,
          times: slots.map((slot) => ({
            label: `${slot.startTime} - ${slot.endTime}`,
            disabled: slot.status !== 'available' || slotHasPassed(slot),
            groupType: slot.groupType,
          })),
        }
      })
      .filter((day) => day.times.length > 0)
  }, [agenda?.availableSlots, weekDates])

  const whatsappScheduleText = useMemo(() => {
    return formatWhatsappScheduleText(whatsappDayRows, weekDates[0] || new Date())
  }, [whatsappDayRows, weekDates])

  useEffect(() => {
    setScheduleText(whatsappScheduleText)
    return () => setScheduleText('')
  }, [setScheduleText, whatsappScheduleText])

  const dayBookings = activeBookings.filter((booking) => booking.date === selectedDate)
  const daySlots = (agenda?.availableSlots || []).filter((slot) => slot.date === selectedDate)
  const dayBlocks = (agenda?.blocks || []).filter((block) => block.date === selectedDate)
  // In a school-wide view, one coach blocking a full day must not hide every
  // other coach's schedule. The individual slots already carry the blocked state.
  const allDayBlock = multiCoachAgenda ? undefined : dayBlocks.find((block) => block.allDay)

  const rows = useMemo(() => {
    const slotKey = (coachId: string, startTime: string) =>
      multiCoachAgenda ? `${coachId}|${startTime}` : startTime
    const bookedTimes = new Set(
      dayBookings.map((booking) => slotKey(booking.coachId, booking.startTime))
    )
    const available = daySlots
      .filter(
        (slot) =>
          !bookedTimes.has(slotKey(slot.coachId, slot.startTime)) && slot.status === 'available'
      )
      .map((slot) => ({ kind: 'available' as const, sort: slot.startTime, slot }))
    const groupedBookings = new Map<string, Booking[]>()
    for (const booking of dayBookings) {
      const key = slotKey(booking.coachId, booking.startTime)
      const group = groupedBookings.get(key) || []
      group.push(booking)
      groupedBookings.set(key, group)
    }
    const booked = Array.from(groupedBookings.entries()).map(([key, bookings]) => ({
      kind: 'booked' as const,
      sort: bookings[0]?.startTime || key,
      bookings: bookings.sort((a, b) => a.athleteName.localeCompare(b.athleteName)),
    }))
    // Render one blocked row per blocked hour (derived from the slots), not per
    // block doc — a block covering several slots must not make the extra hours
    // vanish. A coach can still add a student to a blocked hour; once booked it
    // shows as a booking row instead.
    const seen = new Set<string>()
    const blocked: {
      kind: 'blocked'
      sort: string
      slot: CoachAvailableSlot
      block?: CoachScheduleBlock
    }[] = []
    for (const slot of daySlots) {
      if (slot.status !== 'blocked') continue
      const key = slotKey(slot.coachId, slot.startTime)
      if (bookedTimes.has(key) || seen.has(key)) continue
      seen.add(key)
      const block = dayBlocks.find(
        (b) =>
          (!multiCoachAgenda || b.coachId === slot.coachId) &&
          !b.hidden &&
          (b.allDay ||
            (b.startTime && b.endTime && b.startTime < slot.endTime && slot.startTime < b.endTime))
      )
      // Hidden blocks (removed entirely) have no visible row.
      if (!block) continue
      blocked.push({ kind: 'blocked', sort: slot.startTime, slot, block })
    }
    return [...available, ...booked, ...blocked].sort((a, b) => a.sort.localeCompare(b.sort))
  }, [daySlots, dayBookings, dayBlocks, multiCoachAgenda])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await loadAgenda(monthOfSelected)
    } catch (err) {
      reportInternalError('COACH_AGENDA_ACTION', err)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const scheduleEndpointFor = (targetCoachId?: string) =>
    manageSchoolSchedule && schoolId && targetCoachId
      ? `/api/schools/${encodeURIComponent(schoolId)}/teachers/${encodeURIComponent(targetCoachId)}/schedule`
      : scheduleEndpoint

  const block = (slot: CoachAvailableSlot, hidden: boolean) =>
    run(() =>
      postAuthed(scheduleEndpointFor(slot.coachId), {
        date: slot.date,
        allDay: false,
        startTime: slot.startTime,
        endTime: slot.endTime,
        hidden,
        ...(coachId ? { coachId } : {}),
        ...(schoolId ? { schoolId } : {}),
      })
    )

  // Bloquear: hide from athletes but keep visible to the coach (Bloqueado row,
  // can still add a student).
  const bloquearSlot = (slot: CoachAvailableSlot) => block(slot, false)

  // Eliminar: hide the recurring offering occurrence so it disappears from this
  // day (creates a hidden block). El horario base se edita en "Mis horarios".
  const eliminarSlot = (slot: CoachAvailableSlot) => block(slot, true)

  const cancelBooking = (booking: Booking) =>
    run(() =>
      deleteAuthed(
        `/api/coach/agenda/bookings?id=${encodeURIComponent(booking.id)}${schoolQuery}${manageSchoolSchedule ? `&coachId=${encodeURIComponent(booking.coachId)}` : coachQuery}`
      )
    )

  const updateClassSettings = (
    bookings: Booking[],
    settings: { groupType?: 'particular' | 'grupal'; classFull?: boolean }
  ) => {
    const booking = bookings[0]
    if (!booking) return
    run(() =>
      patchAuthed('/api/coach/agenda/bookings', {
        ...(manageSchoolSchedule ? { coachId: booking.coachId } : {}),
        date: booking.date,
        startTime: booking.startTime,
        ...(schoolId ? { schoolId } : {}),
        ...settings,
      })
    )
  }

  const updateAttendance = (booking: Booking, attended: boolean) =>
    run(() =>
      patchAuthed('/api/coach/agenda/bookings', {
        ...(manageSchoolSchedule ? { coachId: booking.coachId } : {}),
        id: booking.id,
        attended,
        ...(schoolId ? { schoolId } : {}),
      })
    )

  const unblock = (block: CoachScheduleBlock) =>
    run(() =>
      deleteAuthed(
        `${scheduleEndpointFor(block.coachId)}?id=${encodeURIComponent(block.id)}${schoolQuery}`
      )
    )

  const submitAddStudent = (slot: ActiveSlot, payloads: AddStudentPayload[]) =>
    run(async () => {
      for (const payload of payloads) {
        await postAuthed('/api/coach/agenda/bookings', {
          ...(manageSchoolSchedule && coachId ? { coachId } : {}),
          ...slot,
          ...payload,
          ...(schoolId ? { schoolId } : {}),
        })
      }
      setAddStudentSlot(null)
    })

  // Single offering updated by the school hours editor.
  const offerings = agenda?.offerings || []
  const offering = offerings[0] || null
  const saveOfferings = (next: CoachClassOffering) =>
    postAuthed(manageSchoolSchedule ? scheduleEndpoint : '/api/coach/offerings', {
      ...(schoolId ? { schoolId } : {}),
      classOfferings: offerings.some((item) => item.id === next.id)
        ? offerings.map((item) => (item.id === next.id ? next : item))
        : [...offerings, next],
    })
  const saveOfferingList = (next: CoachClassOffering[]) =>
    postAuthed(manageSchoolSchedule ? scheduleEndpoint : '/api/coach/offerings', {
      ...(schoolId ? { schoolId } : {}),
      classOfferings: next,
    })

  const updateAvailableSlotGroupType = (slot: CoachAvailableSlot, checked: boolean) => {
    run(async () => {
      let targetOfferings = offerings
      if (manageSchoolSchedule && schoolId && !coachId) {
        const response = await getAuthed(
          `/api/schools/${encodeURIComponent(schoolId)}/agenda?month=${monthOfSelected}&coachId=${encodeURIComponent(slot.coachId)}`
        )
        targetOfferings = ((await response.json()) as CoachAgendaPayload).offerings || []
      }
      if (!targetOfferings.some((item) => item.id === slot.offeringId))
        throw new Error('SCHEDULE_NOT_FOUND')
      const next = targetOfferings.map((item) =>
        item.id !== slot.offeringId
          ? item
          : {
              ...item,
              schedules: resolveOfferingSchedules(item).map((schedule) =>
                schedule.id === slot.scheduleId
                  ? {
                      ...schedule,
                      groupType: checked ? ('grupal' as const) : ('particular' as const),
                    }
                  : schedule
              ),
            }
      )
      if (manageSchoolSchedule)
        await postAuthed(scheduleEndpointFor(slot.coachId), { classOfferings: next })
      else await saveOfferingList(next)
    })
  }

  const overlappingBlockIds = (pairs: { date: string; time: string }[]) =>
    (agenda?.blocks || [])
      .filter((block) => pairs.some((pair) => blockCoversClassAt(block, pair.date, pair.time)))
      .map((block) => block.id)

  const deleteBlocks = async (pairs: { date: string; time: string }[]) => {
    for (const id of overlappingBlockIds(pairs)) {
      await deleteAuthed(`${scheduleEndpoint}?id=${encodeURIComponent(id)}${contextQuery}`)
    }
  }

  // Editor de horas (Quitar/Agregar): agrega o quita (día × hora) del offering.
  const applyHours = (mode: HoursMode, dates: string[], times: string[]) => {
    if (!selfUid) {
      setError(
        'No se pudo identificar tu cuenta. Cierra sesión, vuelve a entrar e inténtalo de nuevo.'
      )
      return
    }
    if (dates.length === 0 || times.length === 0) {
      setError('Selecciona al menos un día y una hora para continuar.')
      return
    }
    setNotice(null)
    run(async () => {
      if (mode === 'add') {
        const base = offering ?? createOffering()
        // Quita bloqueos que tapan estas horas para que queden disponibles.
        await deleteBlocks(dates.flatMap((date) => times.map((time) => ({ date, time }))))
        await saveOfferings(offeringWithHours(base, dates, times, base.durationMinutes ?? 60))
        closeScheduleEditor()
        return
      }
      if (!offering) {
        closeScheduleEditor()
        return
      }
      const pairs: { date: string; time: string }[] = []
      let skipped = 0
      for (const date of dates) {
        for (const time of times) {
          if (activeBookings.some((b) => b.date === date && b.startTime === time)) {
            skipped += 1
            continue
          }
          pairs.push({ date, time })
        }
      }
      await deleteBlocks(pairs)
      await saveOfferingList(offeringsWithoutHours(offerings, pairs))
      closeScheduleEditor()
      if (skipped > 0) {
        setNotice(`No se quitaron ${skipped} hora(s) con alumno. Cancela la clase primero.`)
      }
    })
  }

  const confirmCopy =
    confirmAction?.kind === 'cancel-booking'
      ? {
          title: 'Cancelar clase',
          body: `Se cancelará la clase de ${confirmAction.booking.athleteName} a las ${confirmAction.booking.startTime}. El alumno seguirá guardado en tu lista.`,
          action: 'Cancelar clase',
        }
      : confirmAction?.kind === 'delete-slot'
        ? {
            title: 'Eliminar horario',
            body: `Se eliminará el horario de las ${confirmAction.slot.startTime}. Ya no aparecerá como disponible para alumnos.`,
            action: 'Eliminar horario',
          }
        : null

  const runConfirmedAction = () => {
    if (!confirmAction) return
    const action = confirmAction
    setConfirmAction(null)
    if (action.kind === 'cancel-booking') {
      cancelBooking(action.booking)
      return
    }
    eliminarSlot(action.slot)
  }

  if (agenda === undefined) return <Loading />

  return (
    <div className="flex flex-col gap-4">
      {/* Month nav: ‹ Junio › + conteo del mes */}
      <NavStepper
        label={new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', { month: 'long' })}
        count={`${monthStats.booked}/${monthStats.total}`}
        prevLabel="Mes anterior"
        nextLabel="Mes siguiente"
        onPrev={() => changeMonth(-1)}
        onNext={() => changeMonth(1)}
        labelClassName="text-xl font-extrabold capitalize"
      />

      {/* Week nav: ‹ 22 jun - 28 jun › + conteo de la semana */}
      <NavStepper
        label={`${weekDates[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${weekDates[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`}
        count={`${weekStats.booked}/${weekStats.total}`}
        prevLabel="Semana anterior"
        nextLabel="Semana siguiente"
        onPrev={() => changeWeek(-1)}
        onNext={() => changeWeek(1)}
        labelClassName="text-sm font-semibold"
      />

      {selectedDate !== today && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--c-aqua-strong)] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--c-ocean-mid)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
          >
            Hoy
          </button>
        </div>
      )}

      {/* Subtle legend for the occupancy bar colors */}
      <ul
        aria-label="Significado de los colores"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[var(--c-text-2)]"
      >
        {(
          [
            ['available', 'Disponible'],
            ['booked', 'Ocupado'],
            ['groupAvailable', 'Grupal disponible'],
            ['group', 'Grupal ocupada'],
            ['blocked', 'Bloqueado'],
          ] as const
        ).map(([status, label]) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-[4px] w-4 rounded-full ${HOUR_STATUS_STYLE[status].bar}`}
            />
            {label}
          </li>
        ))}
      </ul>

      {/* Week strip (flechas + swipe lateral para cambiar de semana) */}
      <div
        className="flex touch-pan-y items-stretch gap-1"
        onTouchStart={onStripTouchStart}
        onTouchMove={onStripTouchMove}
        onTouchEnd={onStripTouchEnd}
      >
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={() => changeWeek(-1)}
          className="grid w-6 shrink-0 place-items-center rounded-[var(--r-md)] text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)]"
        >
          <FiChevronLeft aria-hidden="true" />
        </button>
        <div
          className="grid flex-1 grid-cols-7 gap-1.5"
          style={{
            transform: `translateX(${dragX}px)`,
            opacity: dragging ? 0.85 : 1,
            transition: dragging ? 'none' : 'transform 200ms ease, opacity 200ms ease',
          }}
        >
          {weekDates.map((date) => {
            const key = dateKey(date)
            const selected = key === selectedDate
            const isToday = key === dateKey(new Date())
            const statuses = dayStatuses.get(key) || []
            // Colored lines in chronological order: green=disponible, blue=bloqueado,
            // red=ocupado individual, lime=grupal.
            const bars = occupancyBars(statuses)
            const count = (status: HourStatus) => statuses.filter((s) => s === status).length
            const bookedCount = count('booked')
            const groupCount = count('group')
            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelectedDate(key)}
                aria-label={
                  statuses.length
                    ? `${weekdayChipLabel(date)}: ${bookedCount} ocupadas, ${groupCount} grupales, ${count('available')} disponibles, ${count('blocked')} bloqueadas`
                    : weekdayChipLabel(date)
                }
                className={`flex flex-col items-center gap-1 rounded-[var(--r-md)] border py-2 transition-colors ${
                  selected
                    ? 'border-[var(--c-aqua)] bg-gradient-to-b from-[var(--c-aqua)] to-[var(--c-ocean)] text-white shadow-[var(--shadow-sm)]'
                    : `border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)] ${[0, 6].includes(date.getDay()) ? 'bg-[var(--c-surface)]' : 'bg-white'}`
                } ${isToday ? 'ring-2 ring-[var(--c-aqua)] ring-offset-1' : ''}`}
              >
                <span
                  className={`text-[10px] font-bold ${selected ? 'text-white/80' : 'text-[var(--c-text-2)]'}`}
                >
                  {WEEKDAYS[date.getDay() === 0 ? 6 : date.getDay() - 1]}
                </span>
                <span className="text-lg font-extrabold leading-none">{date.getDate()}</span>
                <span
                  aria-hidden="true"
                  className="flex min-h-[14px] flex-col items-center justify-center gap-[2px] pt-0.5"
                >
                  {bars.map((color, index) => (
                    <span
                      key={OCCUPANCY_BAR_KEYS[index]}
                      className={`h-[4px] w-4 rounded-full ${color}`}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          aria-label="Semana siguiente"
          onClick={() => changeWeek(1)}
          className="grid w-6 shrink-0 place-items-center rounded-[var(--r-md)] text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)]"
        >
          <FiChevronRight aria-hidden="true" />
        </button>
      </div>

      {/* Day card */}
      <section className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)]">
        {error && (
          <p className="px-4 pb-2 text-sm text-[var(--c-error,#b91c1c)] sm:px-5">{error}</p>
        )}
        {notice && (
          <p className="px-4 pb-2 text-sm font-semibold text-amber-600 sm:px-5">{notice}</p>
        )}

        <div className="border-t border-[var(--c-border)]">
          {allDayBlock && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
                <FiLock aria-hidden="true" /> Día bloqueado
                {allDayBlock.note ? ` · ${allDayBlock.note}` : ''}
              </span>
              {!readOnlyAgenda && (
                <RowIconButton
                  ariaLabel="Desbloquear día"
                  onClick={() => unblock(allDayBlock)}
                  disabled={busy}
                >
                  <FiUnlock aria-hidden="true" />
                </RowIconButton>
              )}
            </div>
          )}

          {!allDayBlock && rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[var(--c-text-2)] sm:px-5">
              {schoolId ? 'No hay horarios asignados para este día.' : 'No hay horarios este día.'}
            </p>
          )}

          {!allDayBlock &&
            rows.map((row) => {
              if (row.kind === 'booked') {
                const firstBooking = row.bookings[0]
                if (!firstBooking) return null
                const hasSchoolClass = row.bookings.some((booking) =>
                  Boolean(booking.schoolClassId)
                )
                const isGroupClass =
                  row.bookings.length > 1 ||
                  row.bookings.some((booking) => booking.groupType === 'grupal')
                const isClassFull =
                  isGroupClass && row.bookings.some((booking) => booking.classFull)
                const classStyle = isGroupClass ? HOUR_STATUS_STYLE.group : HOUR_STATUS_STYLE.booked
                return (
                  <AgendaRow
                    key={`b-${firstBooking.coachId}-${firstBooking.date}-${firstBooking.startTime}`}
                    time={row.sort}
                  >
                    <div
                      className={`flex min-w-0 flex-1 flex-col gap-3 rounded-[var(--r-md)] border px-3 py-3 ${classStyle.border} ${classStyle.bg}`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-bold uppercase text-[var(--c-text-2)]">
                          {isGroupClass
                            ? `Clase grupal · ${firstBooking.schoolClassStudentCount ?? row.bookings.length} alumnos`
                            : 'Clase particular · 1 alumno'}
                        </span>
                        {multiCoachAgenda && (
                          <span className="text-sm font-extrabold text-[var(--c-ocean)]">
                            {firstBooking.coachName ||
                              agenda.coachNames?.[firstBooking.coachId] ||
                              'Coach'}
                          </span>
                        )}
                        {manageSchoolSchedule && !hasSchoolClass && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm min-h-11"
                            disabled={busy}
                            onClick={() => {
                              const existingBlock = dayBlocks.find(
                                (block) =>
                                  block.coachId === firstBooking.coachId &&
                                  blockCoversClassAt(
                                    block,
                                    firstBooking.date,
                                    firstBooking.startTime
                                  )
                              )
                              if (existingBlock) unblock(existingBlock)
                              else
                                bloquearSlot({
                                  ...firstBooking,
                                  id: firstBooking.id,
                                  coachName: firstBooking.coachName || undefined,
                                  status: 'booked',
                                })
                            }}
                          >
                            {dayBlocks.some(
                              (block) =>
                                block.coachId === firstBooking.coachId &&
                                blockCoversClassAt(block, firstBooking.date, firstBooking.startTime)
                            )
                              ? 'Desbloquear horario'
                              : 'Bloquear horario'}
                          </button>
                        )}
                        {!hideBookingActions && !hasSchoolClass && (
                          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                            <span className="min-w-0">
                              <BinarySwitch
                                leftLabel="Disponible"
                                rightLabel="Llena"
                                leftIcon={<FiUnlock />}
                                rightIcon={<FiLock />}
                                checked={isClassFull}
                                onChange={(checked) =>
                                  updateClassSettings(row.bookings, { classFull: checked })
                                }
                                disabled={busy || !isGroupClass}
                              />
                            </span>
                            {row.bookings.length === 1 && (
                              <BinarySwitch
                                leftLabel="Particular"
                                rightLabel="Grupal"
                                leftIcon={<FiUser />}
                                rightIcon={<FiUsers />}
                                checked={isGroupClass}
                                onChange={(checked) =>
                                  updateClassSettings(row.bookings, {
                                    groupType: checked ? 'grupal' : 'particular',
                                  })
                                }
                                disabled={busy}
                              />
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setAddStudentSlot({
                                  coachId: firstBooking.coachId,
                                  date: firstBooking.date,
                                  startTime: firstBooking.startTime,
                                  endTime: firstBooking.endTime,
                                  locationName: firstBooking.locationName || 'Horario abierto',
                                  groupType: isGroupClass ? 'grupal' : 'particular',
                                })
                              }
                              disabled={busy || isClassFull}
                              aria-hidden={isClassFull}
                              className={`col-span-full inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[var(--c-aqua)] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit ${
                                isClassFull ? 'invisible' : ''
                              }`}
                            >
                              <FiPlus aria-hidden="true" /> Alumno
                            </button>
                          </div>
                        )}
                      </div>

                      <ul className="flex flex-col gap-2">
                        {row.bookings.map((booking) => (
                          <li
                            key={booking.id}
                            className="flex flex-col gap-2 rounded-[var(--r-sm)] bg-white/55 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--c-border)] bg-white text-xs font-bold text-[var(--c-ocean)] shadow-[0_1px_0_rgba(10,37,64,0.04)]">
                                {initials(booking.athleteName)}
                              </span>
                              <span className="min-w-0 flex-1">
                                {booking.schoolClassTitle && (
                                  <span className="block text-xs font-semibold text-[var(--c-text-2)]">
                                    {booking.schoolClassTitle}
                                  </span>
                                )}
                                <span className="block break-words text-base font-extrabold leading-tight text-[var(--c-ocean)]">
                                  {booking.athleteName}
                                </span>
                                {!hideBookingActions &&
                                  !manageSchoolSchedule &&
                                  !booking.schoolClassId && (
                                    <Link
                                      href={`/coach/students?student=${encodeURIComponent(booking.athleteId)}`}
                                      className="mt-1 inline-flex min-h-6 items-center text-sm font-semibold text-[var(--c-aqua-strong)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                                    >
                                      ver perfil ›
                                    </Link>
                                  )}
                              </span>
                            </div>
                            {!hideBookingActions && !booking.schoolClassId && (
                              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end sm:self-center">
                                <label className="col-span-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white/65 px-3 text-xs font-bold text-[var(--c-ocean)] transition-colors hover:bg-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--c-aqua-strong)] sm:col-auto sm:rounded-full sm:border-transparent sm:bg-transparent sm:px-2 sm:hover:bg-white/60">
                                  <input
                                    type="checkbox"
                                    checked={booking.attended === true}
                                    onChange={(event) =>
                                      updateAttendance(booking, event.currentTarget.checked)
                                    }
                                    disabled={busy}
                                    className="h-5 w-5 cursor-pointer rounded border-[var(--c-border)] accent-[var(--c-aqua-strong)] disabled:cursor-not-allowed"
                                  />
                                  Asistencia
                                </label>
                                {!manageSchoolSchedule && booking.attended === true && (
                                  <button
                                    type="button"
                                    aria-label={
                                      progressBookingIds.has(booking.id)
                                        ? `Editar progreso de ${booking.athleteName}`
                                        : `Agregar progreso de ${booking.athleteName}`
                                    }
                                    onClick={() => setProgressBooking(booking)}
                                    disabled={busy}
                                    className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--c-border)] bg-white px-2 text-xs font-bold text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:opacity-50 sm:w-fit sm:px-3.5"
                                  >
                                    {progressBookingIds.has(booking.id) ? (
                                      <>
                                        <FiEdit2 aria-hidden="true" /> Progreso guardado
                                      </>
                                    ) : (
                                      <>
                                        <FiPlus aria-hidden="true" /> Progreso
                                      </>
                                    )}
                                  </button>
                                )}
                                {manageSchoolSchedule && (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm min-h-11"
                                    disabled={busy}
                                    onClick={() => setReassignBooking(booking)}
                                  >
                                    Reasignar alumno
                                  </button>
                                )}
                                <button
                                  type="button"
                                  aria-label={`Cancelar clase de ${booking.athleteName}`}
                                  onClick={() =>
                                    setConfirmAction({ kind: 'cancel-booking', booking })
                                  }
                                  disabled={busy}
                                  className={`inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--rose-bd)] bg-white px-2 text-xs font-bold text-[var(--rose-tx)] transition-colors hover:bg-[var(--rose-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rose-tx)] disabled:opacity-50 sm:w-fit sm:px-3.5 ${
                                    booking.attended === true ? '' : 'col-span-2'
                                  }`}
                                >
                                  <FiX aria-hidden="true" /> Cancelar
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </AgendaRow>
                )
              }
              if (row.kind === 'blocked') {
                const isBlockedGroup = row.slot.groupType === 'grupal'
                return (
                  <AgendaRow key={`x-${row.slot.coachId}-${row.slot.id}`} time={row.slot.startTime}>
                    <div
                      className={`flex min-w-0 flex-1 flex-col gap-2 rounded-[var(--r-md)] border px-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-3 ${HOUR_STATUS_STYLE.blocked.border} ${HOUR_STATUS_STYLE.blocked.bg}`}
                    >
                      {readOnlyAgenda || (adminMode && !manageSchoolSchedule) ? (
                        <span className="flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
                          <FiLock aria-hidden="true" /> Bloqueado
                          <span className="font-normal text-[var(--c-text-2)]">
                            ·{' '}
                            {row.slot.coachName || agenda.coachNames?.[row.slot.coachId] || 'Coach'}
                          </span>
                        </span>
                      ) : (
                        <div className="grid min-w-0 grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                          {multiCoachAgenda && (
                            <span className="col-span-2 text-xs font-bold">
                              {row.slot.coachName ||
                                agenda.coachNames?.[row.slot.coachId] ||
                                'Coach'}
                            </span>
                          )}
                          <BinarySwitch
                            leftLabel="Disponible"
                            rightLabel="Bloqueado"
                            leftIcon={<FiUnlock />}
                            rightIcon={<FiLock />}
                            checked
                            onChange={(checked) => {
                              if (!checked && row.block) unblock(row.block)
                            }}
                            disabled={busy || !row.block}
                            compact
                          />
                          <BinarySwitch
                            leftLabel="Particular"
                            rightLabel="Grupal"
                            leftIcon={<FiUser />}
                            rightIcon={<FiUsers />}
                            checked={isBlockedGroup}
                            onChange={(checked) => updateAvailableSlotGroupType(row.slot, checked)}
                            disabled={busy}
                            compact
                          />
                        </div>
                      )}
                      <div className="flex min-w-0 items-center justify-end gap-1.5 sm:shrink-0 sm:gap-2">
                        {!hideBookingActions && (
                          <button
                            type="button"
                            onClick={() =>
                              setAddStudentSlot({
                                coachId: row.slot.coachId,
                                date: row.slot.date,
                                startTime: row.slot.startTime,
                                endTime: row.slot.endTime,
                                locationName: row.slot.locationName || 'Horario abierto',
                                groupType: row.slot.groupType,
                              })
                            }
                            disabled={busy}
                            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1 rounded-full bg-[var(--c-aqua)] px-3 text-xs font-bold text-white transition-colors hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                          >
                            <FiPlus aria-hidden="true" /> Alumno
                          </button>
                        )}
                      </div>
                    </div>
                  </AgendaRow>
                )
              }
              const isAvailableGroup = row.slot.groupType === 'grupal'
              const availableStyle = isAvailableGroup
                ? HOUR_STATUS_STYLE.groupAvailable
                : HOUR_STATUS_STYLE.available
              return (
                <AgendaRow key={`a-${row.slot.coachId}-${row.slot.id}`} time={row.slot.startTime}>
                  <div
                    className={`flex min-w-0 flex-1 flex-col gap-2 rounded-[var(--r-md)] border px-2.5 py-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-3 ${availableStyle.border} ${availableStyle.bg}`}
                  >
                    {readOnlyAgenda || (adminMode && !manageSchoolSchedule) ? (
                      <span className="flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${availableStyle.dot}`}
                          aria-hidden="true"
                        />
                        Disponible
                        <span className="font-normal text-[var(--c-text-2)]">
                          · {row.slot.coachName || agenda.coachNames?.[row.slot.coachId] || 'Coach'}
                        </span>
                      </span>
                    ) : (
                      <div className="grid min-w-0 grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                        {multiCoachAgenda && (
                          <span className="col-span-2 text-xs font-bold">
                            {row.slot.coachName || agenda.coachNames?.[row.slot.coachId] || 'Coach'}
                          </span>
                        )}
                        <BinarySwitch
                          leftLabel="Disponible"
                          rightLabel="Bloqueado"
                          leftIcon={<FiUnlock />}
                          rightIcon={<FiLock />}
                          checked={false}
                          onChange={(checked) => {
                            if (checked) bloquearSlot(row.slot)
                          }}
                          disabled={busy}
                          compact
                        />
                        <BinarySwitch
                          leftLabel="Particular"
                          rightLabel="Grupal"
                          leftIcon={<FiUser />}
                          rightIcon={<FiUsers />}
                          checked={isAvailableGroup}
                          onChange={(checked) => updateAvailableSlotGroupType(row.slot, checked)}
                          disabled={busy}
                          compact
                        />
                      </div>
                    )}
                    <div className="flex min-w-0 items-center justify-end gap-1.5 sm:shrink-0 sm:gap-2">
                      {!hideBookingActions && (
                        <button
                          type="button"
                          onClick={() =>
                            setAddStudentSlot({
                              coachId: row.slot.coachId,
                              date: row.slot.date,
                              startTime: row.slot.startTime,
                              endTime: row.slot.endTime,
                              locationName: row.slot.locationName,
                              groupType: row.slot.groupType,
                            })
                          }
                          disabled={busy}
                          className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1 rounded-full bg-[var(--c-aqua)] px-3 text-xs font-bold text-white transition-colors hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                        >
                          <FiPlus aria-hidden="true" /> Alumno
                        </button>
                      )}
                      {!readOnlyAgenda && (
                        <RowIconButton
                          ariaLabel="Eliminar este horario"
                          onClick={() => setConfirmAction({ kind: 'delete-slot', slot: row.slot })}
                          tone="danger"
                          disabled={
                            busy ||
                            dayBookings.some(
                              (b) =>
                                b.coachId === row.slot.coachId && b.startTime === row.slot.startTime
                            )
                          }
                        >
                          <FiX aria-hidden="true" />
                        </RowIconButton>
                      )}
                    </div>
                  </div>
                </AgendaRow>
              )
            })}
        </div>
      </section>

      {reassignBooking && schoolId && (
        <SchoolReassignStudent
          schoolId={schoolId}
          booking={reassignBooking}
          onClose={() => setReassignBooking(null)}
          onSaved={() => {
            setReassignBooking(null)
            setNotice('Alumno reasignado.')
            void loadAgenda(monthOfSelected)
          }}
        />
      )}
      {progressBooking && (
        <StudentProgressModal
          athleteId={progressBooking.athleteId}
          studentName={progressBooking.athleteName}
          bookingId={progressBooking.id}
          onClose={() => setProgressBooking(null)}
          onSaved={() => {
            setProgressBookingIds((current) => new Set(current).add(progressBooking.id))
            setProgressBooking(null)
            setNotice('Progreso guardado.')
          }}
        />
      )}

      {addStudentSlot && (
        <AgendaAddStudentModal
          schoolId={schoolId}
          slotLabel={`${new Date(`${addStudentSlot.date}T12:00:00`).toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })} · ${addStudentSlot.startTime}`}
          busy={busy}
          takenAthleteIds={activeBookings
            .filter(
              (booking) =>
                booking.date === addStudentSlot.date &&
                (!addStudentSlot.coachId || booking.coachId === addStudentSlot.coachId) &&
                booking.startTime === addStudentSlot.startTime
            )
            .map((booking) => booking.athleteId)}
          takenNames={activeBookings
            .filter(
              (booking) =>
                booking.date === addStudentSlot.date &&
                (!addStudentSlot.coachId || booking.coachId === addStudentSlot.coachId) &&
                booking.startTime === addStudentSlot.startTime
            )
            .map((booking) => booking.athleteName)}
          onClose={() => setAddStudentSlot(null)}
          onSubmit={(payloads) => submitAddStudent(addStudentSlot, payloads)}
        />
      )}

      {/* Editor de horas: Quitar / Agregar */}
      {hoursEditorOpen && (
        <ScheduleHoursEditor
          defaultDate={selectedDate}
          existingTimesByDate={existingTimesByDate}
          busy={busy || (manageSchoolSchedule && loadedCoachId !== coachId)}
          error={error}
          coachOptions={allowSchoolScheduleEdit ? scheduleCoachOptions : []}
          selectedCoachId={coachId}
          onCoachChange={onScheduleCoachChange}
          onClose={closeScheduleEditor}
          onSubmit={applyHours}
        />
      )}

      <Sheet
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        label={confirmCopy?.title}
      >
        {confirmCopy && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-bold text-[var(--c-ocean)]">{confirmCopy.title}</h3>
              <p className="mt-2 text-sm text-[var(--c-text-2)]">{confirmCopy.body}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={runConfirmedAction}
                disabled={busy}
                className="min-h-11 rounded-full bg-rose-500 px-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {confirmCopy.action}
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="min-h-11 rounded-full px-4 text-sm font-bold text-[var(--c-text-2)] hover:text-[var(--c-ocean)]"
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}

// Centered ‹ label › stepper with a count below — month/week navigation.
function NavStepper({
  label,
  count,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  labelClassName = '',
}: {
  label: string
  count: string
  prevLabel: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
  labelClassName?: string
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        aria-label={prevLabel}
        onClick={onPrev}
        className="grid h-8 w-8 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)]"
      >
        <FiChevronLeft aria-hidden="true" />
      </button>
      <span className="inline-flex items-baseline justify-center gap-2 text-center">
        <span className={`text-[var(--c-ocean)] ${labelClassName}`}>{label}</span>
        <span className="text-xs font-semibold text-[var(--c-text-2)]">{count}</span>
      </span>
      <button
        type="button"
        aria-label={nextLabel}
        onClick={onNext}
        className="grid h-8 w-8 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] transition-colors hover:bg-[var(--c-surface)]"
      >
        <FiChevronRight aria-hidden="true" />
      </button>
    </div>
  )
}

function AgendaRow({ time, children }: { time: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--c-border)] px-3 py-2.5 last:border-b-0 sm:gap-3 sm:px-5">
      <span className="w-9 shrink-0 text-xs font-semibold text-[var(--c-text-2)] sm:w-12 sm:text-sm">
        {time}
      </span>
      {children}
    </div>
  )
}

function BinarySwitch({
  leftLabel,
  rightLabel,
  leftIcon,
  rightIcon,
  checked,
  onChange,
  disabled,
  compact = false,
}: {
  leftLabel: string
  rightLabel: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
  compact?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Cambiar entre ${leftLabel} y ${rightLabel}. Estado actual: ${checked ? rightLabel : leftLabel}`}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-start bg-transparent text-xs font-bold text-[var(--c-text-2)] transition-opacity hover:opacity-75 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50 ${
        compact
          ? 'w-full min-w-0 gap-1.5 px-0.5 sm:w-auto sm:min-w-[7.75rem]'
          : 'w-full min-w-0 gap-2.5 px-1 sm:w-auto sm:min-w-40 sm:px-1.5'
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-[var(--c-aqua)]' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute left-[3px] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="flex min-w-0 items-center gap-1 text-left text-[var(--c-ocean)]">
        <span aria-hidden="true" className="shrink-0 text-sm">
          {checked ? rightIcon : leftIcon}
        </span>
        <span className="truncate">{checked ? rightLabel : leftLabel}</span>
      </span>
    </button>
  )
}

function RowIconButton({
  children,
  ariaLabel,
  onClick,
  disabled,
  tone = 'neutral',
}: {
  children: React.ReactNode
  ariaLabel: string
  onClick: () => void
  disabled?: boolean
  tone?: 'neutral' | 'danger'
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border bg-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === 'danger'
          ? 'border-rose-200 text-rose-500 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700'
          : 'border-[var(--c-border)] text-[var(--c-text-2)] hover:border-[var(--c-aqua)] hover:bg-[var(--c-aqua-light)] hover:text-[var(--c-ocean)]'
      }`}
    >
      {children}
    </button>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function weekdayChipLabel(date: Date) {
  const weekday = date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()}`
}

function whatsappDayKey(date: Date) {
  return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()] || ''
}

function slotHasPassed(slot: Pick<CoachAvailableSlot, 'date' | 'startTime'>) {
  return new Date(`${slot.date}T${slot.startTime}:00`).getTime() <= Date.now()
}
