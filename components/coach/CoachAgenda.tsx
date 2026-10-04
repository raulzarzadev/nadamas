'use client'

import Loading from '@comps/Loading'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiClipboard, FiLock, FiPlus, FiSettings, FiUnlock, FiUser, FiUsers } from 'react-icons/fi'
import SchoolReassignStudent from '@/components/school/SchoolReassignStudent'
import Sheet from '@/components/ui/sheet'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { useUser } from '@/context/UserContext'
import type { CoachClassOffering } from '@/firebase/coaches/coach.model'
import { deleteAuthed, getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import { useSchoolAgendaUpdates } from '@/lib/client/use-school-agenda-updates'
import type { CoachAgendaPayload, CoachAvailableSlot, CoachScheduleBlock } from '@/lib/coach-agenda'
import { HOUR_STATUS_STYLE, HOUR_STATUSES, type HourStatus } from '@/lib/coach-agenda-status'
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
import { capitalizeSchoolTerm } from '@/lib/school'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import AgendaAddStudentModal, { type AddStudentPayload } from './AgendaAddStudentModal'
import AgendaStudentActions, { type AgendaStudentAction } from './AgendaStudentActions'
import CoachAgendaDateSelector from './CoachAgendaDateSelector'
import { useCoachAgendaShare } from './CoachAgendaShareContext'
import ScheduleHoursEditor, {
  type HoursMode,
  type ScheduleCoachOption,
} from './ScheduleHoursEditor'
import StudentProgressModal from './StudentProgressModal'

function bookingSlotKey(booking: Pick<Booking, 'date' | 'startTime'>) {
  return `${booking.date}|${booking.startTime}`
}

function replaceMonthHours(
  current: Record<string, string[]>,
  month: string,
  slots: CoachAvailableSlot[]
) {
  const next = Object.fromEntries(
    Object.entries(current).filter(([date]) => !date.startsWith(month))
  ) as Record<string, string[]>
  for (const slot of slots) {
    if (slot.status === 'booked') continue
    const times = next[slot.date] || []
    if (!times.includes(slot.startTime)) times.push(slot.startTime)
    next[slot.date] = times
  }
  for (const times of Object.values(next)) times.sort()
  return next
}

function activeClassSlotCount(
  bookings: Booking[],
  separateByCoach = false,
  separateBySchool = false
) {
  return new Set(
    bookings.map(
      (booking) =>
        `${separateBySchool ? `${booking.schoolId || 'personal'}|` : ''}${separateByCoach ? `${booking.coachId}|` : ''}${bookingSlotKey(booking)}`
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
  schoolId?: string
  schoolClassId?: string
  promoteToGroup?: boolean
  date: string
  startTime: string
  endTime: string
  locationName: string
  groupType: 'particular' | 'grupal'
}
type SchoolRequestDraft = {
  booking: Booking
  date: string
  startTime: string
  endTime: string
  coachId: string
}
type ConfirmAction =
  | { kind: 'cancel-booking'; booking: Booking }
  | { kind: 'delete-slot'; slot: CoachAvailableSlot }
type SlotEditorState = { slot: CoachAvailableSlot; block?: CoachScheduleBlock }

export default function CoachAgenda({
  coachId,
  schoolId,
  agendaSources,
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
  agendaSources?: Array<{ schoolId?: string; label: string }>
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
  const showCoachName = multiCoachAgenda || (aggregateSchool && manageSchoolSchedule)
  const hideBookingActions = readOnlyAgenda || (adminMode && !manageSchoolSchedule)
  const scheduleEndpoint =
    manageSchoolSchedule && schoolId && coachId
      ? `/api/schools/${encodeURIComponent(schoolId)}/teachers/${encodeURIComponent(coachId)}/schedule`
      : '/api/coach/agenda'
  const coachQuery = coachId ? `&coachId=${encodeURIComponent(coachId)}` : ''
  const schoolQuery = schoolId ? `&schoolId=${encodeURIComponent(schoolId)}` : ''
  const contextQuery = `${coachQuery}${schoolQuery}`
  const combinedSources = agendaSources !== undefined
  const agendaUpdateSchoolIds = useMemo(
    () => agendaSources?.flatMap((source) => (source.schoolId ? [source.schoolId] : [])) || [],
    [agendaSources]
  )
  const { user } = useUser() as { user: { uid?: string; id?: string } | null }
  const terminology = useSchoolTerminology()
  const { setScheduleText } = useCoachAgendaShare()
  const selfUid = user?.uid || user?.id
  const participantSingular =
    schoolId && terminology.schoolId ? terminology.participantSingular : 'alumno'
  const participantPlural =
    schoolId && terminology.schoolId ? terminology.participantPlural : 'alumnos'
  const coachFallback =
    schoolId && terminology.schoolId ? capitalizeSchoolTerm(terminology.coachSingular) : 'Coach'

  const [agenda, setAgenda] = useState<CoachAgendaPayload | undefined>(undefined)
  const [scheduleHoursByDate, setScheduleHoursByDate] = useState<Record<string, string[]>>({})
  const [loadedCoachId, setLoadedCoachId] = useState<string | undefined>(coachId)
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [selectedStatuses, setSelectedStatuses] = useState<Set<HourStatus>>(
    () => new Set(HOUR_STATUSES)
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addStudentSlot, setAddStudentSlot] = useState<ActiveSlot | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [slotEditor, setSlotEditor] = useState<SlotEditorState | null>(null)
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
  const [studentAction, setStudentAction] = useState<{
    booking: Booking
    student: AgendaStudentAction
  } | null>(null)
  const [studentActionError, setStudentActionError] = useState<string | null>(null)
  const [studentToReassign, setStudentToReassign] = useState<{
    booking: Booking
    student: AgendaStudentAction
  } | null>(null)
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null)
  const [schoolRequestDraft, setSchoolRequestDraft] = useState<SchoolRequestDraft | null>(null)
  const [schoolClassToEdit, setSchoolClassToEdit] = useState<Booking | null>(null)
  const [schoolClassToReassign, setSchoolClassToReassign] = useState<Booking | null>(null)
  const [schoolTeachers, setSchoolTeachers] = useState<Array<{ id: string; name: string }>>([])
  const [notice, setNotice] = useState<string | null>(null)
  const agendaRequestRef = useRef(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset cached hours when the viewed coach or school changes.
  useEffect(() => {
    setScheduleHoursByDate({})
  }, [coachId, schoolId])

  useEffect(() => {
    if (!slotEditor || !agenda) return
    const current = slotEditor.slot
    const updatedSlot = agenda.availableSlots.find(
      (slot) =>
        slot.id === current.id &&
        slot.date === current.date &&
        slot.startTime === current.startTime &&
        slot.coachId === current.coachId &&
        (!combinedSources || slot.schoolId === current.schoolId)
    )
    if (!updatedSlot) return
    const updatedBlock = agenda.blocks.find(
      (block) =>
        block.date === current.date &&
        block.coachId === current.coachId &&
        (!combinedSources || block.schoolId === current.schoolId) &&
        !block.hidden &&
        (block.allDay ||
          (block.startTime === current.startTime && block.endTime === current.endTime))
    )
    setSlotEditor((previous) => {
      if (!previous || previous.slot.id !== current.id) return previous
      if (previous.slot === updatedSlot && previous.block?.id === updatedBlock?.id) return previous
      return { slot: updatedSlot, block: updatedBlock }
    })
  }, [agenda, combinedSources, slotEditor])

  useEffect(() => {
    if (!agenda) return
    const refreshBooking = (previous: Booking | null) =>
      previous ? agenda.bookings.find((booking) => booking.id === previous.id) || previous : null
    setBookingToEdit(refreshBooking)
    setSchoolClassToEdit(refreshBooking)
  }, [agenda])

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
        if (agendaSources) {
          const sourceAgendas = await Promise.all(
            agendaSources.map(async (source) => {
              const sourceQuery = source.schoolId
                ? `&schoolId=${encodeURIComponent(source.schoolId)}`
                : ''
              const response = await getAuthed(`/api/coach/agenda?month=${month}${sourceQuery}`)
              const payload = (await response.json()) as CoachAgendaPayload
              return {
                ...payload,
                bookings: payload.bookings.map((booking) => ({
                  ...booking,
                  schoolId: source.schoolId,
                  agendaLabel: source.label,
                })),
                availableSlots: payload.availableSlots.map((slot) => ({
                  ...slot,
                  schoolId: source.schoolId,
                  agendaLabel: source.label,
                })),
                blocks: payload.blocks.map((block) => ({
                  ...block,
                  schoolId: source.schoolId,
                })),
              }
            })
          )
          if (requestId !== agendaRequestRef.current) return
          setAgenda({
            bookings: sourceAgendas.flatMap((payload) => payload.bookings),
            availableSlots: sourceAgendas.flatMap((payload) => payload.availableSlots),
            blocks: sourceAgendas.flatMap((payload) => payload.blocks),
            offerings: [],
            coachNames: Object.assign({}, ...sourceAgendas.map((payload) => payload.coachNames)),
          })
          setScheduleHoursByDate((current) =>
            replaceMonthHours(
              current,
              month,
              sourceAgendas.flatMap((payload) => payload.availableSlots)
            )
          )
          setLoadedCoachId(coachId)
          return
        }
        const endpoint =
          (aggregateSchool || manageSchoolSchedule) && schoolId
            ? `/api/schools/${encodeURIComponent(schoolId)}/agenda?month=${month}${coachQuery}${readOnly ? '&view=public' : ''}`
            : `/api/coach/agenda?month=${month}${contextQuery}`
        const response = await getAuthed(endpoint)
        const nextAgenda = (await response.json()) as CoachAgendaPayload
        if (requestId !== agendaRequestRef.current) return
        setAgenda(nextAgenda)
        setScheduleHoursByDate((current) =>
          replaceMonthHours(current, month, nextAgenda.availableSlots)
        )
        setLoadedCoachId(coachId)
      } catch (err) {
        if (requestId !== agendaRequestRef.current) return
        reportInternalError('COACH_AGENDA_LOAD', err)
        setError(GENERIC_USER_ERROR)
        setAgenda({ bookings: [], availableSlots: [], blocks: [], offerings: [] })
        setScheduleHoursByDate((current) =>
          Object.fromEntries(Object.entries(current).filter(([date]) => !date.startsWith(month)))
        )
        setLoadedCoachId(undefined)
      }
    },
    [
      aggregateSchool,
      manageSchoolSchedule,
      coachQuery,
      contextQuery,
      schoolId,
      coachId,
      readOnly,
      agendaSources,
    ]
  )

  useEffect(() => {
    loadAgenda(monthOfSelected)
  }, [loadAgenda, monthOfSelected])

  useSchoolAgendaUpdates(combinedSources ? agendaUpdateSchoolIds : schoolId, () => {
    void loadAgenda(monthOfSelected)
  })

  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date(`${selectedDate}T12:00:00`))
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [selectedDate])

  const changeWeek = (delta: number) =>
    setSelectedDate(dateKey(addDays(new Date(`${selectedDate}T12:00:00`), delta * 7)))

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
      const key = combinedSources
        ? `${booking.schoolId || 'personal'}|${booking.coachId}|${booking.date}|${booking.startTime}`
        : multiCoachAgenda
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
        combinedSources
          ? `${booking.schoolId || 'personal'}|${booking.coachId}|${booking.date}|${booking.startTime}`
          : multiCoachAgenda
            ? `${booking.coachId}|${booking.date}|${booking.startTime}`
            : bookingSlotKey(booking)
      )
    )
    const slotKeys = new Set<string>()
    const groupSlotKeys = new Set<string>()
    for (const slot of agenda?.availableSlots || []) {
      const key = combinedSources
        ? `${slot.schoolId || 'personal'}|${slot.coachId}|${slot.date}|${slot.startTime}`
        : multiCoachAgenda
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
      const blockKey = combinedSources
        ? `${block.schoolId || 'personal'}|${block.coachId}|${block.date}|${block.startTime || ''}`
        : multiCoachAgenda
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
  }, [activeBookings, agenda?.availableSlots, agenda?.blocks, multiCoachAgenda, combinedSources])

  const monthStats = useMemo(() => {
    const inMonth = (date: string) => date.startsWith(monthOfSelected)
    const booked = activeClassSlotCount(
      activeBookings.filter((booking) => inMonth(booking.date)),
      multiCoachAgenda,
      combinedSources
    )
    const available = (agenda?.availableSlots || []).filter(
      (slot) => slot.status === 'available' && inMonth(slot.date)
    ).length
    return { booked, total: booked + available }
  }, [activeBookings, agenda?.availableSlots, monthOfSelected, multiCoachAgenda, combinedSources])

  const weekStats = useMemo(() => {
    let booked = 0
    let total = 0
    for (const date of weekDates) {
      for (const status of dayStatuses.get(dateKey(date)) || []) {
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
    return scheduleHoursByDate
  }, [scheduleHoursByDate])

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
  const bookingClassMembers = bookingToEdit
    ? dayBookings.filter(
        (booking) =>
          booking.coachId === bookingToEdit.coachId &&
          booking.schoolId === bookingToEdit.schoolId &&
          booking.startTime === bookingToEdit.startTime &&
          booking.offeringId === bookingToEdit.offeringId &&
          booking.scheduleId === bookingToEdit.scheduleId
      )
    : []
  const blockForBooking = (booking: Booking) =>
    dayBlocks.find(
      (block) =>
        (!combinedSources || block.schoolId === booking.schoolId) &&
        block.coachId === booking.coachId &&
        !block.hidden &&
        blockCoversClassAt(block, booking.date, booking.startTime)
    )
  // In a school-wide view, one coach blocking a full day must not hide every
  // other coach's schedule. The individual slots already carry the blocked state.
  const allDayBlock =
    multiCoachAgenda || combinedSources ? undefined : dayBlocks.find((block) => block.allDay)

  const rows = useMemo(() => {
    const slotKey = (coachId: string, startTime: string, sourceId?: string) =>
      combinedSources
        ? `${sourceId || 'personal'}|${coachId}|${startTime}`
        : multiCoachAgenda
          ? `${coachId}|${startTime}`
          : startTime
    const bookedTimes = new Set(
      dayBookings.map((booking) => slotKey(booking.coachId, booking.startTime, booking.schoolId))
    )
    const available = daySlots
      .filter(
        (slot) =>
          !bookedTimes.has(slotKey(slot.coachId, slot.startTime, slot.schoolId)) &&
          slot.status === 'available'
      )
      .map((slot) => ({ kind: 'available' as const, sort: slot.startTime, slot }))
    const groupedBookings = new Map<string, Booking[]>()
    for (const booking of dayBookings) {
      const key = slotKey(booking.coachId, booking.startTime, booking.schoolId)
      const group = groupedBookings.get(key) || []
      group.push(booking)
      groupedBookings.set(key, group)
    }
    const booked = Array.from(groupedBookings.entries()).map(([key, bookings]) => {
      const classStudentIds = new Set(
        bookings.flatMap((booking) => booking.schoolClassStudentIds || [])
      )
      return {
        kind: 'booked' as const,
        sort: bookings[0]?.startTime || key,
        bookings: bookings
          .filter((booking) => booking.schoolClassId || !classStudentIds.has(booking.athleteId))
          .sort((a, b) => a.athleteName.localeCompare(b.athleteName)),
      }
    })
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
      const key = slotKey(slot.coachId, slot.startTime, slot.schoolId)
      if (bookedTimes.has(key) || seen.has(key)) continue
      seen.add(key)
      const block = dayBlocks.find(
        (b) =>
          (!multiCoachAgenda || b.coachId === slot.coachId) &&
          (!combinedSources || b.schoolId === slot.schoolId) &&
          !b.hidden &&
          (b.allDay ||
            (b.startTime && b.endTime && b.startTime < slot.endTime && slot.startTime < b.endTime))
      )
      // Hidden blocks (removed entirely) have no visible row.
      if (!block) continue
      blocked.push({ kind: 'blocked', sort: slot.startTime, slot, block })
    }
    const sourceOrder = (
      row: (typeof available)[number] | (typeof booked)[number] | (typeof blocked)[number]
    ) => {
      const label = row.kind === 'booked' ? row.bookings[0]?.agendaLabel : row.slot.agendaLabel
      return agendaSources?.findIndex((source) => source.label === label) ?? 0
    }
    return [...available, ...booked, ...blocked]
      .filter((row) => {
        const status: HourStatus =
          row.kind === 'available'
            ? row.slot.groupType === 'grupal'
              ? 'groupAvailable'
              : 'available'
            : row.kind === 'blocked'
              ? 'blocked'
              : row.bookings.length > 1 ||
                  row.bookings.some((booking) => booking.groupType === 'grupal')
                ? 'group'
                : 'booked'
        return selectedStatuses.has(status)
      })
      .sort((a, b) => a.sort.localeCompare(b.sort) || sourceOrder(a) - sourceOrder(b))
  }, [
    daySlots,
    dayBookings,
    dayBlocks,
    multiCoachAgenda,
    combinedSources,
    selectedStatuses,
    agendaSources,
  ])

  const toggleStatus = (status: HourStatus) => {
    setSelectedStatuses((current) => {
      const next = new Set(current)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

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
  const schoolIdForSlot = (slot: Pick<CoachAvailableSlot, 'schoolId'>) =>
    combinedSources ? slot.schoolId : schoolId
  const schoolIdForBooking = (booking: Pick<Booking, 'schoolId'>) =>
    combinedSources ? booking.schoolId : schoolId
  const schoolQueryFor = (targetSchoolId?: string) =>
    targetSchoolId ? `&schoolId=${encodeURIComponent(targetSchoolId)}` : ''

  const block = (slot: CoachAvailableSlot, hidden: boolean) => {
    const targetSchoolId = schoolIdForSlot(slot)
    return run(() =>
      postAuthed(scheduleEndpointFor(slot.coachId), {
        date: slot.date,
        allDay: false,
        startTime: slot.startTime,
        endTime: slot.endTime,
        hidden,
        ...(coachId ? { coachId } : {}),
        ...(targetSchoolId ? { schoolId: targetSchoolId } : {}),
      })
    )
  }

  // Bloquear: hide from athletes but keep visible to the coach (Bloqueado row,
  // can still add a student).
  const bloquearSlot = (slot: CoachAvailableSlot) => block(slot, false)

  // Eliminar: hide the recurring offering occurrence so it disappears from this
  // day (creates a hidden block). El horario base se edita en "Mis horarios".
  const eliminarSlot = (slot: CoachAvailableSlot) => block(slot, true)

  const cancelBooking = (booking: Booking) => {
    const targetSchoolId = schoolIdForBooking(booking)
    return run(() =>
      deleteAuthed(
        `/api/coach/agenda/bookings?id=${encodeURIComponent(booking.id)}${schoolQueryFor(targetSchoolId)}${manageSchoolSchedule ? `&coachId=${encodeURIComponent(booking.coachId)}` : coachQuery}`
      )
    )
  }

  const updateClassSettings = (
    bookings: Booking[],
    settings: { groupType?: 'particular' | 'grupal'; classFull?: boolean }
  ) => {
    const booking = bookings[0]
    if (!booking) return
    const targetSchoolId = schoolIdForBooking(booking)
    run(() =>
      patchAuthed('/api/coach/agenda/bookings', {
        ...(manageSchoolSchedule ? { coachId: booking.coachId } : {}),
        date: booking.date,
        startTime: booking.startTime,
        offeringId: booking.offeringId,
        scheduleId: booking.scheduleId,
        ...(targetSchoolId ? { schoolId: targetSchoolId } : {}),
        ...settings,
      })
    )
  }

  const updateBookingAvailability = (booking: Booking, blocked: boolean) => {
    const existingBlock = blockForBooking(booking)
    if (blocked && !existingBlock)
      bloquearSlot({
        ...booking,
        coachName: booking.coachName || undefined,
        status: 'booked',
      })
    else if (!blocked && existingBlock) unblock(existingBlock)
  }

  const saveStudentAction = async (attended: boolean, note: string) => {
    if (!studentAction) return
    const { booking, student } = studentAction
    const targetSchoolId = schoolIdForBooking(booking)
    setBusy(true)
    setStudentActionError(null)
    try {
      if (booking.schoolClassId && targetSchoolId) {
        await patchAuthed(
          `/api/schools/${encodeURIComponent(targetSchoolId)}/classes/${encodeURIComponent(booking.schoolClassId)}/students/${encodeURIComponent(student.studentId)}`,
          { attended, note }
        )
      } else {
        await patchAuthed('/api/coach/agenda/bookings', {
          id: booking.id,
          attended,
          note,
          ...(targetSchoolId ? { schoolId: targetSchoolId } : {}),
          ...(manageSchoolSchedule ? { coachId: booking.coachId } : {}),
        })
      }
      setStudentAction(null)
      setNotice('Ficha del alumno guardada.')
      await loadAgenda(monthOfSelected)
    } catch (err) {
      reportInternalError('COACH_STUDENT_ACTION_SAVE', err)
      setStudentActionError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const removeStudentFromClass = async () => {
    if (!studentAction) return
    const { booking, student } = studentAction
    const targetSchoolId = schoolIdForBooking(booking)
    setBusy(true)
    setStudentActionError(null)
    try {
      if (booking.schoolClassId && targetSchoolId) {
        await deleteAuthed(
          `/api/schools/${encodeURIComponent(targetSchoolId)}/classes/${encodeURIComponent(booking.schoolClassId)}/students/${encodeURIComponent(student.studentId)}`
        )
      } else {
        await deleteAuthed(
          `/api/coach/agenda/bookings?id=${encodeURIComponent(booking.id)}${schoolQueryFor(targetSchoolId)}${manageSchoolSchedule ? `&coachId=${encodeURIComponent(booking.coachId)}` : coachQuery}`
        )
      }
      setStudentAction(null)
      setNotice(`${capitalizeSchoolTerm(participantSingular)} eliminado de la clase.`)
      await loadAgenda(monthOfSelected)
    } catch (err) {
      reportInternalError('COACH_STUDENT_ACTION_REMOVE', err)
      setStudentActionError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const handleSchoolRequest = (booking: Booking, status: 'approved' | 'rejected') => {
    const targetSchoolId = schoolIdForBooking(booking)
    if (!targetSchoolId || !booking.schoolRequestId) return
    run(() =>
      patchAuthed(
        `/api/schools/${encodeURIComponent(targetSchoolId)}/class-requests/${encodeURIComponent(booking.schoolRequestId as string)}`,
        { status }
      )
    )
  }

  const openSchoolClassEditor = (booking: Booking) => setSchoolClassToEdit(booking)

  const openSchoolClassAddStudent = (booking: Booking) => {
    const targetSchoolId = schoolIdForBooking(booking) || booking.schoolId
    if (!targetSchoolId || !booking.schoolClassId) return
    setAddStudentSlot({
      coachId: booking.coachId,
      schoolId: targetSchoolId,
      schoolClassId: booking.schoolClassId,
      promoteToGroup: booking.groupType !== 'grupal',
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      locationName: booking.locationName || 'Clase de natación',
      groupType: 'grupal',
    })
    setSchoolClassToEdit(null)
  }

  const openGroupClassAddStudent = (booking: Booking) => {
    if (booking.schoolClassId) {
      openSchoolClassAddStudent(booking)
      return
    }
    setAddStudentSlot({
      coachId: booking.coachId,
      schoolId: booking.schoolId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      locationName: booking.locationName || 'Horario abierto',
      groupType: 'grupal',
    })
  }

  const cancelSchoolClass = (booking: Booking) => {
    const targetSchoolId = schoolIdForBooking(booking)
    if (!targetSchoolId || !booking.schoolClassId) return
    run(async () => {
      await patchAuthed(
        `/api/schools/${encodeURIComponent(targetSchoolId)}/classes/${encodeURIComponent(booking.schoolClassId as string)}`,
        { status: 'cancelled' }
      )
      setSchoolClassToEdit(null)
      setNotice('Clase cancelada.')
    })
  }

  const updateSchoolClassStatus = (booking: Booking, status: 'pending' | 'scheduled') => {
    const targetSchoolId = schoolIdForBooking(booking)
    if (!targetSchoolId || !booking.schoolClassId) return
    run(async () => {
      await patchAuthed(
        `/api/schools/${encodeURIComponent(targetSchoolId)}/classes/${encodeURIComponent(booking.schoolClassId as string)}`,
        { status }
      )
      setSchoolClassToEdit(null)
      setNotice(status === 'pending' ? 'Clase pendiente de aprobación.' : 'Clase aprobada.')
    })
  }

  const updateSchoolClassSettings = (
    booking: Booking,
    settings: { groupType?: 'particular' | 'grupal'; classFull?: boolean }
  ) => {
    const targetSchoolId = schoolIdForBooking(booking)
    if (!targetSchoolId || !booking.schoolClassId) return
    run(() =>
      patchAuthed(
        `/api/schools/${encodeURIComponent(targetSchoolId)}/classes/${encodeURIComponent(booking.schoolClassId as string)}`,
        {
          ...(settings.groupType
            ? { type: settings.groupType === 'grupal' ? 'group' : 'individual' }
            : {}),
          ...(settings.classFull !== undefined ? { classFull: settings.classFull } : {}),
        }
      )
    )
  }

  const openSchoolRequestEditor = async (booking: Booking) => {
    const targetSchoolId = schoolIdForBooking(booking)
    if (!targetSchoolId) return
    setBusy(true)
    setError(null)
    try {
      const response = await getAuthed(
        `/api/schools/${encodeURIComponent(targetSchoolId)}/teachers`
      )
      if (!response.ok) throw new Error('teachers')
      const payload = (await response.json()) as {
        teachers?: Array<{ id: string; name: string; status?: string }>
      }
      const teachers = (payload.teachers || []).filter((teacher) => teacher.status === 'active')
      setSchoolTeachers(teachers)
      setSchoolRequestDraft({
        booking,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        coachId: booking.coachId,
      })
    } catch (err) {
      reportInternalError('COACH_SCHOOL_REQUEST_EDIT', err)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const approveSchoolRequestWithChanges = () => {
    const bookingSchoolId = schoolRequestDraft
      ? schoolIdForBooking(schoolRequestDraft.booking)
      : undefined
    if (!bookingSchoolId || !schoolRequestDraft?.booking.schoolRequestId) return
    const { booking, date, startTime, endTime, coachId: nextCoachId } = schoolRequestDraft
    const day = new Date(`${date}T12:00:00`).getDay()
    run(async () => {
      await patchAuthed(
        `/api/schools/${encodeURIComponent(bookingSchoolId)}/class-requests/${encodeURIComponent(booking.schoolRequestId as string)}`,
        {
          status: 'approved',
          teacherIds: [nextCoachId],
          startDate: date,
          endDate: date,
          startTime,
          endTime,
          daysOfWeek: [day],
        }
      )
      setSchoolRequestDraft(null)
    })
  }

  const unblock = (block: CoachScheduleBlock) => {
    const targetSchoolId = combinedSources ? block.schoolId : schoolId
    return run(() =>
      deleteAuthed(
        `${scheduleEndpointFor(block.coachId)}?id=${encodeURIComponent(block.id)}${schoolQueryFor(targetSchoolId)}`
      )
    )
  }

  const openSlotEditor = (slot: CoachAvailableSlot, block?: CoachScheduleBlock) =>
    setSlotEditor({ slot, block })

  const updateSlotAvailability = (checked: boolean) => {
    if (!slotEditor) return
    const { slot, block: slotBlock } = slotEditor
    if (checked) bloquearSlot(slot)
    else if (slotBlock) unblock(slotBlock)
  }

  const updateSlotType = (checked: boolean) => {
    if (!slotEditor) return
    const { slot } = slotEditor
    updateAvailableSlotGroupType(slot, checked)
  }

  const requestSlotDeletion = () => {
    if (!slotEditor) return
    setConfirmAction({ kind: 'delete-slot', slot: slotEditor.slot })
    setSlotEditor(null)
  }

  const submitAddStudent = (slot: ActiveSlot, payloads: AddStudentPayload[]) =>
    run(async () => {
      if (slot.schoolClassId) {
        const targetSchoolId = slot.schoolId || schoolId
        const studentIds = payloads.flatMap((payload) =>
          payload.athleteId ? [payload.athleteId] : []
        )
        if (!targetSchoolId || studentIds.length !== payloads.length)
          throw new Error('SCHOOL_CLASS_STUDENT_REQUIRED')
        await postAuthed(
          `/api/schools/${encodeURIComponent(targetSchoolId)}/classes/${encodeURIComponent(slot.schoolClassId)}/students`,
          { studentIds, ...(slot.promoteToGroup ? { promoteToGroup: true } : {}) }
        )
      } else {
        for (const payload of payloads) {
          await postAuthed('/api/coach/agenda/bookings', {
            ...(manageSchoolSchedule && coachId ? { coachId } : {}),
            ...slot,
            ...payload,
            ...(slot.schoolId || schoolId ? { schoolId: slot.schoolId || schoolId } : {}),
          })
        }
      }
      setAddStudentSlot(null)
    })

  // Single offering updated by the school hours editor.
  const offerings = agenda?.offerings || []
  const offering = offerings[0] || null
  const saveOfferings = (next: CoachClassOffering) =>
    postAuthed(manageSchoolSchedule ? scheduleEndpoint : '/api/coach/offerings', {
      ...(schoolId ? { schoolId } : {}),
      ...(adminMode && !manageSchoolSchedule ? { coachId } : {}),
      classOfferings: offerings.some((item) => item.id === next.id)
        ? offerings.map((item) => (item.id === next.id ? next : item))
        : [...offerings, next],
    })
  const saveOfferingList = (next: CoachClassOffering[]) =>
    postAuthed(manageSchoolSchedule ? scheduleEndpoint : '/api/coach/offerings', {
      ...(schoolId ? { schoolId } : {}),
      ...(adminMode && !manageSchoolSchedule ? { coachId } : {}),
      classOfferings: next,
    })

  const updateAvailableSlotGroupType = (slot: CoachAvailableSlot, checked: boolean) => {
    run(async () => {
      let targetOfferings = offerings
      const targetSchoolId = schoolIdForSlot(slot)
      if (combinedSources) {
        const response = await getAuthed(
          `/api/coach/agenda?month=${monthOfSelected}${schoolQueryFor(targetSchoolId)}`
        )
        targetOfferings = ((await response.json()) as CoachAgendaPayload).offerings || []
      } else if (manageSchoolSchedule && schoolId && !coachId) {
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
      else if (combinedSources)
        await postAuthed('/api/coach/offerings', {
          ...(targetSchoolId ? { schoolId: targetSchoolId } : {}),
          classOfferings: next,
        })
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
        setNotice(`No se quitaron ${skipped} hora(s) ocupada(s). Cancela la clase primero.`)
      }
    })
  }

  const confirmCopy =
    confirmAction?.kind === 'cancel-booking'
      ? {
          title: 'Cancelar clase',
          body: `Se cancelará la clase de ${confirmAction.booking.athleteName} a las ${confirmAction.booking.startTime}. ${capitalizeSchoolTerm(participantSingular)} seguirá guardado en tu lista.`,
          action: 'Cancelar clase',
        }
      : confirmAction?.kind === 'delete-slot'
        ? {
            title: 'Eliminar horario',
            body: `Se eliminará el horario de las ${confirmAction.slot.startTime}. Ya no aparecerá como disponible para ${participantPlural}.`,
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
      <CoachAgendaDateSelector
        selectedDate={selectedDate}
        weekDates={weekDates}
        dayStatuses={dayStatuses}
        monthCount={`${monthStats.booked}/${monthStats.total}`}
        weekCount={`${weekStats.booked}/${weekStats.total}`}
        selectedStatuses={selectedStatuses}
        onToggleStatus={toggleStatus}
        onSelectDate={setSelectedDate}
        onChangeWeek={changeWeek}
      />

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
              {selectedDate < dateKey(new Date())
                ? 'No hay clases registradas para este día.'
                : schoolId
                  ? 'No hay horarios asignados para este día.'
                  : 'No hay horarios este día.'}
            </p>
          )}

          {!allDayBlock &&
            rows.map((row, rowIndex) => {
              const showTime = rowIndex === 0 || rows[rowIndex - 1]?.sort !== row.sort
              const showSeparator = rows[rowIndex + 1]?.sort !== row.sort
              if (row.kind === 'booked') {
                const firstBooking = row.bookings[0]
                if (!firstBooking) return null
                const schoolClassBooking =
                  row.bookings.find(
                    (booking) =>
                      booking.schoolClassId &&
                      booking.groupType === 'grupal' &&
                      (booking.status === 'confirmed' || booking.status === 'pending')
                  ) ||
                  row.bookings.find(
                    (booking) => booking.schoolClassId && booking.status === 'confirmed'
                  ) ||
                  row.bookings.find((booking) => booking.schoolClassId)
                const hasSchoolClass = Boolean(schoolClassBooking)
                const hasPendingRequest = row.bookings.some(
                  (booking) =>
                    Boolean(booking.schoolRequestId) ||
                    booking.status === 'pending' ||
                    booking.schoolClassStudents?.some((student) => student.pending)
                )
                const isGroupClass =
                  row.bookings.length > 1 ||
                  row.bookings.some((booking) => booking.groupType === 'grupal')
                const addStudentBooking =
                  schoolClassBooking || (!hasPendingRequest ? firstBooking : null)
                const classAcceptsStudents = schoolClassBooking
                  ? addStudentBooking?.status === 'confirmed' ||
                    addStudentBooking?.status === 'pending'
                  : addStudentBooking?.status === 'confirmed'
                const canAddToGroup =
                  isGroupClass &&
                  !hideBookingActions &&
                  classAcceptsStudents &&
                  !row.bookings.some((booking) => Boolean(blockForBooking(booking))) &&
                  (!schoolClassBooking ||
                    schoolClassBooking.groupType === 'grupal' ||
                    manageSchoolSchedule)
                const groupIsFull = row.bookings.some((booking) => booking.classFull)
                const classStudentCount = isGroupClass
                  ? row.bookings.reduce(
                      (count, booking) => count + (booking.schoolClassStudentCount ?? 1),
                      0
                    )
                  : 1
                const classStudentLabel =
                  classStudentCount === 1 ? participantSingular : participantPlural
                const classStyle = isGroupClass ? HOUR_STATUS_STYLE.group : HOUR_STATUS_STYLE.booked
                return (
                  <AgendaRow
                    key={`b-${firstBooking.schoolId || 'personal'}-${firstBooking.coachId}-${firstBooking.date}-${firstBooking.startTime}`}
                    time={row.sort}
                    showTime={showTime}
                    showSeparator={showSeparator}
                  >
                    <div
                      className={`flex min-w-0 flex-1 flex-col gap-3 rounded-[var(--r-md)] border px-3 py-3 ${classStyle.border} ${classStyle.bg}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {showCoachName && (
                          <span className="min-w-0 truncate text-sm font-extrabold text-[var(--c-ocean)]">
                            {firstBooking.coachName ||
                              agenda.coachNames?.[firstBooking.coachId] ||
                              coachFallback}
                          </span>
                        )}
                        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
                          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-right text-xs font-bold uppercase text-[var(--c-text-2)]">
                            <span className="sr-only">
                              {isGroupClass ? 'Clase grupal' : 'Clase particular'} con{' '}
                            </span>
                            {isGroupClass ? (
                              <FiUsers aria-hidden="true" />
                            ) : (
                              <FiUser aria-hidden="true" />
                            )}
                            ({classStudentCount})
                            <span className="sr-only"> {classStudentLabel}</span>
                            {row.bookings.some((booking) => booking.schoolRequestId) && (
                              <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-900">
                                Pendiente de aprobación
                              </span>
                            )}
                          </span>
                          {combinedSources && firstBooking.agendaLabel && (
                            <span className="w-fit rounded-full border border-[var(--c-border)] bg-white/80 px-2.5 py-1 text-xs font-bold text-[var(--c-ocean)]">
                              {firstBooking.agendaLabel}
                            </span>
                          )}
                          {canAddToGroup && addStudentBooking && (
                            <button
                              type="button"
                              onClick={() => openGroupClassAddStudent(addStudentBooking)}
                              disabled={
                                busy ||
                                groupIsFull ||
                                Boolean(schoolClassBooking && classStudentCount >= 100)
                              }
                              aria-label={`Agregar ${participantSingular} a la clase grupal`}
                              title={groupIsFull ? 'Abre el cupo para agregar alumnos.' : undefined}
                              className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--c-aqua)] px-3 text-xs font-bold text-white transition-colors hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <FiPlus aria-hidden="true" />{' '}
                              {capitalizeSchoolTerm(participantSingular)}
                            </button>
                          )}
                          {!hideBookingActions && (hasSchoolClass || !hasPendingRequest) && (
                            <span className="ml-auto flex shrink-0">
                              <RowIconButton
                                ariaLabel="Configurar clase"
                                onClick={() =>
                                  schoolClassBooking
                                    ? openSchoolClassEditor(schoolClassBooking)
                                    : setBookingToEdit(firstBooking)
                                }
                                disabled={busy}
                              >
                                <FiSettings aria-hidden="true" />
                              </RowIconButton>
                            </span>
                          )}
                        </div>
                      </div>

                      <ul className="flex flex-col gap-2">
                        {row.bookings
                          .flatMap((booking) =>
                            booking.schoolClassStudents?.length
                              ? booking.schoolClassStudents.map((student) => ({
                                  booking,
                                  rowKey: `${booking.id}:${student.id}`,
                                  studentName: student.name,
                                  studentId: student.id,
                                  attended: student.attended === true,
                                  note: student.note || '',
                                  pending: student.pending,
                                }))
                              : [
                                  {
                                    booking,
                                    rowKey: booking.id,
                                    studentName: booking.athleteName,
                                    studentId: booking.athleteId,
                                    attended: booking.attended === true,
                                    note: booking.studentNote || '',
                                    pending: Boolean(
                                      booking.schoolRequestId || booking.status === 'pending'
                                    ),
                                  },
                                ]
                          )
                          .map(
                            ({
                              booking,
                              rowKey,
                              studentName,
                              studentId,
                              attended,
                              note,
                              pending,
                            }) => (
                              <li
                                key={rowKey}
                                className="flex items-center justify-between gap-2 rounded-[var(--r-sm)] bg-white/55 px-2.5 py-1.5"
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--c-border)] bg-white text-xs font-bold text-[var(--c-ocean)] shadow-[0_1px_0_rgba(10,37,64,0.04)]">
                                    {initials(studentName)}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    {booking.schoolClassTitle && (
                                      <span className="block text-xs font-semibold text-[var(--c-text-2)]">
                                        {booking.schoolClassTitle}
                                      </span>
                                    )}
                                    <span className="block break-words text-base font-extrabold leading-tight text-[var(--c-ocean)]">
                                      {studentName}
                                    </span>
                                    {!hideBookingActions &&
                                      !manageSchoolSchedule &&
                                      !booking.schoolClassId &&
                                      !booking.schoolRequestId && (
                                        <Link
                                          href={`/coach/students?student=${encodeURIComponent(booking.athleteId)}`}
                                          className="mt-1 inline-flex min-h-6 items-center text-sm font-semibold text-[var(--c-aqua-strong)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                                        >
                                          ver perfil ›
                                        </Link>
                                      )}
                                  </span>
                                </div>
                                <div className="ml-auto flex shrink-0 flex-col items-end gap-1 self-start">
                                  {pending && (
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">
                                      Pendiente de aprobación
                                    </span>
                                  )}
                                  {!hideBookingActions && !booking.schoolRequestId && (
                                    <button
                                      type="button"
                                      aria-label={`Abrir ficha de ${studentName}`}
                                      title={`Ficha de ${studentName}`}
                                      onClick={() => {
                                        setStudentAction({
                                          booking,
                                          student: {
                                            studentId,
                                            studentName,
                                            attended,
                                            note,
                                            date: booking.date,
                                            startTime: booking.startTime,
                                          },
                                        })
                                        setStudentActionError(null)
                                      }}
                                      disabled={busy}
                                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:opacity-50"
                                    >
                                      <FiClipboard aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                                {booking.schoolRequestId && !hideBookingActions && (
                                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => handleSchoolRequest(booking, 'approved')}
                                      disabled={busy}
                                      className="min-h-10 rounded-full bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                                    >
                                      Aprobar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSchoolRequest(booking, 'rejected')}
                                      disabled={busy}
                                      className="min-h-10 rounded-full border border-[var(--rose-bd)] px-3 text-xs font-bold text-[var(--rose-tx)] hover:bg-[var(--rose-bg)] disabled:opacity-50"
                                    >
                                      Rechazar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void openSchoolRequestEditor(booking)}
                                      disabled={busy}
                                      className="col-span-2 min-h-10 rounded-full border border-[var(--c-border)] px-3 text-xs font-bold text-[var(--c-ocean)] hover:bg-white disabled:opacity-50 sm:col-span-1"
                                    >
                                      Cambiar hora o entrenador
                                    </button>
                                  </div>
                                )}
                              </li>
                            )
                          )}
                      </ul>
                    </div>
                  </AgendaRow>
                )
              }
              if (row.kind === 'blocked') {
                const isBlockedGroup = row.slot.groupType === 'grupal'
                return (
                  <AgendaRow
                    key={`x-${row.slot.schoolId || 'personal'}-${row.slot.coachId}-${row.slot.id}`}
                    time={row.slot.startTime}
                    showTime={showTime}
                    showSeparator={showSeparator}
                  >
                    <div
                      className={`flex min-w-0 flex-1 flex-col gap-2 rounded-[var(--r-md)] border px-2.5 py-1 sm:flex-row sm:items-center sm:justify-between sm:px-3 ${HOUR_STATUS_STYLE.blocked.border} ${HOUR_STATUS_STYLE.blocked.bg}`}
                    >
                      {readOnlyAgenda || (adminMode && !manageSchoolSchedule) ? (
                        <span className="flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
                          <FiLock aria-hidden="true" /> Bloqueado
                          <span className="font-normal text-[var(--c-text-2)]">
                            ·{' '}
                            {row.slot.coachName ||
                              agenda.coachNames?.[row.slot.coachId] ||
                              coachFallback}
                          </span>
                        </span>
                      ) : (
                        <div className="flex min-w-0 flex-wrap items-center gap-2 opacity-60">
                          {showCoachName && (
                            <span className="text-xs font-bold">
                              {row.slot.coachName ||
                                agenda.coachNames?.[row.slot.coachId] ||
                                coachFallback}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
                            <span className="inline-flex items-center gap-1">
                              <FiLock aria-hidden="true" className="h-3.5 w-3.5" /> Bloqueado
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              {isBlockedGroup ? (
                                <FiUsers aria-hidden="true" className="h-3.5 w-3.5" />
                              ) : (
                                <FiUser aria-hidden="true" className="h-3.5 w-3.5" />
                              )}
                              {isBlockedGroup ? 'Grupal' : 'Particular'}
                            </span>
                          </span>
                        </div>
                      )}
                      <div className="flex min-w-0 items-center justify-end gap-1.5 sm:shrink-0 sm:gap-2">
                        {combinedSources && row.slot.agendaLabel && (
                          <span className="w-fit shrink-0 rounded-full border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">
                            {row.slot.agendaLabel}
                          </span>
                        )}
                        {!hideBookingActions && (
                          <button
                            type="button"
                            disabled
                            aria-label={`No se puede agregar ${participantSingular} a un horario bloqueado`}
                            title="Desbloquea el horario para agregar alumnos."
                            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-1 rounded-full bg-slate-200 px-3 text-xs font-bold text-slate-500 opacity-70 sm:flex-none"
                          >
                            <FiPlus aria-hidden="true" />{' '}
                            {capitalizeSchoolTerm(participantSingular)}
                          </button>
                        )}
                        {!readOnlyAgenda && (
                          <RowIconButton
                            ariaLabel="Configurar este horario"
                            onClick={() => openSlotEditor(row.slot, row.block)}
                            disabled={
                              busy ||
                              dayBookings.some(
                                (booking) =>
                                  (!combinedSources || booking.schoolId === row.slot.schoolId) &&
                                  booking.coachId === row.slot.coachId &&
                                  booking.startTime === row.slot.startTime
                              )
                            }
                          >
                            <FiSettings aria-hidden="true" />
                          </RowIconButton>
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
                <AgendaRow
                  key={`a-${row.slot.schoolId || 'personal'}-${row.slot.coachId}-${row.slot.id}`}
                  time={row.slot.startTime}
                  showTime={showTime}
                  showSeparator={showSeparator}
                >
                  <div
                    className={`flex min-w-0 flex-1 flex-col gap-2 rounded-[var(--r-md)] border px-2.5 py-1 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-3 ${availableStyle.border} ${availableStyle.bg}`}
                  >
                    {readOnlyAgenda || (adminMode && !manageSchoolSchedule) ? (
                      <span className="flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${availableStyle.dot}`}
                          aria-hidden="true"
                        />
                        Disponible
                        <span className="font-normal text-[var(--c-text-2)]">
                          ·{' '}
                          {row.slot.coachName ||
                            agenda.coachNames?.[row.slot.coachId] ||
                            coachFallback}
                        </span>
                      </span>
                    ) : (
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {showCoachName && (
                          <span className="text-xs font-bold">
                            {row.slot.coachName ||
                              agenda.coachNames?.[row.slot.coachId] ||
                              coachFallback}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--c-text-2)]">
                          <span className="inline-flex items-center gap-1">
                            <FiUnlock aria-hidden="true" className="h-3.5 w-3.5" /> Disponible
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            {isAvailableGroup ? (
                              <FiUsers aria-hidden="true" className="h-3.5 w-3.5" />
                            ) : (
                              <FiUser aria-hidden="true" className="h-3.5 w-3.5" />
                            )}
                            {isAvailableGroup ? 'Grupal' : 'Particular'}
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="flex min-w-0 items-center justify-end gap-1.5 sm:shrink-0 sm:gap-2">
                      {combinedSources && row.slot.agendaLabel && (
                        <span className="w-fit shrink-0 rounded-full border border-[var(--c-border)] bg-white/80 px-2.5 py-1 text-xs font-bold text-[var(--c-ocean)]">
                          {row.slot.agendaLabel}
                        </span>
                      )}
                      {!hideBookingActions && (
                        <button
                          type="button"
                          onClick={() =>
                            setAddStudentSlot({
                              coachId: row.slot.coachId,
                              schoolId: row.slot.schoolId,
                              date: row.slot.date,
                              startTime: row.slot.startTime,
                              endTime: row.slot.endTime,
                              locationName: row.slot.locationName,
                              groupType: row.slot.groupType,
                            })
                          }
                          disabled={busy}
                          className="inline-flex min-h-11 w-fit shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-[var(--c-aqua)] px-4 text-xs font-bold text-white transition-colors hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FiPlus aria-hidden="true" /> {capitalizeSchoolTerm(participantSingular)}
                        </button>
                      )}
                      {!readOnlyAgenda && (
                        <span
                          className="group relative"
                          title={
                            dayBookings.some(
                              (booking) =>
                                (!combinedSources || booking.schoolId === row.slot.schoolId) &&
                                booking.coachId === row.slot.coachId &&
                                booking.startTime === row.slot.startTime
                            )
                              ? 'No se puede eliminar porque hay una clase asignada.'
                              : undefined
                          }
                        >
                          <RowIconButton
                            ariaLabel="Configurar este horario"
                            onClick={() => openSlotEditor(row.slot)}
                            disabled={
                              busy ||
                              dayBookings.some(
                                (booking) =>
                                  (!combinedSources || booking.schoolId === row.slot.schoolId) &&
                                  booking.coachId === row.slot.coachId &&
                                  booking.startTime === row.slot.startTime
                              )
                            }
                          >
                            <FiSettings aria-hidden="true" />
                          </RowIconButton>
                        </span>
                      )}
                    </div>
                  </div>
                </AgendaRow>
              )
            })}
        </div>
      </section>

      <Sheet
        open={Boolean(schoolRequestDraft)}
        onClose={() => {
          if (!busy) setSchoolRequestDraft(null)
        }}
        label="Cambiar hora o entrenador"
        keyboardAware
      >
        {schoolRequestDraft && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--c-ocean)]">
                Ajustar y aprobar reserva
              </h2>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">
                Reserva de {schoolRequestDraft.booking.athleteName}. Al confirmar, quedará agendada.
              </p>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-[var(--c-ocean)]">
              Fecha
              <input
                type="date"
                value={schoolRequestDraft.date}
                onChange={(event) =>
                  setSchoolRequestDraft((current) =>
                    current ? { ...current, date: event.target.value } : current
                  )
                }
                className="min-h-11 rounded-xl border border-[var(--c-border)] bg-white px-3"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm font-semibold text-[var(--c-ocean)]">
                Desde
                <input
                  type="time"
                  value={schoolRequestDraft.startTime}
                  onChange={(event) =>
                    setSchoolRequestDraft((current) =>
                      current ? { ...current, startTime: event.target.value } : current
                    )
                  }
                  className="min-h-11 rounded-xl border border-[var(--c-border)] bg-white px-3"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-[var(--c-ocean)]">
                Hasta
                <input
                  type="time"
                  value={schoolRequestDraft.endTime}
                  onChange={(event) =>
                    setSchoolRequestDraft((current) =>
                      current ? { ...current, endTime: event.target.value } : current
                    )
                  }
                  className="min-h-11 rounded-xl border border-[var(--c-border)] bg-white px-3"
                />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-[var(--c-ocean)]">
              Entrenador
              <select
                value={schoolRequestDraft.coachId}
                onChange={(event) =>
                  setSchoolRequestDraft((current) =>
                    current ? { ...current, coachId: event.target.value } : current
                  )
                }
                className="min-h-11 rounded-xl border border-[var(--c-border)] bg-white px-3"
              >
                {schoolTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <footer className="flex justify-end gap-2 border-t border-[var(--c-border)] pt-3">
              <button
                type="button"
                onClick={() => setSchoolRequestDraft(null)}
                disabled={busy}
                className="min-h-10 rounded-full px-4 text-sm font-bold text-[var(--c-ocean)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={approveSchoolRequestWithChanges}
                disabled={
                  busy ||
                  !schoolRequestDraft.date ||
                  !schoolRequestDraft.startTime ||
                  schoolRequestDraft.endTime <= schoolRequestDraft.startTime ||
                  !schoolRequestDraft.coachId
                }
                className="min-h-10 rounded-full bg-[var(--c-ocean)] px-5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? 'Guardando…' : 'Aprobar con cambios'}
              </button>
            </footer>
          </div>
        )}
      </Sheet>

      <Sheet
        open={Boolean(bookingToEdit)}
        onClose={() => {
          if (!busy) setBookingToEdit(null)
        }}
        label="Editar clase"
        modalTopGap
      >
        {bookingToEdit && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--c-ocean)]">Editar clase</h2>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">
                {bookingToEdit.athleteName} · {bookingToEdit.date} · {bookingToEdit.startTime}–
                {bookingToEdit.endTime}
              </p>
            </div>
            <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] p-3">
              <SlotSegmentedControl
                label="Estado del horario"
                leftLabel="Disponible"
                rightLabel="Bloqueada"
                leftIcon={<FiUnlock />}
                rightIcon={<FiLock />}
                checked={Boolean(blockForBooking(bookingToEdit))}
                onChange={(blocked) => updateBookingAvailability(bookingToEdit, blocked)}
                disabled={busy}
              />
              <SlotSegmentedControl
                label="Tipo de clase"
                leftLabel="Particular"
                rightLabel="Grupal"
                leftIcon={<FiUser />}
                rightIcon={<FiUsers />}
                checked={bookingClassMembers.length > 1 || bookingToEdit.groupType === 'grupal'}
                onChange={(group) =>
                  updateClassSettings(
                    bookingClassMembers.length ? bookingClassMembers : [bookingToEdit],
                    { groupType: group ? 'grupal' : 'particular' }
                  )
                }
                disabled={busy || bookingClassMembers.length > 1}
              />
              {bookingClassMembers.length > 1 && (
                <p className="text-xs text-[var(--c-text-2)]">
                  Una clase con varios alumnos debe permanecer grupal.
                </p>
              )}
              {(bookingClassMembers.length > 1 || bookingToEdit.groupType === 'grupal') && (
                <SlotSegmentedControl
                  label="Cupo de la clase"
                  leftLabel="Acepta alumnos"
                  rightLabel="Cupo cerrado"
                  leftIcon={<FiUnlock />}
                  rightIcon={<FiLock />}
                  checked={bookingClassMembers.some((booking) => booking.classFull)}
                  onChange={(classFull) =>
                    updateClassSettings(
                      bookingClassMembers.length ? bookingClassMembers : [bookingToEdit],
                      { classFull }
                    )
                  }
                  disabled={busy}
                />
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setAddStudentSlot({
                    coachId: bookingToEdit.coachId,
                    schoolId: bookingToEdit.schoolId,
                    date: bookingToEdit.date,
                    startTime: bookingToEdit.startTime,
                    endTime: bookingToEdit.endTime,
                    locationName: bookingToEdit.locationName || 'Horario abierto',
                    groupType: bookingToEdit.groupType,
                  })
                  setBookingToEdit(null)
                }}
                disabled={busy || (bookingToEdit.groupType === 'grupal' && bookingToEdit.classFull)}
                className="min-h-11 rounded-full bg-[var(--c-aqua)] px-4 text-sm font-bold text-white hover:bg-[var(--c-aqua-strong)] disabled:opacity-50"
              >
                + {capitalizeSchoolTerm(participantSingular)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReassignBooking(bookingToEdit)
                  setBookingToEdit(null)
                }}
                disabled={busy}
                className="min-h-11 rounded-full border border-[var(--c-border)] px-4 text-sm font-bold text-[var(--c-ocean)] hover:bg-[var(--c-surface)] disabled:opacity-50"
              >
                Reasignar {participantSingular}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmAction({ kind: 'cancel-booking', booking: bookingToEdit })
                  setBookingToEdit(null)
                }}
                disabled={busy}
                className="min-h-11 rounded-full border border-[var(--rose-bd)] px-4 text-sm font-bold text-[var(--rose-tx)] hover:bg-[var(--rose-bg)] disabled:opacity-50 sm:col-span-2"
              >
                Cancelar clase
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet
        open={Boolean(schoolClassToEdit)}
        onClose={() => {
          if (!busy) setSchoolClassToEdit(null)
        }}
        label="Editar clase"
        modalTopGap
      >
        {schoolClassToEdit && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--c-ocean)]">Editar clase</h2>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">
                {schoolClassToEdit.athleteName} · {schoolClassToEdit.date} ·{' '}
                {schoolClassToEdit.startTime}–{schoolClassToEdit.endTime}
              </p>
            </div>
            <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] p-3">
              <SlotSegmentedControl
                label="Estado del horario"
                leftLabel="Disponible"
                rightLabel="Bloqueada"
                leftIcon={<FiUnlock />}
                rightIcon={<FiLock />}
                checked={Boolean(blockForBooking(schoolClassToEdit))}
                onChange={(blocked) => updateBookingAvailability(schoolClassToEdit, blocked)}
                disabled={busy}
              />
              <SlotSegmentedControl
                label="Tipo de clase"
                leftLabel="Particular"
                rightLabel="Grupal"
                leftIcon={<FiUser />}
                rightIcon={<FiUsers />}
                checked={schoolClassToEdit.groupType === 'grupal'}
                onChange={(group) =>
                  updateSchoolClassSettings(schoolClassToEdit, {
                    groupType: group ? 'grupal' : 'particular',
                  })
                }
                disabled={busy || (schoolClassToEdit.schoolClassStudentCount || 0) > 1}
              />
              {(schoolClassToEdit.schoolClassStudentCount || 0) > 1 && (
                <p className="text-xs text-[var(--c-text-2)]">
                  Una clase con varios alumnos debe permanecer grupal.
                </p>
              )}
              {schoolClassToEdit.groupType === 'grupal' && (
                <SlotSegmentedControl
                  label="Cupo de la clase"
                  leftLabel="Acepta alumnos"
                  rightLabel="Cupo cerrado"
                  leftIcon={<FiUnlock />}
                  rightIcon={<FiLock />}
                  checked={Boolean(schoolClassToEdit.classFull)}
                  onChange={(classFull) =>
                    updateSchoolClassSettings(schoolClassToEdit, { classFull })
                  }
                  disabled={busy}
                />
              )}
            </div>
            {schoolClassToEdit.groupType === 'grupal' &&
              (schoolClassToEdit.status === 'confirmed' ||
                schoolClassToEdit.status === 'pending') && (
                <button
                  type="button"
                  onClick={() => openSchoolClassAddStudent(schoolClassToEdit)}
                  disabled={busy || Boolean(schoolClassToEdit.classFull)}
                  title={
                    schoolClassToEdit.classFull ? 'Abre el cupo para agregar atletas.' : undefined
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--c-aqua)] px-5 text-sm font-bold text-white transition-colors hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiPlus aria-hidden="true" /> Agregar {capitalizeSchoolTerm(participantPlural)}
                </button>
              )}
            <button
              type="button"
              onClick={() => {
                setSchoolClassToReassign(schoolClassToEdit)
                setSchoolClassToEdit(null)
              }}
              disabled={busy}
              className="min-h-12 rounded-full bg-[var(--c-ocean)] px-5 text-sm font-bold text-white"
            >
              Cambiar clase
            </button>
            <button
              type="button"
              onClick={() =>
                updateSchoolClassStatus(
                  schoolClassToEdit,
                  schoolClassToEdit.status === 'pending' ? 'scheduled' : 'pending'
                )
              }
              disabled={busy}
              className="min-h-12 rounded-full border border-[var(--c-border)] px-5 text-sm font-bold text-[var(--c-ocean)] hover:bg-[var(--c-surface)] disabled:opacity-50"
            >
              {busy
                ? 'Guardando…'
                : schoolClassToEdit.status === 'pending'
                  ? 'Aprobar clase'
                  : 'Cambiar a pendiente'}
            </button>
            <button
              type="button"
              onClick={() => cancelSchoolClass(schoolClassToEdit)}
              disabled={busy}
              className="min-h-12 rounded-full border border-[var(--rose-bd)] px-5 text-sm font-bold text-[var(--rose-tx)]"
            >
              {busy ? 'Cancelando…' : 'Cancelar clase'}
            </button>
          </div>
        )}
      </Sheet>

      {studentAction && (
        <AgendaStudentActions
          key={`${studentAction.booking.id}:${studentAction.student.studentId}`}
          student={studentAction.student}
          busy={busy}
          error={studentActionError}
          onClose={() => setStudentAction(null)}
          onSave={(attended, note) => void saveStudentAction(attended, note)}
          onMove={() => {
            setStudentToReassign(studentAction)
            setStudentAction(null)
          }}
          onRemove={() => void removeStudentFromClass()}
          onProgress={
            !studentAction.booking.schoolClassId && !manageSchoolSchedule
              ? () => {
                  setProgressBooking(studentAction.booking)
                  setStudentAction(null)
                }
              : undefined
          }
          progressSaved={progressBookingIds.has(studentAction.booking.id)}
        />
      )}

      {reassignBooking && schoolIdForBooking(reassignBooking) && (
        <SchoolReassignStudent
          schoolId={schoolIdForBooking(reassignBooking) as string}
          booking={reassignBooking}
          onClose={() => setReassignBooking(null)}
          onSaved={() => {
            setReassignBooking(null)
            setNotice(`${capitalizeSchoolTerm(participantSingular)} reasignado.`)
            void loadAgenda(monthOfSelected)
          }}
        />
      )}
      {schoolClassToReassign && schoolIdForBooking(schoolClassToReassign) && (
        <SchoolReassignStudent
          schoolId={schoolIdForBooking(schoolClassToReassign) as string}
          booking={schoolClassToReassign}
          schoolClassId={schoolClassToReassign.schoolClassId}
          onClose={() => setSchoolClassToReassign(null)}
          onSaved={() => {
            setSchoolClassToReassign(null)
            setNotice('Se cambió la clase de sus alumnos.')
            void loadAgenda(monthOfSelected)
          }}
        />
      )}
      {studentToReassign && (
        <SchoolReassignStudent
          schoolId={schoolIdForBooking(studentToReassign.booking)}
          booking={studentToReassign.booking}
          schoolClassId={studentToReassign.booking.schoolClassId}
          studentId={studentToReassign.student.studentId}
          studentName={studentToReassign.student.studentName}
          onClose={() => setStudentToReassign(null)}
          onSaved={() => {
            setStudentToReassign(null)
            setNotice(`${capitalizeSchoolTerm(participantSingular)} cambiado de clase.`)
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
          schoolId={addStudentSlot.schoolId || schoolId}
          allowCreate={!addStudentSlot.schoolClassId}
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
                (!combinedSources || booking.schoolId === addStudentSlot.schoolId) &&
                (!addStudentSlot.coachId || booking.coachId === addStudentSlot.coachId) &&
                booking.startTime === addStudentSlot.startTime
            )
            .flatMap((booking) =>
              addStudentSlot.schoolClassId && booking.schoolClassId
                ? booking.schoolClassStudentIds || []
                : booking.athleteId
                  ? [booking.athleteId]
                  : []
            )}
          takenNames={activeBookings
            .filter(
              (booking) =>
                booking.date === addStudentSlot.date &&
                (!combinedSources || booking.schoolId === addStudentSlot.schoolId) &&
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
          onWeekChange={(weekStart) => setSelectedDate(dateKey(weekStart))}
          onClose={closeScheduleEditor}
          onSubmit={applyHours}
        />
      )}

      <Sheet
        open={Boolean(slotEditor)}
        onClose={() => setSlotEditor(null)}
        label="Configurar horario"
      >
        {slotEditor && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-bold text-[var(--c-ocean)]">Configurar horario</h3>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">
                {slotEditor.slot.agendaLabel ? `${slotEditor.slot.agendaLabel} · ` : ''}
                {slotEditor.slot.startTime}–{slotEditor.slot.endTime}
              </p>
            </div>
            <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--c-border)] p-3">
              <SlotSegmentedControl
                label="Estado del horario"
                leftLabel="Disponible"
                rightLabel="Bloqueada"
                leftIcon={<FiUnlock />}
                rightIcon={<FiLock />}
                checked={slotEditor.slot.status === 'blocked'}
                onChange={updateSlotAvailability}
                disabled={busy || (slotEditor.slot.status === 'blocked' && !slotEditor.block)}
              />
              <SlotSegmentedControl
                label="Tipo de clase"
                leftLabel="Particular"
                rightLabel="Grupal"
                leftIcon={<FiUser />}
                rightIcon={<FiUsers />}
                checked={slotEditor.slot.groupType === 'grupal'}
                onChange={updateSlotType}
                disabled={busy}
              />
            </div>
            <button
              type="button"
              onClick={requestSlotDeletion}
              disabled={busy}
              className="min-h-11 rounded-full border border-rose-200 px-4 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Eliminar horario
            </button>
          </div>
        )}
      </Sheet>

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

function AgendaRow({
  time,
  showTime = true,
  showSeparator = true,
  children,
}: {
  time: string
  showTime?: boolean
  showSeparator?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-5 sm:py-1.5 ${
        showSeparator ? 'sm:border-b sm:border-[var(--c-border)]' : ''
      }`}
    >
      <span className="w-fit text-sm font-extrabold text-[var(--c-ocean)] sm:w-12 sm:shrink-0 sm:text-sm sm:font-semibold sm:text-[var(--c-text-2)]">
        {showTime ? time : <span className="sr-only">{time}</span>}
      </span>
      <div className="flex min-w-0 w-full sm:w-auto sm:flex-1">{children}</div>
    </div>
  )
}

function SlotSegmentedControl({
  label,
  leftLabel,
  rightLabel,
  leftIcon,
  rightIcon,
  checked,
  onChange,
  disabled,
}: {
  label: string
  leftLabel: string
  rightLabel: string
  leftIcon: React.ReactNode
  rightIcon: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
}) {
  const options = [
    { value: false, label: leftLabel, icon: leftIcon },
    { value: true, label: rightLabel, icon: rightIcon },
  ]

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--c-text-2)]">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[var(--c-surface)] p-1.5">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={checked === option.value}
            onClick={() => {
              if (checked !== option.value) onChange(option.value)
            }}
            disabled={disabled}
            className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50 ${
              checked === option.value
                ? 'border-[var(--c-aqua-strong)] bg-white text-[var(--c-ocean)] shadow-[var(--shadow-sm)]'
                : 'border-transparent text-[var(--c-text-2)] hover:bg-white/70'
            }`}
          >
            <span aria-hidden="true" className="shrink-0 text-base">
              {option.icon}
            </span>
            <span className="min-w-0 truncate">{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
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
      className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border bg-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50 ${
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

function whatsappDayKey(date: Date) {
  return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()] || ''
}

function slotHasPassed(slot: Pick<CoachAvailableSlot, 'date' | 'startTime'>) {
  return new Date(`${slot.date}T${slot.startTime}:00`).getTime() <= Date.now()
}
