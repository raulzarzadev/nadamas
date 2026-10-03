'use client'

import Sheet from '@comps/ui/sheet'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiUser, FiUsers, FiX } from 'react-icons/fi'
import CoachAgendaDateSelector from '@/components/coach/CoachAgendaDateSelector'
import { useUser } from '@/context/UserContext'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { auth } from '@/firebase/index'
import type { AdditionalProfile } from '@/lib/additional-profile'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { CoachAgendaPayload, CoachAvailableSlot } from '@/lib/coach-agenda'
import { HOUR_STATUSES, type HourStatus } from '@/lib/coach-agenda-status'
import {
  flattenCoachBookingSelections,
  type PublicBlockedSlot,
  type PublicBookedSlot,
} from '@/lib/coach-booking'
import {
  dateKey as coachDateKey,
  hasPublishedOfferingSchedules,
  resolveOfferings,
} from '@/lib/coach-offerings'
import type { SchoolBookingMode, SchoolStudent } from '@/lib/school'

const dateKey = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}
const weekStart = (date: Date) => {
  const result = new Date(date)
  result.setHours(12, 0, 0, 0)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}
interface PublicSchoolOption {
  id: string
  name: string
  bookingMode: SchoolBookingMode
  showCoachesSchedules: boolean
}
const EMPTY_SCHOOLS: PublicSchoolOption[] = []
type SchoolReservation = {
  id: string
  schoolId?: string
  coachId: string
  coachName: string
  date: string
  startTime: string
  endTime: string
  status: string
  groupType: 'particular' | 'grupal'
  studentIds?: string[]
  studentNames?: string[]
}
const slotIsFuture = (slot: Pick<CoachAvailableSlot, 'date' | 'startTime'>) =>
  new Date(`${slot.date}T${slot.startTime}:00`).getTime() > Date.now()
const slotDurationMinutes = (slot: Pick<CoachAvailableSlot, 'startTime' | 'endTime'>) => {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  const duration = toMinutes(slot.endTime) - toMinutes(slot.startTime)
  return duration > 0 ? duration : duration + 24 * 60
}
const groupReservationsByClass = (reservations: SchoolReservation[]) => {
  const groups = new Map<string, SchoolReservation[]>()
  for (const reservation of reservations) {
    const key = [
      reservation.schoolId || '',
      reservation.coachId,
      reservation.startTime,
      reservation.endTime,
      reservation.groupType,
    ].join('|')
    groups.set(key, [...(groups.get(key) || []), reservation])
  }
  return [...groups.values()]
}

export default function AthleteSchoolSchedule({
  schoolId,
  schoolName,
  title = 'Horarios',
  description = '',
  bookingMode,
  schools = EMPTY_SCHOOLS,
}: {
  schoolId: string | null
  schoolName?: string
  title?: string
  description?: string
  bookingMode: SchoolBookingMode
  schools?: PublicSchoolOption[]
}) {
  const { user } = useUser() as {
    user:
      | {
          nickname?: string
          displayName?: string
          name?: string
          firstName?: string
          lastName?: string
          email?: string
          uid?: string
          id?: string
        }
      | null
      | undefined
  }
  const accountName = (
    user?.nickname ||
    user?.displayName ||
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split('@')[0] ||
    ''
  ).trim()
  const accountId = user?.uid || user?.id || auth.currentUser?.uid || ''
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()))
  const [agenda, setAgenda] = useState<CoachAgendaPayload | null>(null)
  const [myReservations, setMyReservations] = useState<SchoolReservation[]>([])
  const [students, setStudents] = useState<Array<SchoolStudent & { schoolId?: string }>>([])
  const [additionalProfiles, setAdditionalProfiles] = useState<AdditionalProfile[]>([])
  const [coachFilter, setCoachFilter] = useState('all')
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [coachFiltersTarget, setCoachFiltersTarget] = useState<HTMLElement | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<Set<HourStatus>>(
    () => new Set(HOUR_STATUSES)
  )
  const [selectedSlot, setSelectedSlot] = useState<CoachAvailableSlot | null>(null)
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const month = selectedDate.slice(0, 7)

  useEffect(() => {
    setCoachFiltersTarget(document.getElementById('athlete-coach-filters'))
  }, [])

  const load = useCallback(async () => {
    setError('')
    try {
      if (schoolId) {
        const [agendaResponse, studentsResponse, profilesResponse] = await Promise.all([
          getAuthed(
            `/api/schools/${encodeURIComponent(schoolId)}/agenda?month=${month}&view=public`
          ),
          getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/students`).catch(() => null),
          getAuthed('/api/additional-profiles').catch(() => null),
        ])
        if (!agendaResponse.ok) throw new Error('agenda')
        const agendaPayload = (await agendaResponse.json()) as CoachAgendaPayload
        setAgenda(agendaPayload)
        setMyReservations(
          (
            agendaPayload as CoachAgendaPayload & {
              myReservations?: SchoolReservation[]
            }
          ).myReservations?.map((reservation) => ({ ...reservation, schoolId })) || []
        )
        const studentsPayload = studentsResponse?.ok
          ? ((await studentsResponse.json()) as { students?: SchoolStudent[] })
          : {}
        const profilesPayload = profilesResponse?.ok
          ? ((await profilesResponse.json()) as { profiles?: AdditionalProfile[] })
          : {}
        setStudents((studentsPayload.students || []).map((student) => ({ ...student, schoolId })))
        setAdditionalProfiles(profilesPayload.profiles || [])
        return
      }

      const [schoolsData, directoryResponse, profilesResponse] = await Promise.all([
        Promise.all(
          schools.map(async (school) => {
            const [response, studentResponse] = await Promise.all([
              getAuthed(
                `/api/schools/${encodeURIComponent(school.id)}/agenda?month=${month}&view=public`
              ),
              getAuthed(`/api/schools/${encodeURIComponent(school.id)}/students`).catch(() => null),
            ])
            const [agenda, studentPayload] = await Promise.all([
              response.json() as Promise<CoachAgendaPayload>,
              studentResponse?.ok
                ? (studentResponse.json() as Promise<{ students?: SchoolStudent[] }>)
                : Promise.resolve({ students: [] as SchoolStudent[] }),
            ])
            return { school, agenda, students: studentPayload.students || [] }
          })
        ),
        fetch('/api/public/coaches'),
        getAuthed('/api/additional-profiles').catch(() => null),
      ])
      const profilesPayload = profilesResponse?.ok
        ? ((await profilesResponse.json()) as { profiles?: AdditionalProfile[] })
        : {}
      setAdditionalProfiles(profilesPayload.profiles || [])
      const directory = (await directoryResponse.json()) as {
        coaches?: Array<CoachPublic & { id: string; name?: string }>
      }
      const publicCoaches = (directory.coaches || []).filter((coach) =>
        hasPublishedOfferingSchedules(resolveOfferings(coach))
      )
      const publicData = await Promise.all(
        publicCoaches.map(async (coach) => {
          const response = await fetch(`/api/public/coaches/${encodeURIComponent(coach.id)}`)
          return (await response.json()) as {
            bookedSlots?: PublicBookedSlot[]
            blockedSlots?: PublicBlockedSlot[]
          }
        })
      )
      const allSlots: CoachAvailableSlot[] = []
      const allReservations: SchoolReservation[] = []
      const names: Record<string, string> = {}
      const schoolLabels: Record<string, string> = {}
      for (const { school, agenda: payload } of schoolsData) {
        Object.assign(names, payload.coachNames || {})
        schoolLabels[school.id] = school.name
        allSlots.push(...payload.availableSlots.map((slot) => ({ ...slot, schoolId: school.id })))
        const reservations =
          (
            payload as CoachAgendaPayload & {
              myReservations?: SchoolReservation[]
            }
          ).myReservations || []
        allReservations.push(
          ...reservations.map((reservation) => ({ ...reservation, schoolId: school.id }))
        )
      }
      setMyReservations(allReservations)
      setStudents(
        schoolsData.flatMap(({ school, students: schoolStudents }) =>
          schoolStudents.map((student) => ({ ...student, schoolId: school.id }))
        )
      )
      const from = new Date(`${month}-01T12:00:00`)
      from.setDate(from.getDate() - ((from.getDay() + 6) % 7))
      for (let index = 0; index < publicCoaches.length; index += 1) {
        const coach = publicCoaches[index]
        const detail = publicData[index]
        if (!coach || !detail) continue
        names[coach.id] = coach.name || 'Coach'
        const booked = detail.bookedSlots || []
        const blocked = detail.blockedSlots || []
        const bookedTimes = new Set(booked.map((slot) => `${slot.date}|${slot.startTime}`))
        const blockedTimes = new Set(
          blocked.filter((slot) => !slot.allDay).map((slot) => `${slot.date}|${slot.startTime}`)
        )
        const blockedDays = new Set(blocked.filter((slot) => slot.allDay).map((slot) => slot.date))
        const through = new Date(from)
        through.setDate(through.getDate() + 41)
        const selections = flattenCoachBookingSelections({ ...coach, id: coach.id }, from, 42)
        allSlots.push(
          ...selections
            .filter((slot) => slot.date >= coachDateKey(from) && slot.date <= coachDateKey(through))
            .filter(
              (slot) =>
                !bookedTimes.has(`${slot.date}|${slot.startTime}`) &&
                !blockedTimes.has(`${slot.date}|${slot.startTime}`) &&
                !blockedDays.has(slot.date) &&
                new Date(`${slot.date}T${slot.startTime}:00`).getTime() > Date.now()
            )
            .map((slot) => ({
              ...slot,
              id: `${slot.coachId}:${slot.scheduleId}:${slot.date}`,
              status: 'available' as const,
            }))
        )
      }
      setAgenda({
        bookings: [],
        blocks: [],
        offerings: [],
        availableSlots: allSlots,
        coachNames: names,
        schoolLabels,
      } as CoachAgendaPayload)
    } catch {
      setError('No se pudieron cargar los horarios. Inténtalo de nuevo.')
    }
  }, [schoolId, month, schools])

  useEffect(() => {
    void load()
  }, [load])

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = weekStart(new Date(`${selectedDate}T12:00:00`))
        date.setDate(date.getDate() + index)
        return date
      }),
    [selectedDate]
  )
  const coachNames = agenda?.coachNames || {}
  const schoolLabels =
    (agenda as (CoachAgendaPayload & { schoolLabels?: Record<string, string> }) | null)
      ?.schoolLabels || {}
  const schoolSlots = (agenda?.availableSlots || []).filter(
    (slot) => !schoolId || slot.schoolId === schoolId
  )
  const reservationSlotKey = (slot: {
    schoolId?: string
    coachId: string
    date: string
    startTime: string
  }) => `${slot.schoolId || ''}|${slot.coachId}|${slot.date}|${slot.startTime}`
  const myGroupReservationKeys = new Set(
    myReservations
      .filter(
        (reservation) => reservation.groupType === 'grupal' && reservation.status !== 'cancelled'
      )
      .map(reservationSlotKey)
  )
  const fullGroupSlotKeys = new Set(
    (agenda?.bookings || [])
      .filter((booking) => booking.groupType === 'grupal' && booking.classFull)
      .map(reservationSlotKey)
  )
  const selectableSlots = schoolSlots.filter(
    (slot) =>
      slot.status === 'available' ||
      (slot.status === 'booked' &&
        slot.groupType === 'grupal' &&
        myGroupReservationKeys.has(reservationSlotKey(slot)) &&
        !fullGroupSlotKeys.has(reservationSlotKey(slot)))
  )
  const eligibleSlots = selectableSlots.filter((slot) => {
    if (!slotIsFuture(slot)) return false
    if (schoolFilter !== 'all') {
      return (
        slot.schoolId === schoolFilter && (coachFilter === 'all' || slot.coachId === coachFilter)
      )
    }
    return Boolean(slot.schoolId) || coachFilter === 'all' || slot.coachId === coachFilter
  })
  const visibleSlots = eligibleSlots.filter((slot) =>
    selectedStatuses.has(slot.groupType === 'grupal' ? 'groupAvailable' : 'available')
  )
  const coachIdsWithSlots = new Set(
    selectableSlots
      .filter(
        (slot) =>
          slotIsFuture(slot) &&
          (schoolFilter === 'all' ? !slot.schoolId : slot.schoolId === schoolFilter)
      )
      .map((slot) => slot.coachId)
  )
  const coaches = Object.entries(coachNames)
    .filter(([id]) => coachIdsWithSlots.has(id))
    .sort((a, b) => a[1].localeCompare(b[1]))
  const selectedSchoolName = schools.find((school) => school.id === schoolFilter)?.name
  const selectedBookingMode: SchoolBookingMode = schoolId
    ? bookingMode
    : selectedSlot?.schoolId
      ? schools.find((school) => school.id === selectedSlot.schoolId)?.bookingMode || 'request'
      : 'direct'
  const bookingParticipants = useMemo<
    Array<{
      value: string
      name: string
      schoolStudentId?: string
      additionalProfileId?: string
      registered: boolean
      account: boolean
    }>
  >(() => {
    if (!selectedSlot) return []
    if (!selectedSlot.schoolId) {
      return [
        {
          value: `profile:${accountId || 'self'}`,
          name: accountName || 'Mi perfil',
          registered: true,
          account: true,
        },
        ...additionalProfiles.map((profile) => ({
          value: `additional:${profile.id}`,
          name: profile.name,
          additionalProfileId: profile.id,
          registered: true,
          account: false,
        })),
      ]
    }
    const relatedStudents = students.filter(
      (student) =>
        student.schoolId === selectedSlot.schoolId &&
        student.status === 'active' &&
        (student.studentUserId === accountId ||
          student.id === accountId ||
          student.accountParticipant ||
          student.managerIds?.includes(accountId) ||
          student.guardianIds?.includes(accountId))
    )
    const participants: Array<{
      value: string
      name: string
      schoolStudentId?: string
      additionalProfileId?: string
      registered: boolean
      account: boolean
    }> = relatedStudents.map((student) => ({
      value: student.id,
      name: student.name,
      schoolStudentId: student.id,
      additionalProfileId: student.additionalProfileId,
      registered: true,
      account: student.studentUserId === accountId || student.id === accountId,
    }))
    const hasAccount = relatedStudents.some(
      (student) =>
        student.studentUserId === accountId ||
        student.id === accountId ||
        student.accountParticipant
    )
    if (accountId && !hasAccount) {
      participants.unshift({
        value: `profile:${accountId}`,
        name: accountName || 'Mi perfil',
        schoolStudentId: undefined,
        additionalProfileId: undefined,
        registered: false,
        account: true,
      })
    }
    for (const profile of additionalProfiles) {
      const linked = relatedStudents.find((student) => student.additionalProfileId === profile.id)
      participants.push({
        value: linked?.id || `additional:${profile.id}`,
        name: profile.name,
        schoolStudentId: linked?.id,
        additionalProfileId: profile.id,
        registered: Boolean(linked),
        account: false,
      })
    }
    return participants
  }, [accountId, accountName, additionalProfiles, selectedSlot, students])
  const selectedParticipants = bookingParticipants.filter((item) => studentIds.includes(item.value))
  const participantReservationsAtSchool = (participant: (typeof bookingParticipants)[number]) =>
    myReservations.filter(
      (reservation) =>
        reservation.schoolId === selectedSlot?.schoolId &&
        reservation.status !== 'cancelled' &&
        (participant.schoolStudentId
          ? reservation.studentIds?.includes(participant.schoolStudentId) ||
            (participant.account && !reservation.studentIds?.length)
          : participant.account)
    )
  const alreadyBookedGroupStudentIds = new Set(
    selectedSlot?.groupType === 'grupal'
      ? myReservations
          .filter(
            (reservation) =>
              reservation.schoolId === selectedSlot.schoolId &&
              reservation.coachId === selectedSlot.coachId &&
              reservation.date === selectedSlot.date &&
              reservation.startTime === selectedSlot.startTime &&
              reservation.groupType === 'grupal' &&
              reservation.status !== 'cancelled'
          )
          .flatMap((reservation) => reservation.studentIds || [])
      : []
  )
  const isParticipantBookedInGroup = (participant: (typeof bookingParticipants)[number]) =>
    Boolean(
      selectedSlot?.groupType === 'grupal' &&
        (participant.schoolStudentId
          ? alreadyBookedGroupStudentIds.has(participant.schoolStudentId) ||
            (participant.account &&
              participantReservationsAtSchool(participant).some(
                (reservation) =>
                  reservation.coachId === selectedSlot.coachId &&
                  reservation.date === selectedSlot.date &&
                  reservation.startTime === selectedSlot.startTime &&
                  reservation.groupType === 'grupal'
              ))
          : participant.account &&
            participantReservationsAtSchool(participant).some(
              (reservation) =>
                reservation.coachId === selectedSlot.coachId &&
                reservation.date === selectedSlot.date &&
                reservation.startTime === selectedSlot.startTime &&
                reservation.groupType === 'grupal'
            ))
    )
  const bookedParticipants = selectedParticipants.filter(isParticipantBookedInGroup)
  const participantAlreadyBookedInGroup = bookedParticipants.length > 0
  const dayStatuses = useMemo(() => {
    const result = new Map<string, HourStatus[]>()
    const seenReservations = new Set<string>()
    for (const slot of eligibleSlots) {
      const statuses = result.get(slot.date) || []
      statuses.push(slot.groupType === 'grupal' ? 'groupAvailable' : 'available')
      result.set(slot.date, statuses)
    }
    for (const reservation of myReservations) {
      if (
        reservation.status === 'cancelled' ||
        (schoolId && reservation.schoolId !== schoolId) ||
        (schoolFilter !== 'all'
          ? reservation.schoolId !== schoolFilter ||
            (coachFilter !== 'all' && reservation.coachId !== coachFilter)
          : !reservation.schoolId && coachFilter !== 'all' && reservation.coachId !== coachFilter)
      )
        continue
      const classKey = `${reservation.schoolId || ''}|${reservation.coachId}|${reservation.date}|${reservation.startTime}|${reservation.groupType}`
      if (seenReservations.has(classKey)) continue
      seenReservations.add(classKey)
      const statuses = result.get(reservation.date) || []
      statuses.push(reservation.groupType === 'grupal' ? 'group' : 'booked')
      result.set(reservation.date, statuses)
    }
    for (const statuses of result.values()) statuses.sort()
    return result
  }, [eligibleSlots, myReservations, schoolId, schoolFilter, coachFilter])
  const toggleStatus = (status: HourStatus) => {
    setSelectedStatuses((current) => {
      const next = new Set(current)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }
  const changeWeek = (delta: number) => {
    const date = new Date(`${selectedDate}T12:00:00`)
    date.setDate(date.getDate() + delta * 7)
    setSelectedDate(dateKey(date))
  }
  const personalReservations = myReservations
    .filter(
      (reservation) =>
        reservation.date === selectedDate &&
        reservation.status !== 'cancelled' &&
        (!schoolId || reservation.schoolId === schoolId) &&
        (schoolFilter !== 'all'
          ? reservation.schoolId === schoolFilter &&
            (coachFilter === 'all' || reservation.coachId === coachFilter)
          : Boolean(reservation.schoolId) ||
            coachFilter === 'all' ||
            reservation.coachId === coachFilter)
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const personalReservationKeys = new Set(
    personalReservations.map(
      (reservation) =>
        `${reservation.schoolId || ''}|${reservation.coachId}|${reservation.date}|${reservation.startTime}`
    )
  )
  const reusableGroupReservationKeys = new Set(
    personalReservations
      .filter((reservation) => reservation.groupType === 'grupal')
      .map(
        (reservation) =>
          `${reservation.schoolId || ''}|${reservation.coachId}|${reservation.date}|${reservation.startTime}`
      )
  )
  const slots = visibleSlots
    .filter((slot) => slot.date === selectedDate)
    .filter(
      (slot) =>
        !personalReservationKeys.has(
          `${slot.schoolId || ''}|${slot.coachId}|${slot.date}|${slot.startTime}`
        ) ||
        (slot.groupType === 'grupal' &&
          reusableGroupReservationKeys.has(
            `${slot.schoolId || ''}|${slot.coachId}|${slot.date}|${slot.startTime}`
          ))
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const rowsByTime = new Map<
    string,
    { startTime: string; reservations: SchoolReservation[]; slots: CoachAvailableSlot[] }
  >()
  const rowForTime = (startTime: string) => {
    const row = rowsByTime.get(startTime) || { startTime, reservations: [], slots: [] }
    rowsByTime.set(startTime, row)
    return row
  }
  for (const reservation of personalReservations)
    rowForTime(reservation.startTime).reservations.push(reservation)
  for (const slot of slots) rowForTime(slot.startTime).slots.push(slot)
  const scheduleRows = [...rowsByTime.values()].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )

  async function submitBooking() {
    if (!selectedSlot || !selectedParticipants.length) return
    setBusy(true)
    setError('')
    try {
      const day = new Date(`${selectedSlot.date}T12:00:00`).getDay()
      if (!selectedSlot.schoolId) {
        for (const participant of selectedParticipants) {
          await postAuthed('/api/bookings', {
            coachId: selectedSlot.coachId,
            offeringId: selectedSlot.offeringId,
            scheduleId: selectedSlot.scheduleId,
            locationName: selectedSlot.locationName,
            mode: 'fixed',
            groupType: selectedSlot.groupType,
            days: [String(day)],
            date: selectedSlot.date,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            athleteProfile: {
              profileId: participant.additionalProfileId || accountId || 'self',
              additionalProfileId: participant.additionalProfileId,
              name: participant.name,
            },
          })
        }
        setSelectedSlot(null)
        setMessage(
          selectedParticipants.length > 1
            ? `Clase reservada para ${selectedParticipants.length} personas. Ya aparece en Mis clases.`
            : 'Clase reservada. Ya aparece en Mis clases.'
        )
        await load()
        return
      }
      const results: Array<{ direct?: boolean; pendingApproval?: boolean }> = []
      for (const participant of selectedParticipants) {
        const result = await postAuthed(
          `/api/schools/${encodeURIComponent(selectedSlot.schoolId)}/class-requests`,
          {
            ...(participant.schoolStudentId
              ? { studentId: participant.schoolStudentId }
              : {
                  participant: participant.additionalProfileId
                    ? {
                        type: 'additional',
                        additionalProfileId: participant.additionalProfileId,
                      }
                    : { type: 'self' },
                }),
            teacherId: selectedSlot.coachId,
            preferredTeacherId: selectedSlot.coachId,
            title: selectedSlot.locationName || 'Clase escolar',
            type: selectedSlot.groupType === 'grupal' ? 'group' : 'individual',
            preferredDays: [day],
            preferredStartTime: selectedSlot.startTime,
            preferredEndTime: selectedSlot.endTime,
            startDate: selectedSlot.date,
            endDate: selectedSlot.date,
            durationMinutes: 60,
            location: selectedSlot.locationName,
            notes: `Horario elegido: ${selectedSlot.startTime}–${selectedSlot.endTime}.`,
            directBooking:
              (schools.find((school) => school.id === selectedSlot.schoolId)?.bookingMode ||
                bookingMode) === 'direct',
          }
        )
        results.push((await result.json()) as { direct?: boolean; pendingApproval?: boolean })
      }
      const resultPayload = results[0]
      setSelectedSlot(null)
      setMessage(
        results.length > 1
          ? `${results.length} reservas enviadas para las personas seleccionadas.`
          : resultPayload?.pendingApproval
            ? 'Reserva pendiente de aprobación. Aparecerá en Próximas clases como pendiente.'
            : 'Solicitud enviada. La escuela te confirmará el horario.'
      )
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo completar la inscripción.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {!schoolId &&
        coachFiltersTarget &&
        createPortal(
          <div className="-mx-1 flex min-w-0 flex-col gap-3 px-1">
            {schools.length > 0 && (
              <section className="min-w-0">
                <div className="flex items-baseline gap-2 overflow-x-auto whitespace-nowrap">
                  <h2 className="text-sm font-extrabold text-[var(--c-ocean)]">Escuelas</h2>
                  <p className="text-[11px] text-[var(--c-text-2)]">
                    Horarios disponibles de escuelas públicas.
                  </p>
                </div>
                <nav
                  aria-label="Filtrar por escuela"
                  className="mt-2 flex gap-2 overflow-x-auto py-1"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolFilter('all')
                      setCoachFilter('all')
                    }}
                    aria-pressed={schoolFilter === 'all'}
                    className={`min-h-11 shrink-0 rounded-[var(--r-sm)] border px-5 py-2 text-sm font-bold transition ${schoolFilter === 'all' ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white shadow-[var(--shadow-sm)]' : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:border-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)]'}`}
                  >
                    Todas las escuelas
                  </button>
                  {schools.map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => {
                        setSchoolFilter(school.id)
                        setCoachFilter('all')
                      }}
                      aria-pressed={schoolFilter === school.id}
                      className={`min-h-11 shrink-0 rounded-[var(--r-sm)] border px-5 py-2 text-sm font-bold transition ${schoolFilter === school.id ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white shadow-[var(--shadow-sm)]' : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:border-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)]'}`}
                    >
                      {school.name}
                    </button>
                  ))}
                </nav>
              </section>
            )}
            <section className="min-w-0">
              <div className="flex items-baseline gap-2 overflow-x-auto whitespace-nowrap">
                <h2 className="text-sm font-extrabold text-[var(--c-ocean)]">
                  {selectedSchoolName ? `Coaches de ${selectedSchoolName}` : title}
                </h2>
                {description && !selectedSchoolName && (
                  <p className="text-[11px] text-[var(--c-text-2)]">{description}</p>
                )}
              </div>
              <nav
                aria-label={
                  selectedSchoolName
                    ? `Filtrar por coach de ${selectedSchoolName}`
                    : 'Filtrar por coach independiente'
                }
                className="mt-2 flex gap-2 overflow-x-auto py-1"
              >
                <button
                  type="button"
                  onClick={() => setCoachFilter('all')}
                  aria-pressed={coachFilter === 'all'}
                  className={`min-h-11 shrink-0 rounded-[var(--r-sm)] border px-5 py-2 text-sm font-bold transition ${coachFilter === 'all' ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white shadow-[var(--shadow-sm)]' : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:border-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)]'}`}
                >
                  Todos
                </button>
                {coaches.map(([id, name]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCoachFilter(id)}
                    aria-pressed={coachFilter === id}
                    className={`min-h-11 shrink-0 rounded-[var(--r-sm)] border px-5 py-2 text-sm font-bold transition ${coachFilter === id ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white shadow-[var(--shadow-sm)]' : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:border-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)]'}`}
                  >
                    {name}
                  </button>
                ))}
              </nav>
            </section>
          </div>,
          coachFiltersTarget
        )}
      <CoachAgendaDateSelector
        selectedDate={selectedDate}
        weekDates={week}
        dayStatuses={dayStatuses}
        selectedStatuses={selectedStatuses}
        onToggleStatus={toggleStatus}
        onSelectDate={setSelectedDate}
        onChangeWeek={changeWeek}
      />
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {agenda === null ? (
        <p className="py-6 text-center text-sm">Cargando horarios…</p>
      ) : slots.length === 0 && personalReservations.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-[var(--c-text-2)]">
          No hay horarios disponibles para este día.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-white">
          {scheduleRows.map((row) => (
            <div
              key={row.startTime}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 border-b border-[var(--c-border)] px-4 py-2.5 last:border-b-0"
            >
              <span className="w-14 shrink-0 text-sm font-bold text-[var(--c-ocean)]">
                {row.startTime}
              </span>
              <div className="grid min-w-0 grid-cols-1 gap-2">
                {groupReservationsByClass(row.reservations).map((reservations) => {
                  const reservation = reservations[0]
                  if (!reservation) return null
                  const participants = new Map<string, { name: string; statuses: Set<string> }>()
                  for (const item of reservations) {
                    const names = item.studentNames?.length
                      ? item.studentNames
                      : [accountName || 'Mi perfil']
                    for (const name of names) {
                      const participantKey = name.trim().toLocaleLowerCase()
                      const participant = participants.get(participantKey) || {
                        name,
                        statuses: new Set<string>(),
                      }
                      participant.statuses.add(item.status)
                      participants.set(participantKey, participant)
                    }
                  }
                  const participantList = [...participants.values()]
                  const hasPending = reservations.some((item) => item.status === 'pending')
                  return (
                    <div
                      key={`${reservation.schoolId || ''}-${reservation.coachId}-${reservation.startTime}-${reservation.endTime}-${reservation.groupType}`}
                      className={`min-w-0 rounded-xl border-l-4 px-3 py-2.5 ${hasPending ? 'border-amber-400 bg-amber-50' : 'border-emerald-500 bg-emerald-50'}`}
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--c-ocean)]">
                          {reservation.coachName} · {slotDurationMinutes(reservation)} min
                        </span>
                        {reservation.groupType === 'grupal' && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-800">
                            <FiUsers aria-hidden="true" /> Grupal
                          </span>
                        )}
                      </div>
                      <ul className="mt-1 flex flex-wrap gap-1.5">
                        {participantList.map((participant) => (
                          <li
                            key={participant.name}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2 py-1 text-sm"
                          >
                            <FiUser
                              aria-hidden="true"
                              className="shrink-0 text-[var(--c-text-2)]"
                            />
                            <span className="font-semibold text-[var(--c-ocean)]">
                              {participant.name}
                            </span>
                            {[...participant.statuses].map((status) => (
                              <span
                                key={status}
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${status === 'pending' ? 'bg-amber-200 text-amber-950' : 'bg-emerald-200 text-emerald-950'}`}
                              >
                                {status === 'pending' ? 'Pendiente' : 'Inscrito'}
                              </span>
                            ))}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
                {row.slots.map((slot) => (
                  <button
                    key={`${slot.coachId}-${slot.id}`}
                    type="button"
                    aria-label={`Elegir ${coachNames[slot.coachId] || 'Coach'}, ${slot.startTime}–${slot.endTime}${slot.groupType === 'grupal' ? ', clase grupal' : ''}`}
                    onClick={() => {
                      setSelectedSlot(slot)
                      setStudentIds([])
                    }}
                    className={`flex min-h-10 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition hover:brightness-[0.98] ${slot.groupType === 'grupal' ? 'border-violet-400 bg-transparent' : 'border-emerald-400 bg-white'}`}
                  >
                    {slot.groupType === 'grupal' ? (
                      <FiUsers className="shrink-0 text-violet-600" aria-hidden="true" />
                    ) : (
                      <FiUser className="shrink-0 text-[var(--c-ocean)]" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {[
                        coachNames[slot.coachId] || 'Coach',
                        slot.schoolId ? schoolLabels[slot.schoolId] : '',
                        `${slotDurationMinutes(slot)} min`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-cyan-700">Elegir</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Sheet
        open={Boolean(selectedSlot)}
        onClose={() => {
          if (!busy) setSelectedSlot(null)
        }}
        label={selectedBookingMode === 'direct' ? 'Reservar horario' : 'Solicitar horario'}
        keyboardAware
        fullBleedMobile
      >
        {selectedSlot && (
          <div className="px-4 pb-3 sm:px-0 sm:pb-0">
            <div className="flex flex-col gap-4">
              <header className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-extrabold text-[var(--c-ocean)]">
                  {selectedBookingMode === 'direct' ? 'Reservar horario' : 'Solicitar horario'}
                </h2>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedSlot(null)}
                  aria-label="Cerrar reserva"
                  className="grid size-10 shrink-0 place-items-center rounded-full text-[var(--c-text-2)] transition hover:bg-[var(--c-surface)] hover:text-[var(--c-ocean)] disabled:opacity-50"
                >
                  <FiX aria-hidden="true" />
                </button>
              </header>
              <section
                aria-label="Resumen del horario"
                className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)]"
              >
                <dl className="grid grid-cols-2 divide-x divide-[var(--c-border)]">
                  <div className="px-4 py-3">
                    <dt className="text-xs font-bold uppercase tracking-wider text-[var(--c-text-2)]">
                      Fecha
                    </dt>
                    <dd className="mt-1 text-lg font-extrabold text-[var(--c-ocean)]">
                      {new Date(`${selectedSlot.date}T12:00:00`).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </dd>
                  </div>
                  <div className="px-4 py-3">
                    <dt className="text-xs font-bold uppercase tracking-wider text-[var(--c-text-2)]">
                      Hora
                    </dt>
                    <dd className="mt-1 text-lg font-extrabold tabular-nums text-[var(--c-ocean)]">
                      {selectedSlot.startTime}–{selectedSlot.endTime}
                    </dd>
                  </div>
                </dl>
                <dl className="grid gap-2 border-t border-[var(--c-border)] bg-white/70 px-4 py-3 text-sm sm:grid-cols-2">
                  {selectedSlot.schoolId && (
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold text-[var(--c-text-2)]">Escuela</dt>
                      <dd className="truncate font-bold text-[var(--c-ocean)]">
                        {schoolName || schoolLabels[selectedSlot.schoolId] || 'Escuela'}
                      </dd>
                    </div>
                  )}
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold text-[var(--c-text-2)]">Entrenador</dt>
                    <dd className="truncate font-bold text-[var(--c-ocean)]">
                      {coachNames[selectedSlot.coachId] || 'Coach'}
                      {selectedSlot.groupType === 'grupal' ? ' · Grupal' : ''}
                    </dd>
                  </div>
                </dl>
              </section>
              <fieldset className="grid gap-2 text-sm">
                <legend className="mb-1 font-semibold">¿A quiénes vas a inscribir?</legend>
                {bookingParticipants.map((participant) => {
                  const alreadyBooked = isParticipantBookedInGroup(participant)
                  return (
                    <label
                      key={participant.value}
                      className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 font-semibold ${alreadyBooked ? 'cursor-not-allowed border-[var(--c-border)] bg-[var(--c-surface)] opacity-60' : 'cursor-pointer border-[var(--c-border)] bg-white has-[:checked]:border-[var(--c-aqua-strong)] has-[:checked]:bg-[var(--c-surface)]'}`}
                    >
                      <input
                        type="checkbox"
                        checked={studentIds.includes(participant.value)}
                        disabled={alreadyBooked}
                        onChange={() =>
                          setStudentIds((current) =>
                            current.includes(participant.value)
                              ? current.filter((id) => id !== participant.value)
                              : [...current, participant.value]
                          )
                        }
                        className="size-5 accent-[var(--c-aqua-strong)]"
                      />
                      <span>
                        {participant.name}
                        {participant.account ? ' (tú)' : ''}
                        {alreadyBooked ? ' · Ya inscrito' : ''}
                      </span>
                    </label>
                  )
                })}
                {bookingParticipants.length === 0 && (
                  <p className="text-[var(--c-text-2)]">
                    No hay personas disponibles para reservar en esta escuela.
                  </p>
                )}
              </fieldset>
              {participantAlreadyBookedInGroup && (
                <p role="status" className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900">
                  {bookedParticipants.map((participant) => participant.name).join(', ')} ya está
                  inscrito en esta clase grupal. Elige a otra persona para agregarla al grupo.
                </p>
              )}
              {selectedSlot.schoolId &&
                selectedParticipants.some(
                  (participant) =>
                    !participant.registered &&
                    participantReservationsAtSchool(participant).length === 0
                ) && (
                  <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    Es la primera clase para una o más personas en esta escuela; esta reservación
                    está sujeta a cambios sin previo aviso.
                  </p>
                )}
              <p className="text-sm leading-relaxed text-[var(--c-text-2)]">
                {!selectedSlot.schoolId || selectedBookingMode === 'direct'
                  ? 'La clase se agregará directamente a tu agenda.'
                  : 'La escuela debe confirmar la solicitud antes de agregar la clase.'}
              </p>
              {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
              <footer className="flex justify-end gap-2 border-t border-[var(--c-border)] pt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedSlot(null)}
                  className="min-h-10 rounded-full px-4 text-sm font-bold text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={
                    busy ||
                    (selectedSlot.schoolId
                      ? !selectedParticipants.length ||
                        selectedParticipants.every(isParticipantBookedInGroup)
                      : !selectedParticipants.length)
                  }
                  onClick={() => void submitBooking()}
                  className="min-h-10 rounded-full bg-[var(--c-ocean)] px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy
                    ? 'Enviando…'
                    : selectedBookingMode === 'direct'
                      ? 'Reservar'
                      : 'Enviar solicitud'}
                </button>
              </footer>
            </div>
          </div>
        )}
      </Sheet>
    </section>
  )
}
