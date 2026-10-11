'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiCheckCircle, FiUser, FiUsers } from 'react-icons/fi'
import CoachAgenda from '@/components/coach/CoachAgenda'
import ScheduleViews from '@/components/schedule/ScheduleViews'
import CoachBadge from '@/components/ui/coach-badge'
import Sheet from '@/components/ui/sheet'
import StatusBadge from '@/components/ui/status-badge'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { CoachAgendaPayload, CoachAvailableSlot } from '@/lib/coach-agenda'
import { HOUR_STATUSES, type HourStatus } from '@/lib/coach-agenda-status'
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
  disabled?: boolean
  disabledReason?: string
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
  schoolId?: string
  timezone: string
  student: Pick<SchoolStudent, 'id' | 'name' | 'studentEmail' | 'phone'>
  open: boolean
  onClose: () => void
  onAssigned: () => void
}) {
  const [editingHours, setEditingHours] = useState(false)
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
      getAuthed(
        schoolId
          ? `/api/schools/${encodeURIComponent(schoolId)}/agenda?month=${month}`
          : `/api/coach/agenda?month=${month}`
      ).then((r) => r.json()),
      schoolId
        ? getAuthed(`/api/schools/${encodeURIComponent(schoolId)}/classes`).then((r) => r.json())
        : Promise.resolve({ classes: [] }),
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
      const normalized = asAssignmentSlot(slot, agenda)
      slots.set(normalized.key, {
        ...normalized,
        disabled: slot.status !== 'available',
        disabledReason:
          slot.status === 'blocked'
            ? 'Bloqueado'
            : slot.status === 'booked'
              ? 'Sin espacio'
              : undefined,
      })
    }
    for (const item of agenda.bookings) {
      if (item.status === 'cancelled') continue
      const key = `${item.coachId}|${item.date}|${item.startTime}|${item.groupType}`
      const current = slots.get(key)
      const assigned =
        current?.disabledReason === 'Ya asignado' ||
        item.athleteId === student.id ||
        item.schoolClassStudentIds?.includes(student.id) ||
        classes.some(
          (classItem) =>
            classItem.id === item.schoolClassId && classItem.studentIds.includes(student.id)
        )
      const full =
        item.groupType === 'particular' ||
        item.classFull ||
        (!item.schoolClassId && current?.disabled)
      slots.set(key, {
        key,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        coachId: item.coachId,
        coachName: item.coachName || agenda.coachNames?.[item.coachId] || 'Profesor',
        groupType: item.groupType,
        locationName: item.locationName || '',
        schoolClassId: item.schoolClassId,
        schoolClassTitle: item.schoolClassTitle,
        studentCount: item.schoolClassStudentCount,
        classFull: item.classFull,
        disabled: Boolean(assigned || full),
        disabledReason: assigned ? 'Ya asignado' : full ? 'Sin espacio' : undefined,
      })
    }
    for (const item of classes) {
      if (
        item.type !== 'group' ||
        (item.status !== 'scheduled' && item.status !== 'pending') ||
        item.date < dateInTimezone(timezone)
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
        disabled: item.studentIds.includes(student.id) || item.classFull,
        disabledReason: item.studentIds.includes(student.id)
          ? 'Ya asignado'
          : item.classFull
            ? 'Sin espacio'
            : undefined,
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
    if (slot.disabled) return
    setSelectedSlots((current) =>
      current.some((item) => item.key === slot.key)
        ? current.filter((item) => item.key !== slot.key)
        : [
            ...current.filter(
              (item) => item.date !== slot.date || item.startTime !== slot.startTime
            ),
            slot,
          ]
    )
  }

  async function assign() {
    if (!selectedSlots.length || saving) return
    setSaving(true)
    setSaveError(false)
    setNotice('')
    try {
      if (!schoolId) {
        const failed: AssignmentSlot[] = []
        let assigned = 0
        for (const slot of selectedSlots) {
          try {
            const response = await postAuthed('/api/coach/agenda/bookings', {
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              locationName: slot.locationName,
              groupType: slot.groupType,
              athleteId: student.id,
              athleteName: student.name,
              athleteEmail: student.studentEmail || null,
              athletePhone: student.phone || null,
            })
            if (!response.ok) throw new Error('assignment_failed')
            assigned++
          } catch {
            failed.push(slot)
          }
        }
        setSelectedSlots(failed)
        setSaveError(failed.length > 0)
        if (assigned) {
          setNotice(`Se asignó a ${assigned} ${assigned === 1 ? 'clase' : 'clases'}.`)
          onAssigned()
          setAttempt((value) => value + 1)
        }
        return
      }
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

  if (editingHours)
    return (
      <CoachAgenda
        schoolId={schoolId}
        initialDate={date}
        editorOnly
        scheduleEditorOpen
        onScheduleEditorClose={() => {
          setEditingHours(false)
          setAttempt((value) => value + 1)
        }}
      />
    )

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
        <h2 className="text-xl font-bold text-(--c-ocean)">Asignar clases a: {student.name}</h2>
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
            <ScheduleViews
              toolbarActions={
                <button
                  type="button"
                  className="btn btn-outline min-h-11 "
                  disabled={saving}
                  onClick={() => setEditingHours(true)}
                >
                  Editar horarios
                </button>
              }
              description={
                <p className="text-sm text-(--c-text-2)">
                  Selecciona uno o varios horarios grupales o particulares.
                </p>
              }
              selectedDate={date}
              days={days}
              today={dateInTimezone(timezone)}
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
              onSelectDate={setDate}
              onChangeWeek={(delta) =>
                setDate(dateKey(addDays(new Date(`${date}T12:00:00`), delta * 7)))
              }
              loading={!agenda}
              disabled={saving}
              slots={availableSlots.map((slot) => ({
                ...slot,
                bookingStatus:
                  slot.disabledReason === 'Ya asignado' ? ('confirmed' as const) : undefined,
                selected: selectedSlots.some((item) => item.key === slot.key),
                coachName: slot.coachName,
                unassigned: slot.coachId === '__unassigned__',
                label: `${slot.date} · ${slot.startTime}–${slot.endTime} · ${slot.coachName} · ${slot.groupType}${slot.disabledReason ? ` · ${slot.disabledReason}` : ''}`,
              }))}
              onSelectSlot={(key) => {
                const slot = availableSlots.find((item) => item.key === key)
                if (slot) toggleSlot(slot)
              }}
            >
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
                            slot.locationName.trim().toLocaleLowerCase('es') !== 'lugar por definir'
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
                          disabled={saving || slot.disabled}
                          aria-pressed={selected}
                          className={`min-h-10 whitespace-nowrap rounded-full px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm ${selected ? 'bg-(--c-ocean) text-white' : 'border border-(--c-border) text-(--c-ocean)'}`}
                        >
                          {slot.disabledReason === 'Ya asignado' ? (
                            <StatusBadge status="confirmed" />
                          ) : (
                            slot.disabledReason || (selected ? 'Seleccionado' : 'Seleccionar')
                          )}
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
            </ScheduleViews>
            {selectedSlots.length > 0 && (
              <p className="shrink-0 text-sm font-semibold text-(--c-ocean)">
                {selectedSlots.length}{' '}
                {selectedSlots.length === 1 ? 'horario seleccionado' : 'horarios seleccionados'}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="flex shrink-0 items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-base font-bold text-emerald-900"
              >
                <FiCheckCircle aria-hidden="true" className="size-6 shrink-0 text-emerald-600" />
                <span>{notice}</span>
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
