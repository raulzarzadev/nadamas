'use client'

import Sheet from '@comps/ui/sheet'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiUsers, FiX } from 'react-icons/fi'
import CoachAgendaDateSelector from '@/components/coach/CoachAgendaDateSelector'
import type { SchoolAccessClient } from '@/components/school/useSchoolSelection'
import { useUser } from '@/context/UserContext'
import type { CoachPublic } from '@/firebase/coaches/coach.model'
import { auth } from '@/firebase/index'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { CoachAgendaPayload, CoachAvailableSlot } from '@/lib/coach-agenda'
import type { HourStatus } from '@/lib/coach-agenda-status'
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
const EMPTY_SCHOOLS: SchoolAccessClient[] = []
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

export default function AthleteSchoolSchedule({
  schoolId,
  schoolName,
  bookingMode,
  schools = EMPTY_SCHOOLS,
}: {
  schoolId: string | null
  schoolName?: string
  bookingMode: SchoolBookingMode
  schools?: SchoolAccessClient[]
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
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()))
  const [agenda, setAgenda] = useState<CoachAgendaPayload | null>(null)
  const [students, setStudents] = useState<Array<SchoolStudent & { schoolId?: string }>>([])
  const [coachFilter, setCoachFilter] = useState('all')
  const [selectedSlot, setSelectedSlot] = useState<CoachAvailableSlot | null>(null)
  const [studentId, setStudentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [bookerName, setBookerName] = useState('')
  const month = selectedDate.slice(0, 7)

  useEffect(() => {
    if (accountName) setBookerName(accountName)
  }, [accountName])

  const load = useCallback(async () => {
    setError('')
    try {
      if (schoolId) {
        const [agendaResponse, studentsResponse] = await Promise.all([
          getAuthed(
            `/api/schools/${encodeURIComponent(schoolId)}/agenda?month=${month}&view=public`
          ),
          getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/students`),
        ])
        const [agendaPayload, studentsPayload] = await Promise.all([
          agendaResponse.json() as Promise<CoachAgendaPayload>,
          studentsResponse.json() as Promise<{ students?: SchoolStudent[] }>,
        ])
        setAgenda(agendaPayload)
        setStudents((studentsPayload.students || []).map((student) => ({ ...student, schoolId })))
        return
      }

      const [schoolsData, directoryResponse] = await Promise.all([
        Promise.all(
          schools.map(async ({ school }) => {
            const [response, studentResponse] = await Promise.all([
              getAuthed(
                `/api/schools/${encodeURIComponent(school.id)}/agenda?month=${month}&view=public`
              ),
              getAuthed(`/api/schools/${encodeURIComponent(school.id)}/students`),
            ])
            const [agenda, studentPayload] = await Promise.all([
              response.json() as Promise<CoachAgendaPayload>,
              studentResponse.json() as Promise<{ students?: SchoolStudent[] }>,
            ])
            return { school, agenda, students: studentPayload.students || [] }
          })
        ),
        fetch('/api/public/coaches'),
      ])
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
      const names: Record<string, string> = {}
      const schoolLabels: Record<string, string> = {}
      for (const { school, agenda: payload } of schoolsData) {
        Object.assign(names, payload.coachNames || {})
        schoolLabels[school.id] = school.name
        allSlots.push(...payload.availableSlots.map((slot) => ({ ...slot, schoolId: school.id })))
      }
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
      setStudents([])
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
  const visibleSlots = (agenda?.availableSlots || []).filter(
    (slot) =>
      slot.status === 'available' &&
      slotIsFuture(slot) &&
      (coachFilter === 'all' || slot.coachId === coachFilter)
  )
  const coachIdsWithSlots = new Set(
    (agenda?.availableSlots || [])
      .filter((slot) => slot.status === 'available' && slotIsFuture(slot))
      .map((slot) => slot.coachId)
  )
  const coaches = Object.entries(coachNames)
    .filter(([id]) => coachIdsWithSlots.has(id))
    .sort((a, b) => a[1].localeCompare(b[1]))
  const selectedBookingMode: SchoolBookingMode = schoolId
    ? bookingMode
    : selectedSlot?.schoolId
      ? schools.find(({ school }) => school.id === selectedSlot.schoolId)?.school.bookingMode ||
        'request'
      : 'direct'
  const slotStudents = selectedSlot?.schoolId
    ? students.filter((student) => student.schoolId === selectedSlot.schoolId)
    : []
  const dayStatuses = useMemo(() => {
    const result = new Map<string, HourStatus[]>()
    for (const slot of visibleSlots) {
      const statuses = result.get(slot.date) || []
      statuses.push(slot.groupType === 'grupal' ? 'groupAvailable' : 'available')
      result.set(slot.date, statuses)
    }
    for (const statuses of result.values()) statuses.sort()
    return result
  }, [visibleSlots])
  const monthAvailable = visibleSlots.filter((slot) => slot.date.startsWith(month)).length
  const weekAvailable = visibleSlots.filter((slot) =>
    week.some((date) => dateKey(date) === slot.date)
  ).length
  const changeWeek = (delta: number) => {
    const date = new Date(`${selectedDate}T12:00:00`)
    date.setDate(date.getDate() + delta * 7)
    setSelectedDate(dateKey(date))
  }
  const changeMonth = (delta: number) => {
    const date = new Date(`${selectedDate}T12:00:00`)
    setSelectedDate(dateKey(new Date(date.getFullYear(), date.getMonth() + delta, 1)))
  }
  const slots = visibleSlots
    .filter((slot) => slot.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const slotGroups = slots.reduce<Array<{ startTime: string; slots: CoachAvailableSlot[] }>>(
    (groups, slot) => {
      const group = groups.find((item) => item.startTime === slot.startTime)
      if (group) group.slots.push(slot)
      else groups.push({ startTime: slot.startTime, slots: [slot] })
      return groups
    },
    []
  )

  async function submitBooking() {
    if (!selectedSlot || !studentId) return
    setBusy(true)
    setError('')
    try {
      const day = new Date(`${selectedSlot.date}T12:00:00`).getDay()
      if (!selectedSlot.schoolId) {
        const response = await postAuthed('/api/bookings', {
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
          athleteProfile: { name: bookerName.trim() },
        })
        if (!response.ok) throw new Error('No se pudo reservar el horario.')
        setSelectedSlot(null)
        setMessage('Clase reservada. Ya aparece en Mis clases.')
        return
      }
      const result = await postAuthed(
        `/api/schools/${encodeURIComponent(selectedSlot.schoolId)}/class-requests`,
        {
          studentId,
          teacherId: selectedSlot.coachId,
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
            (schools.find(({ school }) => school.id === selectedSlot.schoolId)?.school
              .bookingMode || bookingMode) === 'direct',
        }
      )
      setSelectedSlot(null)
      setMessage(
        (schools.find(({ school }) => school.id === selectedSlot.schoolId)?.school.bookingMode ||
          bookingMode) === 'direct'
          ? 'Clase reservada. Ya aparece en Mis clases.'
          : 'Solicitud enviada. La escuela te confirmará el horario.'
      )
      if (result.ok) await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo completar la inscripción.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap items-center gap-2" aria-label="Filtrar por entrenador">
        <legend className="sr-only">Filtrar por entrenador</legend>
        <button
          type="button"
          onClick={() => setCoachFilter('all')}
          className={`rounded-full border px-4 py-2 text-sm font-bold ${coachFilter === 'all' ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white' : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)]'}`}
        >
          Todos
        </button>
        {coaches.map(([id, name]) => (
          <button
            key={id}
            type="button"
            onClick={() => setCoachFilter(id)}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${coachFilter === id ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white' : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)]'}`}
          >
            {name}
          </button>
        ))}
      </fieldset>
      <CoachAgendaDateSelector
        selectedDate={selectedDate}
        weekDates={week}
        dayStatuses={dayStatuses}
        monthCount={`0/${monthAvailable}`}
        weekCount={`0/${weekAvailable}`}
        onSelectDate={setSelectedDate}
        onChangeMonth={changeMonth}
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
      ) : slots.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-[var(--c-text-2)]">
          No hay horarios disponibles para este día.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-white">
          {slotGroups.map((group) => (
            <div
              key={group.startTime}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 border-b border-[var(--c-border)] px-4 py-2.5 last:border-b-0"
            >
              <span className="w-14 shrink-0 pt-2 text-sm font-bold text-[var(--c-ocean)]">
                {group.startTime}
              </span>
              <div className="grid min-w-0 grid-cols-1 gap-2">
                {group.slots.map((slot) => (
                  <button
                    key={`${slot.coachId}-${slot.id}`}
                    type="button"
                    aria-label={`Elegir ${coachNames[slot.coachId] || 'Coach'}, ${slot.startTime}–${slot.endTime}${slot.groupType === 'grupal' ? ', clase grupal' : ''}`}
                    onClick={() => {
                      setSelectedSlot(slot)
                      setStudentId(
                        students.find((student) => student.schoolId === slot.schoolId)?.id || ''
                      )
                      setBookerName(accountName)
                    }}
                    className={`flex min-h-10 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition hover:brightness-[0.98] ${slot.groupType === 'grupal' ? 'border-violet-400 bg-violet-50' : 'border-emerald-400 bg-white'}`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {[
                        coachNames[slot.coachId] || 'Coach',
                        slot.schoolId ? schoolLabels[slot.schoolId] : '',
                        `${slotDurationMinutes(slot)} min`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {slot.groupType === 'grupal' && (
                      <FiUsers className="shrink-0 text-violet-600" aria-hidden="true" />
                    )}
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
      >
        {selectedSlot && (
          <div className="flex flex-col gap-4">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--c-ocean)]">
                  {selectedBookingMode === 'direct' ? 'Reservar horario' : 'Solicitar horario'}
                </h2>
                <p className="mt-1 text-sm text-[var(--c-text-2)]">
                  {coachNames[selectedSlot.coachId] || 'Coach'} · {selectedSlot.date} ·{' '}
                  {selectedSlot.startTime}–{selectedSlot.endTime}
                  {selectedSlot.groupType === 'grupal' ? ' · Grupal' : ''}
                </p>
              </div>
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
            {selectedSlot.schoolId && (
              <p className="w-fit rounded-full bg-[var(--c-surface)] px-3 py-1 text-xs font-bold text-[var(--c-ocean)]">
                Escuela: {schoolName || schoolLabels[selectedSlot.schoolId] || 'Escuela'}
              </p>
            )}
            {selectedSlot.schoolId ? (
              <label htmlFor="booking-student" className="grid gap-1.5 text-sm font-semibold">
                Alumno
                <select
                  id="booking-student"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  className="min-h-11 rounded-xl border border-[var(--c-border)] bg-white px-3 text-[var(--c-ocean)] outline-none focus:border-[var(--c-aqua-strong)] focus:ring-2 focus:ring-[var(--c-aqua)]"
                >
                  {slotStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                      {student.accountParticipant ? ' (tú)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : accountName ? (
              <p className="text-sm text-[var(--c-text-2)]">
                Reservarás con tu cuenta de{' '}
                <span className="font-semibold text-[var(--c-ocean)]">{accountName}</span>.
              </p>
            ) : (
              <label htmlFor="booking-student" className="grid gap-1.5 text-sm font-semibold">
                Tu nombre
                <input
                  id="booking-student"
                  required
                  value={bookerName}
                  onChange={(event) => setBookerName(event.target.value)}
                  className="min-h-11 rounded-xl border border-[var(--c-border)] px-3 outline-none focus:border-[var(--c-aqua-strong)] focus:ring-2 focus:ring-[var(--c-aqua)]"
                  autoComplete="name"
                />
              </label>
            )}
            {selectedSlot.schoolId && slotStudents.length === 0 && (
              <p className="mt-2 text-sm text-rose-600">
                Necesitas tener un alumno registrado en esta escuela.
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
                disabled={busy || (selectedSlot.schoolId ? !studentId : !bookerName.trim())}
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
        )}
      </Sheet>
    </section>
  )
}
