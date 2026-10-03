'use client'

import { useEffect, useState } from 'react'
import CoachAgendaDateSelector from '@/components/coach/CoachAgendaDateSelector'
import Sheet from '@/components/ui/sheet'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import type { CoachAgendaPayload, CoachAvailableSlot } from '@/lib/coach-agenda'
import { HOUR_STATUSES, type HourStatus } from '@/lib/coach-agenda-status'
import type { Booking } from '@/lib/coach-booking'
import { capitalizeSchoolTerm } from '@/lib/school'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

type DestinationSlot = Pick<
  CoachAvailableSlot,
  'coachId' | 'date' | 'startTime' | 'endTime' | 'groupType' | 'status'
> & { schoolClassId?: string }

function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function weekDates(date: string) {
  const selectedDate = new Date(`${date}T12:00:00`)
  const monday = addDays(selectedDate, -((selectedDate.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export default function SchoolReassignStudent({
  schoolId,
  booking,
  schoolClassId,
  studentId,
  studentName,
  onClose,
  onSaved,
}: {
  schoolId: string
  booking: Booking
  schoolClassId?: string
  studentId?: string
  studentName?: string
  onClose: () => void
  onSaved: () => void
}) {
  const terminology = useSchoolTerminology()
  const participantSingular = terminology.schoolId ? terminology.participantSingular : 'alumno'
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'
  const [date, setDate] = useState(booking.date)
  const [agenda, setAgenda] = useState<CoachAgendaPayload>()
  const [destination, setDestination] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<Set<HourStatus>>(
    () => new Set(HOUR_STATUSES)
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const month = date.slice(0, 7)
  useEffect(() => {
    let active = true
    setAgenda(undefined)
    setError(null)
    getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/agenda?month=${month}`)
      .then((response) => response.json())
      .then((payload) => {
        if (active) setAgenda(payload)
      })
      .catch((err) => {
        reportInternalError('SCHOOL_REASSIGN_LOAD', err)
        if (active) setError(GENERIC_USER_ERROR)
      })
    return () => {
      active = false
    }
  }, [schoolId, month])
  function destinationsForDate(targetDate: string): DestinationSlot[] {
    const slots = new Map<string, DestinationSlot>()
    for (const slot of agenda?.availableSlots || []) {
      if (slot.date === targetDate && slot.status !== 'blocked')
        slots.set(`${slot.coachId}|${slot.startTime}`, slot)
    }
    for (const item of agenda?.bookings || []) {
      if (item.date === targetDate && item.status !== 'cancelled')
        slots.set(`${item.coachId}|${item.startTime}`, {
          ...item,
          schoolClassId: item.schoolClassId,
          status: 'booked',
        })
    }
    return [...slots.values()]
      .filter((slot) => {
        if (studentId && (!slot.schoolClassId || slot.groupType !== 'grupal')) return false
        if (
          schoolClassId &&
          (slot.schoolClassId === schoolClassId ||
            (slot.schoolClassId && slot.groupType !== 'grupal') ||
            (slot.status !== 'available' && !slot.schoolClassId))
        )
          return false
        if (
          slot.coachId === booking.coachId &&
          targetDate === booking.date &&
          slot.startTime === booking.startTime
        )
          return false
        const classmates = (agenda?.bookings || []).filter(
          (item) =>
            item.coachId === slot.coachId &&
            item.date === targetDate &&
            item.startTime === slot.startTime &&
            item.status !== 'cancelled'
        )
        if (
          (agenda?.blocks || []).some(
            (block) =>
              block.coachId === slot.coachId &&
              block.date === targetDate &&
              (block.allDay ||
                (block.startTime &&
                  block.endTime &&
                  block.startTime < slot.endTime &&
                  slot.startTime < block.endTime))
          )
        )
          return false
        const classIsFull = classmates.some((item) => item.classFull)
        const duplicateStudent = classmates.some(
          (item) =>
            item.athleteId === (studentId || booking.athleteId) ||
            Boolean(studentId && item.schoolClassStudentIds?.includes(studentId))
        )
        return (
          !classIsFull &&
          !duplicateStudent &&
          (slot.groupType === 'grupal' || classmates.length === 0)
        )
      })
      .sort((a, b) => `${a.startTime}|${a.coachId}`.localeCompare(`${b.startTime}|${b.coachId}`))
  }
  const available = destinationsForDate(date)
  const days = weekDates(date)
  const statusEntries = new Map<string, { time: string; status: HourStatus }[]>()
  const pushStatus = (targetDate: string, time: string, status: HourStatus) => {
    const entries = statusEntries.get(targetDate) || []
    entries.push({ time, status })
    statusEntries.set(targetDate, entries)
  }
  const activeBookings = (agenda?.bookings || []).filter((item) => item.status !== 'cancelled')
  const bookingsByTime = new Map<string, typeof activeBookings>()
  for (const item of activeBookings) {
    const key = `${item.coachId}|${item.date}|${item.startTime}`
    const entries = bookingsByTime.get(key) || []
    entries.push(item)
    bookingsByTime.set(key, entries)
  }
  for (const items of bookingsByTime.values()) {
    const item = items[0]
    if (item)
      pushStatus(
        item.date,
        item.startTime,
        items.length > 1 || item.groupType === 'grupal' ? 'group' : 'booked'
      )
  }
  const bookedKeys = new Set(
    activeBookings.map((item) => `${item.coachId}|${item.date}|${item.startTime}`)
  )
  const slotKeys = new Set<string>()
  const groupSlotKeys = new Set<string>()
  for (const slot of agenda?.availableSlots || []) {
    const key = `${slot.coachId}|${slot.date}|${slot.startTime}`
    slotKeys.add(key)
    if (slot.groupType === 'grupal') groupSlotKeys.add(key)
    if (slot.status === 'available')
      pushStatus(
        slot.date,
        slot.startTime,
        slot.groupType === 'grupal' ? 'groupAvailable' : 'available'
      )
  }
  for (const block of agenda?.blocks || []) {
    if (block.allDay || block.hidden) continue
    const key = `${block.coachId}|${block.date}|${block.startTime || ''}`
    if (groupSlotKeys.has(key) || bookedKeys.has(key) || !slotKeys.has(key)) continue
    pushStatus(block.date, block.startTime || '', 'blocked')
  }
  const dayStatuses = new Map(
    [...statusEntries].map(([targetDate, entries]) => [
      targetDate,
      entries.sort((a, b) => a.time.localeCompare(b.time)).map((entry) => entry.status),
    ])
  )
  const destinationKey = (slot: DestinationSlot) => `${slot.coachId}|${slot.date}|${slot.startTime}`

  async function save(slot: DestinationSlot) {
    if (!slot) return
    setBusy(true)
    setError(null)
    try {
      if (schoolClassId && studentId && slot.schoolClassId) {
        await postAuthed(
          `/api/schools/${encodeURIComponent(schoolId)}/classes/${encodeURIComponent(schoolClassId)}/students/${encodeURIComponent(studentId)}/move`,
          { destinationSchoolClassId: slot.schoolClassId }
        )
      } else if (schoolClassId && slot.schoolClassId) {
        await postAuthed(`/api/schools/${encodeURIComponent(schoolId)}/agenda/reassign`, {
          schoolClassId,
          destinationSchoolClassId: slot.schoolClassId,
          coachId: slot.coachId,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        })
      } else if (schoolClassId) {
        await patchAuthed(
          `/api/schools/${encodeURIComponent(schoolId)}/classes/${encodeURIComponent(schoolClassId)}`,
          {
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            type: slot.groupType === 'grupal' ? 'group' : 'individual',
            teacherIds: [slot.coachId],
          }
        )
      } else {
        await postAuthed(`/api/schools/${encodeURIComponent(schoolId)}/agenda/reassign`, {
          bookingId: booking.id,
          coachId: slot.coachId,
          date,
          startTime: slot.startTime,
        })
      }
      onSaved()
    } catch (err) {
      reportInternalError('SCHOOL_REASSIGN_SAVE', err)
      setError(
        `No pudimos reasignar el registro. Revisa que la clase siga disponible e inténtalo de nuevo.`
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      open
      keyboardAware
      fullBleedMobile
      modalTopGap
      onClose={() => {
        if (!busy) onClose()
      }}
      label={schoolClassId ? 'Cambiar clase' : `Reasignar ${participantSingular}`}
    >
      <div className="flex flex-col gap-3 px-3 sm:px-0">
        <h3 className="text-xl font-bold text-(--c-ocean)">
          {schoolClassId ? 'Cambiar clase de' : `Reasignar a`}{' '}
          {studentName || booking.athleteName}
        </h3>
        <CoachAgendaDateSelector
          selectedDate={date}
          weekDates={days}
          dayStatuses={dayStatuses}
          selectedStatuses={selectedStatuses}
          onToggleStatus={(status) =>
            setSelectedStatuses((current) => {
              const next = new Set(current)
              if (next.has(status)) next.delete(status)
              else next.add(status)
              return next
            })
          }
          onSelectDate={(key) => {
            if (busy) return
            setDate(key)
            setDestination('')
          }}
          onChangeWeek={(delta) => {
            if (busy) return
            setDate(dateKey(addDays(new Date(`${date}T12:00:00`), delta * 7)))
            setDestination('')
          }}
        />
        <h4 className="text-sm font-bold capitalize text-(--c-ocean)">
          Horarios disponibles ·{' '}
          {new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </h4>
        <div className="max-h-[min(42dvh,24rem)] overflow-y-auto overscroll-contain rounded-2xl border border-(--c-border) bg-white">
          {available.map((slot) => {
            const key = destinationKey(slot)
            const selected = destination === key
            const groupClass = slot.groupType === 'grupal'
            return (
              <div
                key={key}
                className={`grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1 border-b px-2.5 py-2 last:border-b-0 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-3 ${groupClass ? 'border-violet-200' : 'border-emerald-200'}`}
              >
                <strong className="row-span-2 text-sm tabular-nums text-(--c-ocean) sm:row-span-1">
                  {slot.startTime}
                </strong>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight text-(--c-ocean)">
                    {agenda?.coachNames?.[slot.coachId] || capitalizeSchoolTerm(coachSingular)}
                  </p>
                  <p className="text-xs leading-tight text-(--c-text-2)">
                    {slot.startTime}–{slot.endTime} · {groupClass ? 'Grupal' : 'Particular'}
                    {slot.schoolClassId ? ' · Grupo existente' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDestination(key)}
                  disabled={busy}
                  className={`col-start-2 min-h-9 justify-self-end whitespace-nowrap rounded-full px-3 text-xs font-bold sm:col-start-auto sm:min-h-10 sm:px-4 sm:text-sm ${selected ? 'bg-(--c-ocean) text-white' : 'border border-(--c-border) text-(--c-ocean)'}`}
                >
                  {selected ? 'Seleccionado' : 'Seleccionar'}
                </button>
              </div>
            )
          })}
          {agenda && available.length === 0 && (
            <p className="p-4 text-sm text-(--c-text-2)">
              No hay clases disponibles en esta fecha. Elige otro día.
            </p>
          )}
          {!agenda && <p className="p-4 text-sm text-(--c-text-2)">Cargando horarios…</p>}
        </div>
        <p className="text-sm text-(--c-text-2)">
          {schoolClassId
            ? 'La clase cambiará de horario o se unirá al grupo seleccionado.'
            : 'Al cambiar la clase, la asistencia y evaluación anteriores se conservarán en el historial.'}
        </p>
        {error && (
          <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
            {error}
          </p>
        )}
        <div className="flex gap-2 bg-white py-3">
          <button
            type="button"
            className="btn btn-primary min-h-11 flex-1"
            disabled={busy || !destination || !agenda}
            onClick={() => {
              const slot = available.find((item) => destinationKey(item) === destination)
              if (slot) void save(slot)
            }}
          >
            {busy
              ? 'Guardando…'
              : schoolClassId
                ? 'Cambiar clase'
                : `Reasignar ${participantSingular}`}
          </button>
          <button
            type="button"
            className="btn btn-ghost min-h-11"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </Sheet>
  )
}
