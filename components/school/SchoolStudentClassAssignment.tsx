'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiUser, FiUsers } from 'react-icons/fi'
import CoachAgendaDateSelector from '@/components/coach/CoachAgendaDateSelector'
import CoachBadge from '@/components/ui/coach-badge'
import Sheet from '@/components/ui/sheet'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { CoachAgendaPayload, CoachAvailableSlot } from '@/lib/coach-agenda'
import { HOUR_STATUS_STYLE, HOUR_STATUSES, type HourStatus } from '@/lib/coach-agenda-status'
import {
  type SchoolClassOccurrence,
  type SchoolStudent,
  schoolClassDisplayTitle,
  UNASSIGNED_SCHOOL_COACH_ID,
} from '@/lib/school'

interface AssignmentSlot {
  key: string
  date: string
  startTime: string
  endTime: string
  coachId: string
  coachName: string
  groupType: 'particular' | 'grupal'
  locationName: string
  schoolClassId?: string
  schoolClassTitle?: string
  studentCount?: number
  classFull?: boolean
}

function dateInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function weekDates(date: string) {
  const selected = new Date(`${date}T12:00:00`)
  const monday = addDays(selected, -((selected.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

function slotKey(slot: Pick<AssignmentSlot, 'coachId' | 'date' | 'startTime' | 'groupType'>) {
  return `${slot.coachId}|${slot.date}|${slot.startTime}|${slot.groupType}`
}

function asAssignmentSlot(slot: CoachAvailableSlot, agenda: CoachAgendaPayload): AssignmentSlot {
  return {
    key: slotKey(slot),
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    coachId: slot.coachId,
    coachName: slot.coachName || agenda.coachNames?.[slot.coachId] || 'Profesor',
    groupType: slot.groupType,
    locationName: slot.locationName || '',
  }
}

export default function SchoolStudentClassAssignment({
  schoolId,
  timezone,
  student,
  open,
  onClose,
  onAssigned,
}: {
  schoolId: string
  timezone: string
  student: SchoolStudent
  open: boolean
  onClose: () => void
  onAssigned: () => void
}) {
  const [view, setView] = useState<'vertical' | 'horizontal'>('vertical')
  const [date, setDate] = useState(() => dateInTimezone(timezone))
  const [agenda, setAgenda] = useState<CoachAgendaPayload | null>(null)
  const [classes, setClasses] = useState<SchoolClassOccurrence[]>([])
  const [selectedSlots, setSelectedSlots] = useState<AssignmentSlot[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<Set<HourStatus>>(
    () => new Set(HOUR_STATUSES)
  )
  const [loadingError, setLoadingError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const month = date.slice(0, 7)

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt retries the current schedule.
  useEffect(() => {
    let active = true
    setAgenda(null)
    setLoadingError(false)
    Promise.all([
      getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/agenda?month=${month}`).then((r) =>
        r.json()
      ),
      getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/classes`).then((r) => r.json()),
    ])
      .then(
        ([agendaPayload, classPayload]: [
          CoachAgendaPayload,
          { classes?: SchoolClassOccurrence[] },
        ]) => {
          if (!active) return
          setAgenda(agendaPayload)
          setClasses(classPayload.classes || [])
        }
      )
      .catch(() => {
        if (active) setLoadingError(true)
      })
    return () => {
      active = false
    }
  }, [schoolId, month, attempt])

  const availableSlots = useMemo(() => {
    if (!agenda) return []
    const slots = new Map<string, AssignmentSlot>()
    for (const slot of agenda.availableSlots) {
      if (slot.status === 'available') {
        const normalized = asAssignmentSlot(slot, agenda)
        slots.set(normalized.key, normalized)
      }
    }
    for (const item of agenda.bookings) {
      if (
        item.schoolClassId &&
        item.groupType === 'grupal' &&
        item.status !== 'cancelled' &&
        !item.classFull &&
        !item.schoolClassStudentIds?.includes(student.id) &&
        !classes.some(
          (classItem) =>
            classItem.id === item.schoolClassId && classItem.studentIds.includes(student.id)
        )
      ) {
        const slot: AssignmentSlot = {
          key: `${item.coachId}|${item.date}|${item.startTime}|grupal`,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          coachId: item.coachId,
          coachName: item.coachName || agenda.coachNames?.[item.coachId] || 'Profesor',
          groupType: 'grupal',
          locationName: item.locationName || '',
          schoolClassId: item.schoolClassId,
          schoolClassTitle: item.schoolClassTitle || 'Clase grupal',
          studentCount: item.schoolClassStudentCount,
          classFull: item.classFull,
        }
        slots.set(slot.key, slot)
      }
    }
    for (const item of classes) {
      if (
        item.type !== 'group' ||
        (item.status !== 'scheduled' && item.status !== 'pending') ||
        item.date < dateInTimezone(timezone) ||
        item.classFull ||
        item.studentIds.includes(student.id)
      )
        continue
      const coachId = item.teacherIds[0] || UNASSIGNED_SCHOOL_COACH_ID
      const key = `${coachId}|${item.date}|${item.startTime}|grupal`
      const current = slots.get(key)
      slots.set(key, {
        key,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        coachId,
        coachName: agenda.coachNames?.[coachId] || 'Sin profe aún',
        groupType: 'grupal',
        locationName: item.location || '',
        schoolClassId: item.id,
        schoolClassTitle: schoolClassDisplayTitle(item.title),
        studentCount: item.studentIds.length,
        classFull: item.classFull,
      })
      if (!current) continue
    }
    return [...slots.values()].sort((a, b) =>
      `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
    )
  }, [agenda, classes, student.id, timezone])

  const daySlots = availableSlots.filter((slot) => slot.date === date)
  const days = weekDates(date)
  const dayStatuses = useMemo(() => {
    const statuses = new Map<string, HourStatus[]>()
    const push = (key: string, status: HourStatus) => {
      statuses.set(key, [...(statuses.get(key) || []), status])
    }
    for (const slot of agenda?.availableSlots || []) {
      if (slot.status === 'blocked') push(slot.date, 'blocked')
      else if (slot.groupType === 'grupal')
        push(slot.date, slot.status === 'available' ? 'groupAvailable' : 'group')
      else push(slot.date, slot.status === 'available' ? 'available' : 'booked')
    }
    for (const item of agenda?.bookings || []) {
      if (item.status === 'cancelled') continue
      push(
        item.date,
        item.groupType === 'grupal' ? (item.classFull ? 'group' : 'groupAvailable') : 'booked'
      )
    }
    for (const block of agenda?.blocks || []) {
      if (!block.allDay && !block.hidden) push(block.date, 'blocked')
    }
    return statuses
  }, [agenda])

  function toggleSlot(slot: AssignmentSlot) {
    setSelectedSlots((current) =>
      current.some((item) => item.key === slot.key)
        ? current.filter((item) => item.key !== slot.key)
        : [...current, slot]
    )
  }

  async function assign() {
    if (!selectedSlots.length || saving) return
    setSaving(true)
    setSaveError(false)
    setNotice('')
    try {
      const response = await postAuthed(
        `/api/schools/${encodeURIComponent(schoolId)}/students/${encodeURIComponent(student.id)}/classes`,
        {
          slots: selectedSlots.map(
            ({ date: slotDate, startTime, endTime, coachId, groupType, schoolClassId }) => ({
              date: slotDate,
              startTime,
              endTime,
              coachId,
              groupType,
              ...(schoolClassId ? { schoolClassId } : {}),
            })
          ),
        }
      )
      const result = (await response.json()) as { assignedCount?: number; failedKeys?: string[] }
      const failedKeys = result.failedKeys || []
      const succeededCount = result.assignedCount || 0
      if (!response.ok || succeededCount === 0) {
        setSaveError(true)
      } else {
        setNotice(`Se asignó a ${succeededCount} ${succeededCount === 1 ? 'clase' : 'clases'}.`)
        onAssigned()
        setAttempt((value) => value + 1)
      }
      setSelectedSlots((current) => current.filter((slot) => failedKeys.includes(slot.key)))
      if (failedKeys.length) setSaveError(true)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={`Asignar clases a ${student.name}`}
      keyboardAware
      fullBleedMobile
      modalTopGap
      size="xl"
    >
      <div className="flex min-h-0 flex-col gap-3 px-4 pb-3 sm:px-0 sm:pb-0">
        <div className="shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-(--c-ocean)">Asignar clases</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-(--c-text-2)">Vista</span>
              <fieldset
                aria-label="Visualización de horarios"
                className="inline-flex rounded-full border border-(--c-border) bg-(--c-surface) p-0.5"
              >
                {(['vertical', 'horizontal'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-label={option === 'vertical' ? 'Vista vertical' : 'Vista horizontal'}
                    title={option === 'vertical' ? 'Vista vertical' : 'Vista horizontal'}
                    aria-pressed={view === option}
                    onClick={() => setView(option)}
                    className={`grid size-8 place-items-center rounded-full text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${view === option ? 'bg-(--c-ocean) text-white' : 'text-(--c-ocean) hover:bg-white'}`}
                  >
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      {option === 'vertical' ? (
                        <path d="M5 4v12M10 4v12M15 4v12" />
                      ) : (
                        <path d="M4 7h12M4 13h12" />
                      )}
                    </svg>
                  </button>
                ))}
              </fieldset>
            </div>
          </div>
          <p className="mt-1 text-sm text-(--c-text-2)">
            {student.name} · Selecciona uno o varios horarios grupales o particulares.
          </p>
        </div>
        {loadingError ? (
          <div role="alert" className="text-sm text-(--c-text-2)">
            <p>No pudimos cargar los horarios disponibles.</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="btn btn-outline mt-2 min-h-11"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {view === 'vertical' ? (
              <>
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
                  onSelectDate={(selectedDate) => setDate(selectedDate)}
                  onChangeWeek={(delta) =>
                    setDate(dateKey(addDays(new Date(`${date}T12:00:00`), delta * 7)))
                  }
                />
                <h3 className="shrink-0 text-sm font-bold capitalize text-(--c-ocean)">
                  Horarios disponibles ·{' '}
                  {new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                <div className="max-h-[min(35dvh,22rem)] overflow-y-auto overscroll-contain rounded-2xl border border-(--c-border) bg-white">
                  {daySlots.length ? (
                    daySlots.map((slot) => {
                      const selected = selectedSlots.some((item) => item.key === slot.key)
                      return (
                        <div
                          key={slot.key}
                          className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-(--c-border) px-3 py-2.5 last:border-b-0"
                        >
                          <strong className="text-sm tabular-nums text-(--c-ocean)">
                            {slot.startTime}
                          </strong>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-(--c-ocean)">
                              <span className="inline-flex w-28 shrink-0 [&>span]:h-6 [&>span]:w-full">
                                <CoachBadge
                                  name={slot.coachName}
                                  unassigned={slot.coachId === UNASSIGNED_SCHOOL_COACH_ID}
                                />
                              </span>
                              {slot.groupType === 'grupal' ? 'Grupal' : 'Particular'}
                              {slot.groupType === 'grupal' ? (
                                <FiUsers aria-hidden="true" className="size-4 shrink-0" />
                              ) : (
                                <FiUser aria-hidden="true" className="size-4 shrink-0" />
                              )}
                            </p>
                            <p className="truncate text-xs text-(--c-text-2)">
                              {slot.locationName.trim() &&
                              slot.locationName.trim().toLocaleLowerCase('es') !==
                                'lugar por definir'
                                ? ` · ${slot.locationName}`
                                : ''}
                              {typeof slot.studentCount === 'number'
                                ? ` · ${slot.studentCount} alumnos`
                                : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleSlot(slot)}
                            disabled={saving}
                            aria-pressed={selected}
                            className={`min-h-10 whitespace-nowrap rounded-full px-3 text-xs font-bold sm:px-4 sm:text-sm ${selected ? 'bg-(--c-ocean) text-white' : 'border border-(--c-border) text-(--c-ocean)'}`}
                          >
                            {selected ? 'Seleccionado' : 'Seleccionar'}
                          </button>
                        </div>
                      )
                    })
                  ) : (
                    <p className="p-4 text-sm text-(--c-text-2)">
                      {agenda
                        ? 'No hay horarios disponibles este día. Elige otra fecha.'
                        : 'Cargando horarios…'}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">Horarios disponibles</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Semana anterior"
                      className="btn btn-outline min-h-11 px-3"
                      onClick={() => setDate(dateKey(addDays(new Date(`${date}T12:00:00`), -7)))}
                    >
                      ‹
                    </button>
                    <span className="text-xs font-semibold">
                      {days[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} →{' '}
                      {days[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </span>
                    <button
                      type="button"
                      aria-label="Semana siguiente"
                      className="btn btn-outline min-h-11 px-3"
                      onClick={() => setDate(dateKey(addDays(new Date(`${date}T12:00:00`), 7)))}
                    >
                      ›
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 rounded-2xl border border-(--c-border) bg-(--c-surface) p-3 sm:p-4">
                  {!agenda && <p className="text-sm">Cargando horarios…</p>}
                  {days.map((day) => {
                    const slots = availableSlots.filter((slot) => slot.date === dateKey(day))
                    if (!slots.length) return null
                    return (
                      <div
                        key={dateKey(day)}
                        className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-2"
                      >
                        <div className="py-2">
                          <h4 className="text-sm font-bold capitalize">
                            {day.toLocaleDateString('es-MX', { weekday: 'long' })}
                          </h4>
                          <p className="text-xs text-(--c-text-2)">
                            {day.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[...new Set(slots.map((slot) => slot.startTime))].map((time) => (
                            <div
                              key={time}
                              className="rounded-xl border border-(--c-border) bg-white p-1"
                            >
                              <div className="flex gap-1">
                                {slots
                                  .filter((slot) => slot.startTime === time)
                                  .map((slot) => {
                                    const selected = selectedSlots.some(
                                      (item) => item.key === slot.key
                                    )
                                    const details = `${slot.startTime}–${slot.endTime} · ${slot.groupType} · ${slot.coachName}${slot.locationName.trim() && slot.locationName.trim().toLocaleLowerCase('es') !== 'lugar por definir' ? ` · ${slot.locationName}` : ''}`
                                    return (
                                      <button
                                        key={slot.key}
                                        type="button"
                                        disabled={saving}
                                        aria-pressed={selected}
                                        aria-label={`${day.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} · ${details}`}
                                        title={details}
                                        onClick={() => toggleSlot(slot)}
                                        className={`min-h-9 rounded-xl border px-2 py-1 text-xs font-bold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50 ${HOUR_STATUS_STYLE[slot.groupType === 'grupal' ? 'groupAvailable' : 'available'].border} ${selected ? 'bg-(--c-ocean) text-white ring-1 ring-(--c-ocean)' : 'bg-white text-(--c-ocean) hover:bg-(--c-surface)'}`}
                                      >
                                        <span className="mb-0.5 flex items-center justify-center gap-1 [&>span]:size-3 [&>span]:text-[7px]">
                                          <CoachBadge
                                            name={slot.coachName}
                                            unassigned={slot.coachId === UNASSIGNED_SCHOOL_COACH_ID}
                                            avatarOnly
                                          />
                                          <span
                                            aria-hidden="true"
                                            className="inline-flex size-3 items-center justify-center"
                                          >
                                            {slot.groupType === 'grupal' && (
                                              <FiUsers className="size-3" />
                                            )}
                                          </span>
                                        </span>
                                      </button>
                                    )
                                  })}
                              </div>
                              <span className="block pt-0.5 text-center text-xs font-bold tabular-nums">
                                {time}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {agenda &&
                    !availableSlots.some((slot) =>
                      days.some((day) => dateKey(day) === slot.date)
                    ) && (
                      <p className="text-sm text-(--c-text-2)">
                        No hay horarios disponibles esta semana. Elige otra semana.
                      </p>
                    )}
                </div>
              </>
            )}
            {selectedSlots.length > 0 && (
              <p className="shrink-0 text-sm font-semibold text-(--c-ocean)">
                {selectedSlots.length}{' '}
                {selectedSlots.length === 1 ? 'horario seleccionado' : 'horarios seleccionados'}
              </p>
            )}
            {notice && (
              <p role="status" className="shrink-0 text-sm font-semibold text-(--c-ocean)">
                {notice}
              </p>
            )}
            {saveError && (
              <p role="alert" className="shrink-0 text-sm text-(--c-error,#b91c1c)">
                No se pudo asignar a todos los horarios. Revisa la disponibilidad e inténtalo de
                nuevo.
              </p>
            )}
            <div className="sticky bottom-0 shrink-0 border-t border-(--c-border) bg-white py-3">
              <button
                type="button"
                onClick={() => void assign()}
                disabled={saving || selectedSlots.length === 0}
                className="btn btn-primary min-h-11 w-full gap-2 disabled:opacity-50"
              >
                <span aria-hidden="true">＋</span>
                {saving ? 'Asignando…' : `Asignar a ${selectedSlots.length} clases`}
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
