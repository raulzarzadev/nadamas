'use client'

import Loading from '@comps/Loading'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiLock,
  FiPlus,
  FiSettings,
  FiUnlock,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import ClassNotesModal, { type ClassNotesTarget } from '@/components/coach/ClassNotesModal'
import ScheduleViews from '@/components/schedule/ScheduleViews'
import SchoolReassignStudent from '@/components/school/SchoolReassignStudent'
import ClassCard from '@/components/ui/class-card'
import ClassStudentRow from '@/components/ui/class-student-row'
import CoachBadge from '@/components/ui/coach-badge'
import ScheduleTag from '@/components/ui/schedule-tag'
import Sheet from '@/components/ui/sheet'
import StatusBadge from '@/components/ui/status-badge'
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
import { capitalizeSchoolTerm, UNASSIGNED_SCHOOL_COACH_ID } from '@/lib/school'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import AgendaAddStudentModal, { type AddStudentPayload } from './AgendaAddStudentModal'
import AgendaStudentActions, { type AgendaStudentAction } from './AgendaStudentActions'
import AttendanceModal from './AttendanceModal'
import CancelClassModal from './CancelClassModal'
import { useCoachAgendaShare } from './CoachAgendaShareContext'
import ScheduleHoursEditor, {
  type HoursMode,
  type ScheduleCoachOption,
} from './ScheduleHoursEditor'
import ScheduleStudentsModal from './ScheduleStudentsModal'
import StudentProgressModal from './StudentProgressModal'
import StudentProfileModal from './StudentProfileModal'
import StudentLabels from './StudentLabels'

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
type ConfirmAction = { kind: 'delete-slot'; slot: CoachAvailableSlot }
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
  onScheduleEditorOpen,
  scheduleCoachOptions = [],
  onScheduleCoachChange,
  initialDate,
  focusClassId,
  focusTime,
  detailTarget,
  scheduleTarget,
  scheduleTargetOptions,
  onScheduleTargetChange,
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
  onScheduleEditorOpen?: () => void
  scheduleCoachOptions?: ScheduleCoachOption[]
  onScheduleCoachChange?: (coachId: string) => void
  /** Deep link target date (YYYY-MM-DD) selected on mount. */
  initialDate?: string
  /** Deep link target: series or occurrence id of the assigned class. */
  focusClassId?: string
  /** Deep link target hour (HH:MM) of the assigned class. */
  focusTime?: string
  /** Render a single class on the dedicated details page. */
  detailTarget?: { coachId: string; startTime: string; groupType: 'particular' | 'grupal' }
  /** Destination selector shown inside the hours editor (personal or school id). */
  scheduleTarget?: string
  scheduleTargetOptions?: Array<{ id: string; label: string }>
  onScheduleTargetChange?: (target: string) => void
}) {
  // When an admin opens another coach's agenda, `coachId` targets that coach and
  // booking actions (add/cancel students) are hidden — admin mode manages
  // blocks only and does not edit the coach's offering here.
  const [studentProfile, setStudentProfile] = useState<{
    studentId: string
    schoolId?: string
    name: string
  } | null>(null)
  const [labelRevision, setLabelRevision] = useState(0)
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

  const [fullAgenda, setAgenda] = useState<CoachAgendaPayload | undefined>(undefined)
  const localSchoolFilter = manageSchoolSchedule && aggregateSchool && !combinedSources
  const requestCoachId = localSchoolFilter ? undefined : coachId
  const requestCoachQuery = requestCoachId ? `&coachId=${encodeURIComponent(requestCoachId)}` : ''
  const requestContextQuery = `${requestCoachQuery}${schoolQuery}`
  const agenda = useMemo(() => {
    if (!fullAgenda || !localSchoolFilter || !coachId) return fullAgenda
    return {
      ...fullAgenda,
      availableSlots: fullAgenda.availableSlots.filter((slot) => slot.coachId === coachId),
      bookings: fullAgenda.bookings.filter((booking) => booking.coachId === coachId),
      blocks: fullAgenda.blocks.filter((block) => block.coachId === coachId),
    }
  }, [fullAgenda, localSchoolFilter, coachId])
  const [scheduleHoursByDate, setScheduleHoursByDate] = useState<Record<string, string[]>>({})
  const [loadedCoachId, setLoadedCoachId] = useState<string | undefined>(coachId)
  const [selectedDate, setSelectedDate] = useState(() =>
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : dateKey(new Date())
  )
  const focusRef = useRef<HTMLDivElement>(null)
  const focusAppliedKeyRef = useRef<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<Set<HourStatus>>(
    () => new Set(HOUR_STATUSES)
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addStudentSlot, setAddStudentSlot] = useState<ActiveSlot | null>(null)
  const [cancelClassTarget, setCancelClassTarget] = useState<Booking | null>(null)
  const [cancelClassError, setCancelClassError] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [showBatchRequests, setShowBatchRequests] = useState(false)
  const [batchRequestError, setBatchRequestError] = useState('')
  const [showBatchSummary, setShowBatchSummary] = useState(false)
  const [batchSlots, setBatchSlots] = useState<CoachAvailableSlot[]>([])
  const [batchAction, setBatchAction] = useState<'students' | 'coaches' | 'type' | 'status' | null>(
    null
  )
  const [batchValue, setBatchValue] = useState('')
  const [batchCoachIds, setBatchCoachIds] = useState<string[]>([])
  const [batchError, setBatchError] = useState('')
  const [batchStudents, setBatchStudents] = useState<Array<{ id: string; name: string }>>([])
  const [batchStudentIds, setBatchStudentIds] = useState<string[]>([])
  const batchSlotKey = (slot: CoachAvailableSlot) =>
    `${slot.schoolId || schoolId || ''}|${slot.coachId}|${slot.date}|${slot.startTime}|${slot.groupType}`
  const [horizontalClass, setHorizontalClass] = useState<CoachAvailableSlot | null>(null)
  const [slotEditor, setSlotEditor] = useState<SlotEditorState | null>(null)
  const [slotAssignmentCoachId, setSlotAssignmentCoachId] = useState('')
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
  const [attendanceTarget, setAttendanceTarget] = useState<{
    schoolId: string
    date: string
    occurrenceId?: string
    initialSlot?: { coachId: string; startTime: string }
  } | null>(null)
  const [classNotesTarget, setClassNotesTarget] = useState<ClassNotesTarget | null>(null)
  const [studentActionError, setStudentActionError] = useState<string | null>(null)
  const [studentToReassign, setStudentToReassign] = useState<{
    booking: Booking
    student: AgendaStudentAction
  } | null>(null)
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null)
  const [schoolRequestDraft, setSchoolRequestDraft] = useState<SchoolRequestDraft | null>(null)
  const [classEditorConfiguration, setClassEditorConfiguration] = useState(false)
  const [schoolClassToEdit, setSchoolClassToEdit] = useState<Booking | null>(null)
  const [schoolTeachers, setSchoolTeachers] = useState<Array<{ id: string; name: string }>>([])
  const [notice, setNotice] = useState<string | null>(null)
  const agendaRequestRef = useRef(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset cached hours when the viewed coach or school changes.
  useEffect(() => {
    setScheduleHoursByDate({})
  }, [requestCoachId, schoolId])

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
          setLoadedCoachId(requestCoachId)
          return
        }
        const endpoint =
          (aggregateSchool || manageSchoolSchedule) && schoolId
            ? `/api/schools/${encodeURIComponent(schoolId)}/agenda?month=${month}${requestCoachQuery}${readOnly ? '&view=public' : ''}`
            : `/api/coach/agenda?month=${month}${requestContextQuery}`
        const response = await getAuthed(endpoint)
        const nextAgenda = (await response.json()) as CoachAgendaPayload
        if (requestId !== agendaRequestRef.current) return
        setAgenda(nextAgenda)
        setScheduleHoursByDate((current) =>
          replaceMonthHours(current, month, nextAgenda.availableSlots)
        )
        setLoadedCoachId(requestCoachId)
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
      requestCoachQuery,
      requestContextQuery,
      schoolId,
      requestCoachId,
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
  const bookingMatchesFocus = useCallback(
    (booking: Booking) => {
      if (!focusClassId && !focusTime) return false
      if (
        focusClassId &&
        booking.schoolClassId !== focusClassId &&
        booking.offeringId !== `school-class:${focusClassId}` &&
        booking.scheduleId !== `school-class:${focusClassId}`
      )
        return false
      if (focusTime && booking.startTime !== focusTime) return false
      return true
    },
    [focusClassId, focusTime]
  )
  // Deep link from the "clase asignada" notification: jump to that date/hour,
  // scroll the row into view and focus it.
  useEffect(() => {
    const focusKey = `${selectedDate}|${focusClassId || ''}|${focusTime || ''}`
    if (focusAppliedKeyRef.current === focusKey || !agenda || (!focusClassId && !focusTime)) return
    if (!dayBookings.some(bookingMatchesFocus)) return
    focusAppliedKeyRef.current = focusKey
    const frame = requestAnimationFrame(() => {
      focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      focusRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [agenda, dayBookings, bookingMatchesFocus, selectedDate, focusClassId, focusTime])
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
      return true
    } catch (err) {
      reportInternalError('COACH_AGENDA_ACTION', err)
      setError(GENERIC_USER_ERROR)
      return false
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

  const openSchoolClassEditor = (booking: Booking, configure = false) => {
    setClassEditorConfiguration(configure)
    setSchoolClassToEdit(booking)
  }

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

  const openClassCancellation = (booking: Booking) => {
    setCancelClassError(null)
    setCancelClassTarget(booking)
    setBookingToEdit(null)
    setSchoolClassToEdit(null)
  }

  const cancellationBookings = (agenda?.bookings || []).filter(
    (booking) =>
      cancelClassTarget &&
      booking.status !== 'cancelled' &&
      booking.coachId === cancelClassTarget.coachId &&
      booking.schoolId === cancelClassTarget.schoolId &&
      booking.date === cancelClassTarget.date &&
      booking.startTime === cancelClassTarget.startTime &&
      booking.endTime === cancelClassTarget.endTime &&
      (!cancelClassTarget.schoolClassId ||
        booking.schoolClassId === cancelClassTarget.schoolClassId)
  )
  const cancellationParticipants = [
    ...new Map(
      cancellationBookings.flatMap((booking) =>
        booking.schoolClassStudents
          ? booking.schoolClassStudents.map(
              (student) => [student.id, { id: student.id, name: student.name }] as const
            )
          : [[booking.athleteId, { id: booking.athleteId, name: booking.athleteName }] as const]
      )
    ).values(),
  ]

  const submitClassCancellation = async (studentIds: string[]) => {
    if (!cancelClassTarget) return
    setBusy(true)
    setCancelClassError(null)
    try {
      const targetSchoolId = schoolIdForBooking(cancelClassTarget)
      let response: Response
      if (cancelClassTarget.schoolClassId && targetSchoolId) {
        response = await postAuthed(
          `/api/schools/${encodeURIComponent(targetSchoolId)}/classes/${encodeURIComponent(cancelClassTarget.schoolClassId)}/cancellations`,
          { studentIds }
        )
      } else {
        response = await deleteAuthed(
          `/api/coach/agenda/bookings?id=${encodeURIComponent(cancelClassTarget.id)}&participantIds=${encodeURIComponent(JSON.stringify(studentIds))}${schoolQueryFor(targetSchoolId)}${manageSchoolSchedule ? `&coachId=${encodeURIComponent(cancelClassTarget.coachId)}` : coachQuery}`
        )
      }
      const result = (await response.json()) as { cancelled: boolean }
      setCancelClassTarget(null)
      setNotice(
        result.cancelled
          ? 'Clase cancelada.'
          : 'Participantes retirados. La clase continúa con los demás.'
      )
      await loadAgenda(monthOfSelected)
    } catch (err) {
      reportInternalError('COACH_CLASS_CANCELLATION', err)
      setCancelClassError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const updateStudentApproval = async () => {
    if (!studentAction) return
    const { booking, student } = studentAction
    const targetSchoolId = schoolIdForBooking(booking)
    if (!targetSchoolId || !booking.schoolClassId || !manageSchoolSchedule) return
    const pending =
      booking.schoolClassStudents?.find((item) => item.id === student.studentId)?.pending ??
      booking.status === 'pending'
    setBusy(true)
    setStudentActionError(null)
    try {
      await patchAuthed(
        `/api/schools/${encodeURIComponent(targetSchoolId)}/classes/${encodeURIComponent(booking.schoolClassId)}/students/${encodeURIComponent(student.studentId)}`,
        { status: pending ? 'scheduled' : 'pending' }
      )
      setStudentAction(null)
      setNotice(pending ? 'Inscripción aprobada.' : 'Inscripción pendiente de aprobación.')
      await loadAgenda(monthOfSelected)
    } catch (err) {
      reportInternalError('COACH_STUDENT_APPROVAL', err)
      setStudentActionError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
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

  const openSlotEditor = (slot: CoachAvailableSlot, block?: CoachScheduleBlock) => {
    setSlotAssignmentCoachId('')
    setSlotEditor({ slot, block })
  }

  const assignSlotToCoach = () => {
    if (!slotEditor || !schoolId || !slotAssignmentCoachId) return
    const slot = slotEditor.slot
    void run(async () => {
      await postAuthed(`/api/schools/${encodeURIComponent(schoolId)}/agenda/assignments`, {
        coachId: slotAssignmentCoachId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        groupType: slot.groupType,
        offeringId: slot.offeringId,
        scheduleId: slot.scheduleId,
      })
      setSlotEditor(null)
    })
  }

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
      } else if (slot.coachId === UNASSIGNED_SCHOOL_COACH_ID) {
        const targetSchoolId = slot.schoolId || schoolId
        if (!targetSchoolId || payloads.some((payload) => !payload.athleteId))
          throw new Error('UNASSIGNED_SLOT_REQUIRES_SCHOOL_STUDENTS')
        for (const payload of payloads) {
          const response = await postAuthed(
            `/api/schools/${encodeURIComponent(targetSchoolId)}/students/${encodeURIComponent(payload.athleteId as string)}/classes`,
            {
              slots: [
                {
                  date: slot.date,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  coachId: UNASSIGNED_SCHOOL_COACH_ID,
                  groupType: slot.groupType,
                },
              ],
            }
          )
          const result = (await response.json()) as { ok?: boolean; assignedCount?: number }
          if (!result.ok || !result.assignedCount) throw new Error('STUDENT_SLOT_ASSIGNMENT_FAILED')
        }
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
  const saveOfferingList = (next: CoachClassOffering[]) =>
    postAuthed(manageSchoolSchedule ? scheduleEndpoint : '/api/coach/offerings', {
      ...(schoolId ? { schoolId } : {}),
      ...(adminMode && !manageSchoolSchedule ? { coachId } : {}),
      classOfferings: next,
    })

  const updateAvailableSlotGroupType = (slot: CoachAvailableSlot, checked: boolean) => {
    return run(async () => {
      let targetOfferings = offerings
      const targetSchoolId = schoolIdForSlot(slot)
      const schoolClasses = activeBookings.filter(
        (booking) =>
          booking.schoolClassId &&
          schoolIdForBooking(booking) === targetSchoolId &&
          booking.coachId === slot.coachId &&
          booking.date === slot.date &&
          booking.startTime === slot.startTime &&
          booking.groupType === slot.groupType
      )
      if (targetSchoolId && schoolClasses.length > 0) {
        for (const classId of new Set(schoolClasses.map((booking) => booking.schoolClassId))) {
          await patchAuthed(
            `/api/schools/${encodeURIComponent(targetSchoolId)}/classes/${encodeURIComponent(classId as string)}`,
            { type: checked ? 'group' : 'individual' }
          )
        }
        return
      }
      if (manageSchoolSchedule && targetSchoolId) {
        const response = await getAuthed(
          `/api/schools/${encodeURIComponent(targetSchoolId)}/agenda?month=${monthOfSelected}&coachId=${encodeURIComponent(slot.coachId)}`
        )
        targetOfferings = ((await response.json()) as CoachAgendaPayload).offerings || []
      } else if (combinedSources) {
        const response = await getAuthed(
          `/api/coach/agenda?month=${monthOfSelected}${schoolQueryFor(targetSchoolId)}`
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
      const latestEndpoint = schoolId
        ? `/api/schools/${encodeURIComponent(schoolId)}/agenda?month=${monthOfSelected}&coachId=${encodeURIComponent(coachId || selfUid)}`
        : `/api/coach/agenda?month=${monthOfSelected}${coachQuery}`
      const latestResponse = await getAuthed(latestEndpoint)
      const latestAgenda = (await latestResponse.json()) as CoachAgendaPayload
      const latestOfferings = latestAgenda.offerings || []
      const latestOffering = latestOfferings[0]
      if (mode === 'add') {
        const base = latestOffering ?? createOffering()
        // Quita bloqueos que tapan estas horas para que queden disponibles.
        await deleteBlocks(dates.flatMap((date) => times.map((time) => ({ date, time }))))
        const next = offeringWithHours(base, dates, times, base.durationMinutes ?? 60)
        await saveOfferingList(
          latestOffering
            ? latestOfferings.map((item) => (item.id === next.id ? next : item))
            : [...latestOfferings, next]
        )
        closeScheduleEditor()
        return
      }
      if (!latestOffering) {
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
      await saveOfferingList(offeringsWithoutHours(latestOfferings, pairs))
      closeScheduleEditor()
      if (skipped > 0) {
        setNotice(`No se quitaron ${skipped} hora(s) ocupada(s). Cancela la clase primero.`)
      }
    })
  }

  const confirmCopy = confirmAction
    ? {
        title: 'Eliminar horario',
        body: `Se eliminará el horario de las ${confirmAction.slot.startTime}. Ya no aparecerá como disponible para ${participantPlural}.`,
        action: 'Eliminar horario',
      }
    : null

  const horizontalSlots = new Map<string, CoachAvailableSlot>()
  for (const slot of agenda?.availableSlots || []) horizontalSlots.set(batchSlotKey(slot), slot)
  for (const booking of activeBookings) {
    const slot: CoachAvailableSlot = {
      id: booking.id,
      schoolId: booking.schoolId,
      coachId: booking.coachId,
      coachName: booking.coachName || undefined,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      groupType: booking.groupType,
      offeringId: booking.offeringId,
      scheduleId: booking.scheduleId,
      locationName: booking.locationName,
      status: 'booked',
    }
    const key = batchSlotKey(slot)
    if (!horizontalSlots.has(key)) horizontalSlots.set(key, slot)
  }

  function enrolledCountForSlot(slot: CoachAvailableSlot) {
    const students = new Set<string>()
    for (const booking of agenda?.bookings || []) {
      if (
        booking.status === 'cancelled' ||
        booking.status === 'pending' ||
        booking.schoolRequestId ||
        booking.date !== slot.date ||
        booking.startTime !== slot.startTime ||
        booking.coachId !== slot.coachId ||
        booking.groupType !== slot.groupType ||
        schoolIdForBooking(booking) !== schoolIdForSlot(slot)
      )
        continue
      if (booking.schoolClassStudents) {
        for (const student of booking.schoolClassStudents)
          if (!student.pending) students.add(student.id)
      } else if (booking.schoolClassStudentIds) {
        for (const id of booking.schoolClassStudentIds) students.add(id)
      } else {
        students.add(
          booking.additionalProfileId || booking.athleteProfileId || booking.athleteId || booking.id
        )
      }
    }
    return students.size
  }

  const batchBookings = (agenda?.bookings || []).filter((booking) =>
    batchSlots.some(
      (slot) =>
        slot.date === booking.date &&
        slot.startTime === booking.startTime &&
        slot.coachId === booking.coachId &&
        schoolIdForSlot(slot) === schoolIdForBooking(booking)
    )
  )
  const selectedStudentIds = new Set<string>()
  for (const booking of batchBookings) {
    if (booking.status === 'cancelled' || booking.status === 'pending' || booking.schoolRequestId)
      continue
    if (booking.schoolClassStudents) {
      for (const student of booking.schoolClassStudents)
        if (!student.pending) selectedStudentIds.add(student.id)
    } else if (booking.schoolClassStudentIds) {
      for (const id of booking.schoolClassStudentIds) selectedStudentIds.add(id)
    } else {
      selectedStudentIds.add(
        booking.additionalProfileId || booking.athleteProfileId || booking.athleteId || booking.id
      )
    }
  }
  const selectedCoachIds = new Set(
    batchSlots
      .flatMap((slot) => slot.assignedCoachIds || [slot.coachId])
      .filter((id) => id !== UNASSIGNED_SCHOOL_COACH_ID)
  )
  const selectedGroupCount = batchSlots.filter((slot) => slot.groupType === 'grupal').length
  const selectedIndividualCount = batchSlots.length - selectedGroupCount
  const selectedAvailableCount = batchSlots.filter((slot) => slot.status === 'available').length
  const selectedBookedCount = batchSlots.filter((slot) => slot.status === 'booked').length
  const selectedBlockedCount = batchSlots.filter((slot) => slot.status === 'blocked').length
  const batchRequests = batchBookings.filter(
    (booking) => booking.schoolRequestId && booking.status === 'pending'
  )
  async function resolveBatchRequest(booking: Booking, status: 'approved' | 'rejected') {
    const targetSchoolId = schoolIdForBooking(booking)
    if (busy || !targetSchoolId || !booking.schoolRequestId) return
    setBatchRequestError('')
    const success = await run(() =>
      patchAuthed(
        `/api/schools/${encodeURIComponent(targetSchoolId)}/class-requests/${encodeURIComponent(booking.schoolRequestId as string)}`,
        { status }
      )
    )
    if (success) setNotice(status === 'approved' ? 'Solicitud aceptada.' : 'Solicitud rechazada.')
    else setBatchRequestError(GENERIC_USER_ERROR)
  }

  async function openBatchAction(action: 'students' | 'coaches' | 'type' | 'status') {
    setBatchError('')
    const values = new Set(
      batchSlots.map((slot) =>
        action === 'type'
          ? slot.groupType
          : action === 'status'
            ? slot.status === 'blocked'
              ? 'blocked'
              : 'available'
            : ''
      )
    )
    setBatchValue(values.size === 1 ? [...values][0] : '')
    setBatchStudentIds([])
    const assigned = [
      ...new Set(batchSlots.flatMap((slot) => slot.assignedCoachIds || [slot.coachId])),
    ]
    setBatchCoachIds(
      assigned.some((id) => id !== UNASSIGNED_SCHOOL_COACH_ID)
        ? assigned.filter((id) => id !== UNASSIGNED_SCHOOL_COACH_ID)
        : [UNASSIGNED_SCHOOL_COACH_ID]
    )
    setBatchAction(action)
    if (action === 'students' && schoolId) {
      setBatchRequestError('')
      await loadAgenda(monthOfSelected)
      try {
        const response = await getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/students`)
        const payload = await response.json()
        setBatchStudents(payload.students || [])
      } catch {
        setBatchError('No pudimos cargar los alumnos.')
      }
    }
  }
  async function applyBatch(studentPayloads?: AddStudentPayload[]) {
    if (busy || !schoolId || !batchAction) return
    if (batchAction === 'coaches') {
      if (!batchCoachIds.length) return
      setBusy(true)
      setBatchError('')
      try {
        await postAuthed(`/api/schools/${encodeURIComponent(schoolId)}/agenda/teachers`, {
          coachIds: batchCoachIds,
          slots: batchSlots.map(({ coachId, date, startTime, endTime, groupType, offeringId }) => ({
            coachId,
            date,
            startTime,
            endTime,
            groupType,
            offeringId,
          })),
        })
        setBatchAction(null)
        setBatchSlots([])
        setNotice('Profes actualizados en los horarios seleccionados.')
        await loadAgenda(monthOfSelected)
      } catch {
        setBatchError('No pudimos cambiar los profes. Actualiza la agenda y vuelve a intentarlo.')
      } finally {
        setBusy(false)
      }
      return
    }
    if (batchAction === 'type') {
      for (const slot of batchSlots) {
        if (!(await updateAvailableSlotGroupType(slot, batchValue === 'grupal'))) {
          setBatchError('No pudimos actualizar todos los horarios. Revisa la agenda.')
          return
        }
      }
      setBatchAction(null)
      setBatchSlots([])
      return
    }
    setBusy(true)
    setBatchError('')
    const selectedStudentIds = [...batchStudentIds]
    if (batchAction === 'students' && studentPayloads) {
      try {
        for (const payload of studentPayloads) {
          if (payload.athleteId && !/^manual[:_]/.test(payload.athleteId))
            selectedStudentIds.push(payload.athleteId)
          else {
            const response = await postAuthed(
              `/api/schools/${encodeURIComponent(schoolId)}/students/quick`,
              { name: payload.athleteName }
            )
            const { student } = await response.json()
            selectedStudentIds.push(student.id)
          }
        }
      } catch {
        setBatchError('No pudimos crear todos los alumnos. Revisa la lista antes de reintentar.')
        setBusy(false)
        return
      }
    }
    const failed: CoachAvailableSlot[] = []
    for (const slot of batchSlots) {
      try {
        if (batchAction === 'students') {
          const existingClass = batchBookings.find(
            (booking) =>
              booking.schoolClassId &&
              booking.coachId === slot.coachId &&
              booking.date === slot.date &&
              booking.startTime === slot.startTime &&
              booking.groupType === slot.groupType
          )
          if (existingClass?.schoolClassId) {
            await postAuthed(
              `/api/schools/${encodeURIComponent(schoolId)}/classes/${encodeURIComponent(existingClass.schoolClassId)}/students`,
              {
                studentIds: selectedStudentIds,
                ...(slot.groupType === 'particular' ? { promoteToGroup: true } : {}),
              }
            )
            continue
          }
          for (const studentId of selectedStudentIds) {
            const response = await postAuthed(
              `/api/schools/${encodeURIComponent(schoolId)}/students/${encodeURIComponent(studentId)}/classes`,
              {
                slots: [
                  {
                    date: slot.date,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    coachId: slot.coachId,
                    groupType: slot.groupType,
                    ...(existingClass?.schoolClassId && slot.groupType === 'grupal'
                      ? { schoolClassId: existingClass.schoolClassId }
                      : {}),
                  },
                ],
              }
            )
            const result = (await response.json()) as {
              ok?: boolean
              assignedCount?: number
              failedKeys?: string[]
            }
            if (!result.ok || !result.assignedCount || result.failedKeys?.length)
              throw new Error('STUDENT_SLOT_ASSIGNMENT_FAILED')
          }
        } else if (batchValue === 'blocked') {
          await postAuthed(scheduleEndpointFor(slot.coachId), {
            date: slot.date,
            allDay: false,
            startTime: slot.startTime,
            endTime: slot.endTime,
            hidden: false,
            schoolId,
          })
        } else {
          const blocks = (agenda?.blocks || []).filter(
            (block) =>
              block.coachId === slot.coachId &&
              block.date === slot.date &&
              block.startTime === slot.startTime &&
              !block.allDay
          )
          for (const block of blocks)
            await deleteAuthed(
              `${scheduleEndpointFor(slot.coachId)}?id=${encodeURIComponent(block.id)}&schoolId=${encodeURIComponent(schoolId)}`
            )
        }
      } catch {
        failed.push(slot)
      }
    }
    setBatchSlots(failed)
    await loadAgenda(monthOfSelected)
    if (failed.length)
      setBatchError(
        batchAction === 'students'
          ? 'No pudimos agregar alumnos a algunos horarios. Revisa si la clase está ocupada o completa. Los horarios pendientes siguen seleccionados.'
          : 'Algunos horarios no se actualizaron. Quedaron seleccionados para revisarlos.'
      )
    else {
      setBatchAction(null)
      setNotice(
        batchAction === 'students'
          ? 'Alumnos agregados a los horarios seleccionados.'
          : 'Horarios actualizados.'
      )
    }
    setBusy(false)
  }

  const runConfirmedAction = () => {
    if (!confirmAction) return
    const action = confirmAction
    setConfirmAction(null)
    eliminarSlot(action.slot)
  }

  if (agenda === undefined) return <Loading />

  const renderDayCard = (
    displayRows: typeof rows,
    showAssignedCoach = showCoachName,
    classDetails = false
  ) => (
    <section
      className={
        classDetails
          ? '@container bg-white'
          : '@container rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)]'
      }
    >
      {error && <p className="px-4 pb-2 text-sm text-[var(--c-error,#b91c1c)] sm:px-5">{error}</p>}
      {notice && <p className="px-4 pb-2 text-sm font-semibold text-amber-600 sm:px-5">{notice}</p>}

      <div className={classDetails ? undefined : 'border-t border-[var(--c-border)]'}>
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

        {!allDayBlock && displayRows.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[var(--c-text-2)] sm:px-5">
            {selectedDate < dateKey(new Date())
              ? 'No hay clases registradas para este día.'
              : schoolId
                ? 'No hay horarios asignados para este día.'
                : 'No hay horarios este día.'}
          </p>
        )}

        {!allDayBlock &&
          displayRows.map((row, rowIndex) => {
            const showTime =
              !detailTarget && (rowIndex === 0 || displayRows[rowIndex - 1]?.sort !== row.sort)
            const showSeparator = displayRows[rowIndex + 1]?.sort !== row.sort
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
              const classBlocked = row.bookings.some((booking) => Boolean(blockForBooking(booking)))
              const canAddToGroup =
                isGroupClass &&
                !hideBookingActions &&
                classAcceptsStudents &&
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
              const isFocusTarget = row.bookings.some(bookingMatchesFocus)
              return (
                <ClassCard
                  hideTimeColumn={Boolean(detailTarget)}
                  key={`b-${firstBooking.schoolId || 'personal'}-${firstBooking.coachId}-${firstBooking.date}-${firstBooking.startTime}`}
                  time={row.sort}
                  showTime={showTime}
                  showSeparator={!classDetails && showSeparator}
                  status={classBlocked ? 'blocked' : isGroupClass ? 'group' : 'booked'}
                  coachName={
                    firstBooking.coachId === UNASSIGNED_SCHOOL_COACH_ID
                      ? 'Sin profe aún'
                      : agenda.coachNames?.[firstBooking.coachId] ||
                        firstBooking.coachName ||
                        coachFallback
                  }
                  unassigned={firstBooking.coachId === UNASSIGNED_SCHOOL_COACH_ID}
                  showCoachName={showAssignedCoach}
                  groupType={isGroupClass ? 'grupal' : 'particular'}
                  statusLabel={classBlocked ? 'Bloqueado' : undefined}
                  agendaLabel={combinedSources ? firstBooking.agendaLabel : undefined}
                  pending={row.bookings.some((booking) => booking.schoolRequestId)}
                  addStudent={
                    canAddToGroup && addStudentBooking
                      ? {
                          label: capitalizeSchoolTerm(participantSingular),
                          ariaLabel: `Agregar ${participantSingular} a la clase grupal`,
                          title: classBlocked
                            ? 'Desbloquea el horario para agregar alumnos.'
                            : groupIsFull
                              ? 'Abre el cupo para agregar alumnos.'
                              : undefined,
                          disabled:
                            busy ||
                            classBlocked ||
                            groupIsFull ||
                            Boolean(schoolClassBooking && classStudentCount >= 100),
                          onClick: () => openGroupClassAddStudent(addStudentBooking),
                        }
                      : undefined
                  }
                  actions={
                    <>
                      {!hideBookingActions && (hasSchoolClass || !hasPendingRequest) && (
                        <RowIconButton
                          ariaLabel="Configurar clase"
                          onClick={() =>
                            schoolClassBooking
                              ? openSchoolClassEditor(schoolClassBooking, true)
                              : setBookingToEdit(firstBooking)
                          }
                          disabled={busy}
                        >
                          <FiSettings aria-hidden="true" />
                        </RowIconButton>
                      )}
                      {!readOnlyAgenda &&
                        schoolClassBooking?.schoolClassId &&
                        schoolIdForSlot(schoolClassBooking) && (
                          <RowIconButton
                            ariaLabel="Pase de lista"
                            disabled={busy}
                            onClick={() =>
                              setAttendanceTarget({
                                schoolId: schoolIdForSlot(schoolClassBooking) as string,
                                date: schoolClassBooking.date,
                                occurrenceId: schoolClassBooking.schoolClassId,
                              })
                            }
                          >
                            <FiCheckSquare aria-hidden="true" />
                          </RowIconButton>
                        )}
                      {!readOnlyAgenda && schoolIdForSlot(schoolClassBooking || firstBooking) && (
                        <RowIconButton
                          ariaLabel="Notas de la clase"
                          disabled={busy}
                          onClick={() =>
                            setClassNotesTarget({
                              ...(schoolClassBooking || firstBooking),
                              schoolId: schoolIdForSlot(
                                schoolClassBooking || firstBooking
                              ) as string,
                            })
                          }
                        >
                          <FiClipboard aria-hidden="true" />
                        </RowIconButton>
                      )}
                    </>
                  }
                  ref={isFocusTarget ? focusRef : undefined}
                  focused={isFocusTarget}
                >
                  <ul className="flex w-full flex-col gap-2">
                    {row.bookings
                      .flatMap((booking) => {
                        const classStudents = booking.schoolClassStudents
                        if (booking.schoolClassId && !classStudents?.length) return []
                        if (classStudents?.length)
                          return classStudents.map((student) => ({
                            booking,
                            rowKey: `${booking.id}:${student.id}`,
                            studentName: student.name,
                            studentId: student.id,
                            attended: student.attended === true,
                            note: student.note || '',
                            pending: student.pending,
                          }))
                        return [
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
                      })
                      .map(
                        ({ booking, rowKey, studentName, studentId, attended, note, pending }) => (
                          <li
                            key={rowKey}
                            className="flex items-center justify-between gap-2 rounded-[var(--r-sm)] bg-white/55 px-2.5 py-1.5"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <div className="relative size-9 shrink-0">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--c-border)] bg-white text-xs font-bold text-[var(--c-ocean)] shadow-[0_1px_0_rgba(10,37,64,0.04)]">
                                  {initials(studentName)}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                {booking.schoolClassTitle && (
                                  <span className="block text-xs font-semibold text-[var(--c-text-2)]">
                                    {booking.schoolClassTitle}
                                  </span>
                                )}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="block break-words text-base font-extrabold leading-tight text-[var(--c-ocean)]">
                                    {studentName}
                                  </span>
                                  {!hideBookingActions && (
                                    <StudentLabels
                                      key={`${studentId}:${labelRevision}`}
                                      studentId={studentId}
                                      schoolId={schoolIdForBooking(booking) || undefined}
                                      compact
                                      readOnly
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="ml-auto flex shrink-0 flex-col items-end gap-1 self-start">
                              {pending && <StatusBadge status="pending" />}
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
                                  className="relative inline-flex size-8 items-center justify-center rounded-full border border-[var(--c-border)] bg-white text-[var(--c-ocean)] before:absolute before:-inset-1.5 hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:opacity-50"
                                >
                                  <FiClipboard aria-hidden="true" size={14} />
                                </button>
                              )}
                            </div>
                            {booking.schoolRequestId &&
                              manageSchoolSchedule &&
                              !hideBookingActions && (
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
                </ClassCard>
              )
            }
            if (row.kind === 'blocked') {
              const isBlockedGroup = row.slot.groupType === 'grupal'
              const blockedCoachName =
                row.slot.coachId === UNASSIGNED_SCHOOL_COACH_ID
                  ? 'Sin profe aún'
                  : agenda.coachNames?.[row.slot.coachId] || row.slot.coachName || coachFallback
              return (
                <ClassCard
                  hideTimeColumn={Boolean(detailTarget)}
                  key={`x-${row.slot.schoolId || 'personal'}-${row.slot.coachId}-${row.slot.id}`}
                  time={row.slot.startTime}
                  showTime={showTime}
                  showSeparator={!classDetails && showSeparator}
                  status="blocked"
                  coachName={blockedCoachName}
                  showCoachName={
                    showAssignedCoach && !readOnlyAgenda && !(adminMode && !manageSchoolSchedule)
                  }
                  unassigned={row.slot.coachId === UNASSIGNED_SCHOOL_COACH_ID}
                  groupType={isBlockedGroup ? 'grupal' : 'particular'}
                  statusLabel="Bloqueado"
                  agendaLabel={combinedSources ? row.slot.agendaLabel : undefined}
                  addStudent={
                    !hideBookingActions
                      ? {
                          label: capitalizeSchoolTerm(participantSingular),
                          ariaLabel: `No se puede agregar ${participantSingular} a un horario bloqueado`,
                          title: 'Desbloquea el horario para agregar alumnos.',
                          disabled: true,
                        }
                      : undefined
                  }
                  actions={
                    <>
                      {!readOnlyAgenda && (
                        <RowIconButton
                          ariaLabel="Configurar clase"
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
                      {!readOnlyAgenda && schoolIdForSlot(row.slot) && (
                        <RowIconButton
                          ariaLabel="Notas de la clase"
                          disabled={busy}
                          onClick={() =>
                            setClassNotesTarget({
                              ...row.slot,
                              schoolId: schoolIdForSlot(row.slot) as string,
                            })
                          }
                        >
                          <FiClipboard aria-hidden="true" />
                        </RowIconButton>
                      )}
                    </>
                  }
                />
              )
            }
            const isAvailableGroup = row.slot.groupType === 'grupal'
            return (
              <ClassCard
                hideTimeColumn={Boolean(detailTarget)}
                key={`a-${row.slot.schoolId || 'personal'}-${row.slot.coachId}-${row.slot.id}`}
                time={row.slot.startTime}
                showTime={showTime}
                showSeparator={!classDetails && showSeparator}
                status={isAvailableGroup ? 'groupAvailable' : 'available'}
                coachName={
                  row.slot.coachName || agenda.coachNames?.[row.slot.coachId] || coachFallback
                }
                showCoachName={showAssignedCoach}
                unassigned={row.slot.coachId === UNASSIGNED_SCHOOL_COACH_ID}
                groupType={row.slot.groupType}
                statusLabel="Disponible"
                agendaLabel={combinedSources ? row.slot.agendaLabel : undefined}
                addStudent={
                  !hideBookingActions
                    ? {
                        label: capitalizeSchoolTerm(participantSingular),
                        ariaLabel: `Agregar ${participantSingular} a la clase`,
                        disabled: busy,
                        onClick: () =>
                          setAddStudentSlot({
                            coachId: row.slot.coachId,
                            schoolId: row.slot.schoolId,
                            date: row.slot.date,
                            startTime: row.slot.startTime,
                            endTime: row.slot.endTime,
                            locationName: row.slot.locationName,
                            groupType: row.slot.groupType,
                          }),
                      }
                    : undefined
                }
                actions={
                  !readOnlyAgenda ? (
                    <>
                      <RowIconButton
                        ariaLabel="Configurar clase"
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
                      {schoolIdForSlot(row.slot) && (
                        <RowIconButton
                          ariaLabel="Pase de lista"
                          disabled={busy}
                          onClick={() =>
                            setAttendanceTarget({
                              schoolId: schoolIdForSlot(row.slot) as string,
                              date: row.slot.date,
                              initialSlot: {
                                coachId: row.slot.coachId,
                                startTime: row.slot.startTime,
                              },
                            })
                          }
                        >
                          <FiCheckSquare aria-hidden="true" />
                        </RowIconButton>
                      )}
                      {schoolIdForSlot(row.slot) && (
                        <RowIconButton
                          ariaLabel="Notas de la clase"
                          disabled={busy}
                          onClick={() =>
                            setClassNotesTarget({
                              ...row.slot,
                              schoolId: schoolIdForSlot(row.slot) as string,
                            })
                          }
                        >
                          <FiClipboard aria-hidden="true" />
                        </RowIconButton>
                      )}
                    </>
                  ) : undefined
                }
              />
            )
          })}
      </div>
    </section>
  )

  const dayCard = renderDayCard(rows)
  const selectedClassRows = horizontalClass
    ? rows.flatMap<(typeof rows)[number]>((row) => {
        const matches = (item: {
          coachId: string
          startTime: string
          groupType: string
          schoolId?: string
        }) =>
          item.coachId === horizontalClass.coachId &&
          item.startTime === horizontalClass.startTime &&
          item.groupType === horizontalClass.groupType &&
          schoolIdForBooking(item) === schoolIdForSlot(horizontalClass)
        if (row.kind === 'booked') {
          const bookings = row.bookings.filter(matches)
          return bookings.length ? [{ ...row, bookings }] : []
        }
        return matches(row.slot) ? [row] : []
      })
    : []

  const detailRows = detailTarget
    ? rows.flatMap<(typeof rows)[number]>((row) => {
        const matches = (item: { coachId: string; startTime: string; groupType: string }) =>
          item.coachId === detailTarget.coachId &&
          item.startTime === detailTarget.startTime &&
          item.groupType === detailTarget.groupType
        if (row.kind === 'booked') {
          const bookings = row.bookings.filter(matches)
          return bookings.length ? [{ ...row, bookings }] : []
        }
        return matches(row.slot) ? [row] : []
      })
    : []

  return (
    <div className="flex flex-col gap-4">
      {detailTarget ? (
        !agenda ? (
          <Loading />
        ) : detailRows.length ? (
          renderDayCard(detailRows, true, true)
        ) : (
          <p className="p-4 text-sm text-(--c-text-2)">
            {error ||
              'Este horario ya no está disponible. Vuelve a la agenda para revisar los cambios.'}
          </p>
        )
      ) : (
        <ScheduleViews
          title={
            <>
              {' '}
              {!readOnlyAgenda &&
                (onScheduleEditorOpen || schoolId || agendaUpdateSchoolIds.length > 0) && (
                  <div className="contents">
                    {(schoolId
                      ? [{ schoolId, label: 'Pase de lista' }]
                      : (agendaSources || []).flatMap((source) =>
                          source.schoolId
                            ? [
                                {
                                  schoolId: source.schoolId,
                                  label: `Pase de lista · ${source.label}`,
                                },
                              ]
                            : []
                        )
                    ).map((source) => (
                      <button
                        type="button"
                        key={source.schoolId}
                        className="btn btn-outline h-8 min-h-8 gap-1 border px-2 text-xs"
                        onClick={() =>
                          setAttendanceTarget({ schoolId: source.schoolId, date: selectedDate })
                        }
                      >
                        <FiCheckSquare aria-hidden="true" /> {source.label}
                      </button>
                    ))}
                    {onScheduleEditorOpen && (
                      <button
                        type="button"
                        onClick={onScheduleEditorOpen}
                        className="btn btn-outline h-8 min-h-8 gap-1 border px-2 text-xs"
                      >
                        <FiCalendar aria-hidden="true" /> Editar horario
                      </button>
                    )}
                  </div>
                )}{' '}
            </>
          }
          selectedDate={selectedDate}
          days={weekDates}
          today={dateKey(new Date())}
          dayStatuses={dayStatuses}
          selectedStatuses={selectedStatuses}
          onToggleStatus={toggleStatus}
          onSelectDate={setSelectedDate}
          onChangeWeek={changeWeek}
          monthCount={`${monthStats.booked}/${monthStats.total}`}
          weekCount={`${weekStats.booked}/${weekStats.total}`}
          slots={[...horizontalSlots.values()].map((slot) => ({
            key: batchSlotKey(slot),
            blocked: slot.status === 'blocked',
            enrolledCount: enrolledCountForSlot(slot),
            pendingApproval: activeBookings.some(
              (booking) =>
                booking.status === 'pending' &&
                schoolIdForBooking(booking) === schoolIdForSlot(slot) &&
                booking.coachId === slot.coachId &&
                booking.date === slot.date &&
                booking.startTime === slot.startTime &&
                booking.groupType === slot.groupType
            ),
            date: slot.date,
            startTime: slot.startTime,
            groupType: slot.groupType,
            selected: batchSlots.some((item) => batchSlotKey(item) === batchSlotKey(slot)),
            coachName: slot.coachName || agenda?.coachNames?.[slot.coachId] || 'Sin profe aún',
            unassigned: slot.coachId === '__unassigned__',
            label: `${slot.date} · ${slot.startTime}–${slot.endTime} · ${slot.coachName || agenda?.coachNames?.[slot.coachId] || 'Sin profe aún'} · ${slot.groupType}${slot.status === 'blocked' ? ' · Bloqueado' : ''}`,
          }))}
          onSelectSlot={(key) => {
            const slot = horizontalSlots.get(key)
            if (slot && !manageSchoolSchedule) {
              setNotice(null)
              setSelectedDate(slot.date)
              setHorizontalClass(slot)
              return
            }
            if (slot)
              setBatchSlots((current) =>
                current.some((item) => batchSlotKey(item) === key)
                  ? current.filter((item) => batchSlotKey(item) !== key)
                  : [...current, slot]
              )
          }}
        >
          {dayCard}
        </ScheduleViews>
      )}
      {batchSlots.length > 0 && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-(--c-border) bg-white p-3 shadow-lg">
          <button
            type="button"
            onClick={() => setShowBatchSummary(true)}
            aria-haspopup="dialog"
            className="mr-auto min-h-11 text-left text-sm font-bold underline-offset-4 hover:underline"
          >
            {batchSlots.length}{' '}
            {batchSlots.length === 1 ? 'horario seleccionado' : 'horarios seleccionados'}
          </button>
          <p className="basis-full text-xs text-(--c-text-2)" aria-live="polite">
            {selectedIndividualCount}{' '}
            {selectedIndividualCount === 1 ? 'particular' : 'particulares'} · {selectedGroupCount}{' '}
            {selectedGroupCount === 1 ? 'grupal' : 'grupales'}
          </p>
          <p className="basis-full text-xs text-(--c-text-2)" aria-live="polite">
            {selectedAvailableCount} disponibles · {selectedBookedCount} ocupados ·{' '}
            {selectedBlockedCount} bloqueados
          </p>
          {batchRequests.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setBatchRequestError('')
                setShowBatchRequests(true)
              }}
              className="btn btn-outline min-h-11"
            >
              Solicitudes ({batchRequests.length})
            </button>
          )}
          {schoolId && (
            <Link
              href={`/school/classes/details?schoolId=${encodeURIComponent(schoolId)}&slots=${encodeURIComponent(JSON.stringify(batchSlots.map(({ coachId, date, startTime, groupType }) => ({ coachId, date, startTime, groupType }))))}`}
              className="btn btn-outline min-h-11"
            >
              Ver
            </Link>
          )}
          {(['students', 'coaches', 'type', 'status'] as const).map((action) => (
            <button
              key={action}
              type="button"
              disabled={busy}
              onClick={() => void openBatchAction(action)}
              className="btn btn-outline min-h-11"
            >
              {
                {
                  students: `Alumnos (${selectedStudentIds.size})`,
                  coaches: `Profes (${selectedCoachIds.size})`,
                  type: 'Tipo',
                  status: 'Estado',
                }[action]
              }
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            className="btn btn-ghost"
            onClick={() => setBatchSlots([])}
          >
            Limpiar
          </button>
        </div>
      )}
      <Sheet
        open={showBatchSummary && batchSlots.length > 0}
        onClose={() => setShowBatchSummary(false)}
        label="Horarios seleccionados"
      >
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">Horarios seleccionados ({batchSlots.length})</h2>
          <ul className="flex flex-col gap-2" aria-label="Resumen de horarios seleccionados">
            {[...batchSlots]
              .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
              .map((slot) => (
                <li key={batchSlotKey(slot)}>
                  <ScheduleTag
                    date={new Date(`${slot.date}T12:00:00`).toLocaleDateString('es-MX', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    time={slot.startTime}
                    coachName={
                      slot.coachName ||
                      agenda?.coachNames?.[slot.coachId] ||
                      (slot.coachId === UNASSIGNED_SCHOOL_COACH_ID ? 'Sin profe aún' : undefined)
                    }
                    unassigned={slot.coachId === UNASSIGNED_SCHOOL_COACH_ID}
                    groupType={slot.groupType}
                    enrolledCount={enrolledCountForSlot(slot)}
                    action={
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Quitar de la selección ${slot.date} a las ${slot.startTime}, ${slot.coachName || 'Sin profe aún'}`}
                        onClick={() => {
                          const remaining = batchSlots.filter(
                            (item) => batchSlotKey(item) !== batchSlotKey(slot)
                          )
                          setBatchSlots(remaining)
                          if (!remaining.length) setShowBatchSummary(false)
                        }}
                        className="relative ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-full text-(--c-text-2) before:absolute before:-inset-2 hover:bg-white hover:text-(--c-ocean) disabled:opacity-50"
                      >
                        <FiX aria-hidden="true" size={18} />
                      </button>
                    }
                  />
                </li>
              ))}
          </ul>
        </div>
      </Sheet>
      <Sheet
        open={showBatchRequests}
        onClose={() => setShowBatchRequests(false)}
        closeDisabled={busy}
        label="Solicitudes de los horarios seleccionados"
      >
        <div className="flex flex-col gap-3 px-4 sm:px-0">
          <h2 className="text-lg font-bold">Solicitudes ({batchRequests.length})</h2>
          {batchRequestError && (
            <p role="alert" className="text-sm text-rose-600">
              {batchRequestError}
            </p>
          )}
          {!batchRequests.length && (
            <p role="status" className="text-sm text-(--c-text-2)">
              No hay solicitudes pendientes para los horarios seleccionados.
            </p>
          )}
          {batchRequests.map((booking) => (
            <ClassCard
              key={booking.schoolRequestId}
              time={booking.startTime}
              date={new Date(`${booking.date}T12:00:00`).toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
              coachName={booking.coachName || 'Sin profe aún'}
              showCoachName
              unassigned={booking.coachId === UNASSIGNED_SCHOOL_COACH_ID}
              groupType={booking.groupType}
              status={booking.groupType === 'grupal' ? 'group' : 'booked'}
              pending
              showSeparator={false}
            >
              <ClassStudentRow
                name={booking.athleteName || 'Alumno'}
                disabled={busy}
                onEdit={() => {
                  setShowBatchRequests(false)
                  openSchoolClassEditor(booking)
                }}
                actions={
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void resolveBatchRequest(booking, 'approved')}
                        className="relative h-8 min-h-8 rounded-full bg-(--c-ocean) px-3 text-xs before:absolute before:-inset-y-1.5 font-bold text-white disabled:opacity-50"
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void resolveBatchRequest(booking, 'rejected')}
                        className="relative h-8 min-h-8 rounded-full border border-rose-200 px-3 text-xs before:absolute before:-inset-y-1.5 font-bold text-rose-700 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </>
                }
              />
            </ClassCard>
          ))}
        </div>
      </Sheet>
      {batchAction === 'students' && schoolId && (
        <ScheduleStudentsModal
          bookings={batchBookings}
          slotCount={batchSlots.length}
          selectedSlots={batchSlots.map((slot) => ({
            ...slot,
            coachName: slot.coachName || agenda?.coachNames?.[slot.coachId],
          }))}
          error={batchError || batchRequestError}
          schoolId={schoolId}
          busy={busy}
          onClose={() => setBatchAction(null)}
          onAdd={(payloads) => void applyBatch(payloads)}
          onResolve={(booking, status) => void resolveBatchRequest(booking, status)}
          onEdit={(booking, student) => {
            setBatchAction(null)
            setStudentActionError(null)
            setNotice(null)
            setStudentAction({ booking, student })
          }}
        />
      )}
      {batchError && (
        <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
          {batchError}
        </p>
      )}
      <Sheet
        open={batchAction !== null && batchAction !== 'students'}
        onClose={() => setBatchAction(null)}
        closeDisabled={busy}
        label="Gestionar horarios seleccionados"
      >
        <div className="grid gap-3">
          <h2 className="text-lg font-bold">
            Gestionar {batchSlots.length} {batchSlots.length === 1 ? 'horario' : 'horarios'}
          </h2>
          {batchAction === 'status' && (
            <div className="grid gap-1 text-sm text-(--c-text-2)">
              <p>
                {batchSlots.length - selectedBlockedCount}{' '}
                {batchSlots.length - selectedBlockedCount === 1 ? 'Disponible' : 'Disponibles'}
              </p>
              <p>
                {selectedBlockedCount} {selectedBlockedCount === 1 ? 'Bloqueado' : 'Bloqueados'}
              </p>
            </div>
          )}
          {batchAction === 'students' ? (
            <fieldset className="grid gap-2">
              <legend>Alumnos</legend>
              {batchStudents.map((student) => (
                <label key={student.id} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={batchStudentIds.includes(student.id)}
                    onChange={() =>
                      setBatchStudentIds((current) =>
                        current.includes(student.id)
                          ? current.filter((id) => id !== student.id)
                          : [...current, student.id]
                      )
                    }
                  />
                  {student.name}
                </label>
              ))}
            </fieldset>
          ) : batchAction === 'coaches' ? (
            <fieldset className="grid gap-3">
              <legend className="mb-2 text-sm font-bold text-(--c-text-2)">
                Profes de los horarios seleccionados
              </legend>
              <div className="flex flex-wrap gap-2">
                {[
                  ...scheduleCoachOptions.filter(
                    (coach) => coach.id !== UNASSIGNED_SCHOOL_COACH_ID
                  ),
                  { id: UNASSIGNED_SCHOOL_COACH_ID, name: 'Sin profe aún' },
                ].map((coach) => (
                  <button
                    key={coach.id}
                    type="button"
                    disabled={busy}
                    aria-pressed={batchCoachIds.includes(coach.id)}
                    onClick={() =>
                      setBatchCoachIds((current) =>
                        coach.id === UNASSIGNED_SCHOOL_COACH_ID
                          ? [coach.id]
                          : current.includes(coach.id)
                            ? current.filter((id) => id !== coach.id)
                            : [
                                ...current.filter((id) => id !== UNASSIGNED_SCHOOL_COACH_ID),
                                coach.id,
                              ]
                      )
                    }
                    className="inline-flex min-h-11 items-center rounded-full bg-transparent transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
                  >
                    <CoachBadge
                      name={coach.name}
                      selected={batchCoachIds.includes(coach.id)}
                      unassigned={coach.id === UNASSIGNED_SCHOOL_COACH_ID}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-(--c-text-2)">
                Puedes elegir varios profes. Al aplicar, esta selección sustituirá los profes de
                todos estos horarios.
              </p>
            </fieldset>
          ) : batchAction === 'type' ? (
            <SlotSegmentedControl
              label="Tipo de clase"
              leftLabel="Particular"
              rightLabel="Grupal"
              leftIcon={<FiUser />}
              rightIcon={<FiUsers />}
              checked={batchValue ? batchValue === 'grupal' : null}
              onChange={(checked) => setBatchValue(checked ? 'grupal' : 'particular')}
              disabled={busy}
            />
          ) : (
            <SlotSegmentedControl
              label="Estado del horario"
              leftLabel="Disponible"
              rightLabel="Bloqueada"
              leftIcon={<FiUnlock />}
              rightIcon={<FiLock />}
              checked={batchValue ? batchValue === 'blocked' : null}
              onChange={(checked) => setBatchValue(checked ? 'blocked' : 'available')}
              disabled={busy}
            />
          )}
          {(batchAction === 'status' || batchAction === 'type') && !batchValue && (
            <p className="text-sm text-(--c-text-2)">
              Los horarios tienen valores distintos. Elige una opción para aplicarla a todos.
            </p>
          )}
          {batchAction === 'type' && (
            <p className="text-sm">
              El tipo se actualiza en las clases seleccionadas. Para horarios publicados, también se
              actualizan sus fechas recurrentes.
            </p>
          )}
          {batchError && <p role="alert">{batchError}</p>}
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              busy ||
              (batchAction === 'coaches'
                ? !batchCoachIds.length
                : batchAction === 'students'
                  ? !batchStudentIds.length
                  : !batchValue)
            }
            onClick={() => void applyBatch()}
          >
            {busy ? 'Guardando…' : 'Aplicar'}
          </button>
        </div>
      </Sheet>
      <Sheet
        open={Boolean(horizontalClass)}
        onClose={() => {
          setHorizontalClass(null)
          setNotice(null)
        }}
        label="Detalles de la clase"
        size="xl"
      >
        <h2 className="mb-3 text-lg font-bold">
          {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </h2>
        {renderDayCard(selectedClassRows, true, true)}
      </Sheet>

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
        label="Configurar clase"
        modalTopGap
      >
        {bookingToEdit && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--c-ocean)]">Configurar clase</h2>
              <div className="mt-2">
                <ScheduleTag
                  date={new Date(`${bookingToEdit.date}T12:00:00`).toLocaleDateString('es-MX', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                  time={`${bookingToEdit.startTime}–${bookingToEdit.endTime}`}
                  coachName={
                    bookingToEdit.coachName ||
                    agenda?.coachNames?.[bookingToEdit.coachId] ||
                    'Sin profe aún'
                  }
                  unassigned={bookingToEdit.coachId === UNASSIGNED_SCHOOL_COACH_ID}
                  groupType={bookingToEdit.groupType}
                />
              </div>
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
                className="min-h-9 rounded-full bg-[var(--c-aqua)] px-2.5 text-[11px] font-bold text-white hover:bg-[var(--c-aqua-strong)] disabled:opacity-50"
              >
                + {capitalizeSchoolTerm(participantSingular)}
              </button>

              <button
                type="button"
                onClick={() => {
                  openClassCancellation(bookingToEdit)
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
        label={classEditorConfiguration ? 'Configurar clase' : 'Editar clase'}
        modalTopGap
      >
        {schoolClassToEdit && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[var(--c-ocean)]">
                {classEditorConfiguration ? 'Configurar clase' : 'Editar clase'}
              </h2>
              <div className="mt-2">
                <ScheduleTag
                  date={new Date(`${schoolClassToEdit.date}T12:00:00`).toLocaleDateString('es-MX', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                  time={`${schoolClassToEdit.startTime}–${schoolClassToEdit.endTime}`}
                  coachName={
                    schoolClassToEdit.coachName ||
                    agenda?.coachNames?.[schoolClassToEdit.coachId] ||
                    'Sin profe aún'
                  }
                  unassigned={schoolClassToEdit.coachId === UNASSIGNED_SCHOOL_COACH_ID}
                  groupType={schoolClassToEdit.groupType}
                />
              </div>
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
                  className="inline-flex min-h-9 items-center justify-center gap-1 rounded-full bg-[var(--c-aqua)] px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-[var(--c-aqua-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiPlus aria-hidden="true" /> Agregar {capitalizeSchoolTerm(participantPlural)}
                </button>
              )}
            <button
              type="button"
              onClick={() => openClassCancellation(schoolClassToEdit)}
              disabled={busy}
              className="min-h-12 rounded-full border border-[var(--rose-bd)] px-5 text-sm font-bold text-[var(--rose-tx)]"
            >
              {busy ? 'Cancelando…' : 'Cancelar clase'}
            </button>
          </div>
        )}
      </Sheet>

      {attendanceTarget && (
        <AttendanceModal
          {...attendanceTarget}
          onClose={() => setAttendanceTarget(null)}
          onUpdated={() => {
            void loadAgenda(monthOfSelected)
          }}
        />
      )}
      {classNotesTarget && (
        <ClassNotesModal
          key={`${classNotesTarget.schoolId}|${classNotesTarget.coachId}|${classNotesTarget.date}|${classNotesTarget.startTime}`}
          target={classNotesTarget}
          onClose={() => setClassNotesTarget(null)}
        />
      )}
      {studentAction && (
        <AgendaStudentActions
          key={`${studentAction.booking.id}:${studentAction.student.studentId}`}
          student={studentAction.student}
          classTag={
            <ScheduleTag
              date={new Date(`${studentAction.student.date}T12:00:00`).toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
              time={`${studentAction.booking.startTime}–${studentAction.booking.endTime}`}
              coachName={
                studentAction.booking.coachName ||
                agenda?.coachNames?.[studentAction.booking.coachId] ||
                'Sin profe aún'
              }
              unassigned={studentAction.booking.coachId === '__unassigned__'}
              groupType={studentAction.booking.groupType}
            />
          }
          onProfile={() =>
            setStudentProfile({
              studentId: studentAction.student.studentId,
              name: studentAction.student.studentName,
              schoolId: schoolIdForBooking(studentAction.booking) || undefined,
            })
          }
          busy={busy}
          error={studentActionError}
          onClose={() => setStudentAction(null)}
          onSave={(attended, note) => void saveStudentAction(attended, note)}
          onMove={() => {
            setStudentToReassign(studentAction)
            setStudentAction(null)
          }}
          onRemove={() => void removeStudentFromClass()}
          pending={
            studentAction.booking.schoolClassStudents?.find(
              (item) => item.id === studentAction.student.studentId
            )?.pending ?? studentAction.booking.status === 'pending'
          }
          onChangeApproval={
            manageSchoolSchedule && studentAction.booking.schoolClassId
              ? () => void updateStudentApproval()
              : undefined
          }
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

      {studentProfile && (
        <StudentProfileModal
          {...studentProfile}
          onClose={() => {
            setStudentProfile(null)
            setLabelRevision((current) => current + 1)
          }}
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
          coachId={addStudentSlot.coachId}
          schoolId={addStudentSlot.schoolId || schoolId}
          allowCreate={
            !addStudentSlot.schoolClassId && addStudentSlot.coachId !== UNASSIGNED_SCHOOL_COACH_ID
          }
          slotLabel={`${new Date(`${addStudentSlot.date}T12:00:00`).toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })} · ${addStudentSlot.startTime}`}
          busy={busy}
          promotionRequired={Boolean(addStudentSlot.promoteToGroup)}
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
          busy={busy || (manageSchoolSchedule && loadedCoachId !== requestCoachId)}
          error={error}
          coachOptions={allowSchoolScheduleEdit ? scheduleCoachOptions : []}
          selectedCoachId={coachId}
          onCoachChange={onScheduleCoachChange}
          onWeekChange={(weekStart) => setSelectedDate(dateKey(weekStart))}
          onClose={closeScheduleEditor}
          onSubmit={applyHours}
          targetOptions={scheduleTargetOptions}
          selectedTarget={scheduleTarget}
          onTargetChange={onScheduleTargetChange}
        />
      )}

      <Sheet
        open={Boolean(slotEditor)}
        onClose={() => setSlotEditor(null)}
        label="Configurar clase"
      >
        {slotEditor && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-bold text-[var(--c-ocean)]">Configurar clase</h3>
              <p className="mt-1 text-sm text-[var(--c-text-2)]">
                {slotEditor.slot.agendaLabel ? `${slotEditor.slot.agendaLabel} · ` : ''}
                {slotEditor.slot.startTime}–{slotEditor.slot.endTime}
              </p>
            </div>
            {manageSchoolSchedule && slotEditor.slot.coachId === UNASSIGNED_SCHOOL_COACH_ID && (
              <div className="flex flex-col gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] p-3">
                <label
                  htmlFor="assign-slot-coach"
                  className="text-sm font-bold text-[var(--c-text-2)]"
                >
                  Asignar profe para esta fecha
                </label>
                <select
                  id="assign-slot-coach"
                  value={slotAssignmentCoachId}
                  onChange={(event) => setSlotAssignmentCoachId(event.target.value)}
                  className="min-h-11 rounded-xl border border-[var(--c-border)] bg-white px-3 text-[var(--c-ocean)]"
                >
                  <option value="">Seleccionar profe</option>
                  {Object.entries(agenda?.coachNames || {})
                    .filter(([id]) => id !== UNASSIGNED_SCHOOL_COACH_ID)
                    .map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={assignSlotToCoach}
                  disabled={busy || !slotAssignmentCoachId}
                  className="min-h-11 rounded-full bg-[var(--c-primary)] px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  Asignar profe
                </button>
              </div>
            )}
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

      {cancelClassTarget && (
        <CancelClassModal
          key={cancelClassTarget.id}
          participants={cancellationParticipants}
          busy={busy}
          error={cancelClassError}
          onClose={() => setCancelClassTarget(null)}
          onSubmit={(ids) => void submitClassCancellation(ids)}
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
  checked: boolean | null
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
