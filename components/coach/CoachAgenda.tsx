'use client'

import Loading from '@comps/Loading'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiLock, FiPlus, FiUnlock, FiX } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { CoachAgendaPayload, CoachAvailableSlot, CoachScheduleBlock } from '@/lib/coach-agenda'
import { HOUR_STATUS_STYLE, type HourStatus } from '@/lib/coach-agenda-status'
import type { Booking } from '@/lib/coach-booking'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import AgendaAddStudentModal, { type AddStudentPayload } from './AgendaAddStudentModal'
import AgendaOpenHoursModal from './AgendaOpenHoursModal'

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

type ActiveSlot = { date: string; startTime: string; endTime: string; locationName: string }
type ConfirmAction =
  | { kind: 'cancel-booking'; booking: Booking }
  | { kind: 'delete-slot'; slot: CoachAvailableSlot }

export default function CoachAgenda({ coachId }: { coachId?: string }) {
  // When an admin opens another coach's agenda, `coachId` targets that coach and
  // booking actions (add/cancel students) are hidden — admin mode manages open
  // hours and blocks only.
  const adminMode = Boolean(coachId)
  const coachQuery = coachId ? `&coachId=${encodeURIComponent(coachId)}` : ''

  const [agenda, setAgenda] = useState<CoachAgendaPayload | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openHoursOpen, setOpenHoursOpen] = useState(false)
  const [addStudentSlot, setAddStudentSlot] = useState<ActiveSlot | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const monthOfSelected = selectedDate.slice(0, 7)

  const loadAgenda = useCallback(
    async (month: string) => {
      setError(null)
      try {
        const response = await getAuthed(`/api/coach/agenda?month=${month}${coachQuery}`)
        setAgenda((await response.json()) as CoachAgendaPayload)
      } catch (err) {
        reportInternalError('COACH_AGENDA_LOAD', err)
        setError(GENERIC_USER_ERROR)
        setAgenda({ bookings: [], availableSlots: [], blocks: [] })
      }
    },
    [coachQuery]
  )

  useEffect(() => {
    loadAgenda(monthOfSelected)
  }, [loadAgenda, monthOfSelected])

  const weekDates = useMemo(() => {
    const start = startOfWeek(new Date(`${selectedDate}T12:00:00`))
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [selectedDate])

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
    const bookedKeys = new Set<string>()
    for (const booking of activeBookings) {
      push(booking.date, booking.startTime, 'booked')
      bookedKeys.add(`${booking.date}|${booking.startTime}`)
    }
    for (const slot of agenda?.availableSlots || []) {
      if (slot.status === 'available') push(slot.date, slot.startTime, 'available')
    }
    for (const block of agenda?.blocks || []) {
      if (block.allDay || block.hidden) continue
      // A blocked hour that already has a student shows as booked, not blocked.
      if (bookedKeys.has(`${block.date}|${block.startTime || ''}`)) continue
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
  }, [activeBookings, agenda?.availableSlots, agenda?.blocks])

  // Month-level occupancy: booked vs total offered, restricted to the month shown
  // in the header (the payload can bleed into adjacent months on boundary weeks).
  const monthStats = useMemo(() => {
    const inMonth = (date: string) => date.startsWith(monthOfSelected)
    const booked = activeBookings.filter((booking) => inMonth(booking.date)).length
    const available = (agenda?.availableSlots || []).filter(
      (slot) => slot.status === 'available' && inMonth(slot.date)
    ).length
    return { booked, total: booked + available }
  }, [activeBookings, agenda?.availableSlots, monthOfSelected])

  // Week-level occupancy: sum booked/total across the 7 visible days.
  const weekStats = useMemo(() => {
    let booked = 0
    let total = 0
    for (const date of weekDates) {
      const statuses = dayStatuses.get(dateKey(date)) || []
      for (const status of statuses) {
        if (status === 'booked') {
          booked += 1
          total += 1
        } else if (status === 'available') {
          total += 1
        }
      }
    }
    return { booked, total }
  }, [weekDates, dayStatuses])

  const dayBookings = activeBookings.filter((booking) => booking.date === selectedDate)
  const daySlots = (agenda?.availableSlots || []).filter((slot) => slot.date === selectedDate)
  const dayBlocks = (agenda?.blocks || []).filter((block) => block.date === selectedDate)
  const allDayBlock = dayBlocks.find((block) => block.allDay)

  const rows = useMemo(() => {
    const bookedTimes = new Set(dayBookings.map((booking) => booking.startTime))
    const available = daySlots
      .filter((slot) => slot.status === 'available')
      .map((slot) => ({ kind: 'available' as const, sort: slot.startTime, slot }))
    const booked = dayBookings.map((booking) => ({
      kind: 'booked' as const,
      sort: booking.startTime,
      booking,
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
      if (bookedTimes.has(slot.startTime) || seen.has(slot.startTime)) continue
      seen.add(slot.startTime)
      const block = dayBlocks.find(
        (b) =>
          !b.allDay &&
          !b.hidden &&
          b.startTime &&
          b.endTime &&
          b.startTime < slot.endTime &&
          slot.startTime < b.endTime
      )
      // Hidden blocks (removed entirely) have no visible row.
      if (!block) continue
      blocked.push({ kind: 'blocked', sort: slot.startTime, slot, block })
    }
    return [...available, ...booked, ...blocked].sort((a, b) => a.sort.localeCompare(b.sort))
  }, [daySlots, dayBookings, dayBlocks])

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

  const block = (slot: CoachAvailableSlot, hidden: boolean) =>
    run(() =>
      postAuthed('/api/coach/agenda', {
        date: slot.date,
        allDay: false,
        startTime: slot.startTime,
        endTime: slot.endTime,
        hidden,
        ...(coachId ? { coachId } : {}),
      })
    )

  // Bloquear: hide from athletes but keep visible to the coach (Bloqueado row,
  // can still add a student).
  const bloquearSlot = (slot: CoachAvailableSlot) => block(slot, false)

  // Eliminar: remove entirely. Delete the open hour, or hide the recurring
  // offering occurrence so it disappears from the day.
  const eliminarSlot = (slot: CoachAvailableSlot) => {
    if (slot.source === 'open' && slot.openSlotId) {
      const id = slot.openSlotId
      return run(() =>
        deleteAuthed(`/api/coach/agenda/slots?id=${encodeURIComponent(id)}${coachQuery}`)
      )
    }
    return block(slot, true)
  }

  const cancelBooking = (booking: Booking) =>
    run(() => deleteAuthed(`/api/coach/agenda/bookings?id=${encodeURIComponent(booking.id)}`))

  const unblock = (block: CoachScheduleBlock) =>
    run(() => deleteAuthed(`/api/coach/agenda?id=${encodeURIComponent(block.id)}${coachQuery}`))

  const submitOpenHours = (dates: string[], times: string[]) =>
    run(async () => {
      await postAuthed('/api/coach/agenda/slots', {
        dates,
        times,
        ...(coachId ? { coachId } : {}),
      })
      setOpenHoursOpen(false)
    })

  const submitAddStudent = (slot: ActiveSlot, payload: AddStudentPayload) =>
    run(async () => {
      await postAuthed('/api/coach/agenda/bookings', { ...slot, ...payload })
      setAddStudentSlot(null)
    })

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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold capitalize text-[var(--c-ocean)]">
          {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', { month: 'long' })}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() =>
              setSelectedDate(dateKey(addDays(new Date(`${selectedDate}T12:00:00`), -7)))
            }
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <span className="min-w-[8.5rem] text-center text-xs font-semibold text-[var(--c-ocean)]">
            {weekDates[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} -{' '}
            {weekDates[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
          </span>
          <button
            type="button"
            aria-label="Semana siguiente"
            onClick={() =>
              setSelectedDate(dateKey(addDays(new Date(`${selectedDate}T12:00:00`), 7)))
            }
            className="grid h-9 w-9 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)] hover:bg-[var(--c-surface)]"
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="-mt-2 flex items-center justify-between gap-3 text-sm text-[var(--c-text-2)]">
        <span>
          Lleno: {monthStats.booked}/{monthStats.total}
        </span>
        <span>
          Lleno: {weekStats.booked}/{weekStats.total}
        </span>
      </div>

      <p className="-mt-1 text-sm text-[var(--c-text-2)]">
        {adminMode
          ? 'Toca un día para ver y editar los horarios del coach.'
          : 'Toca un día para ver y editar tus horas.'}
      </p>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date) => {
          const key = dateKey(date)
          const selected = key === selectedDate
          const statuses = dayStatuses.get(key) || []
          // Colored lines in chronological order: blue=bloqueado, green=disponible, purple=ocupado.
          const bars = occupancyBars(statuses)
          const count = (status: HourStatus) => statuses.filter((s) => s === status).length
          return (
            <button
              type="button"
              key={key}
              onClick={() => setSelectedDate(key)}
              aria-label={
                statuses.length
                  ? `${weekdayChipLabel(date)}: ${count('booked')} ocupadas, ${count('available')} disponibles, ${count('blocked')} bloqueadas`
                  : weekdayChipLabel(date)
              }
              className={`flex flex-col items-center gap-1 rounded-[var(--r-md)] border py-2 transition-colors ${
                selected
                  ? 'border-transparent bg-gradient-to-b from-[var(--c-aqua)] to-[var(--c-ocean)] text-white'
                  : 'border-[var(--c-border)] bg-white text-[var(--c-ocean)] hover:bg-[var(--c-surface)]'
              }`}
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
                    className={`h-[3px] w-4 rounded-full ${color}`}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      {/* Day card */}
      <section className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)]">
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
          <div>
            <h3 className="text-lg font-bold capitalize text-[var(--c-ocean)]">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </h3>
            <p className="mt-0.5 text-sm text-[var(--c-text-2)]">
              Lleno: {dayBookings.length}/
              {dayBookings.length + rows.filter((row) => row.kind === 'available').length}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenHoursOpen(true)}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--c-aqua)] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <FiPlus aria-hidden="true" /> Abrir horario
          </button>
        </div>

        {error && (
          <p className="px-4 pb-2 text-sm text-[var(--c-error,#b91c1c)] sm:px-5">{error}</p>
        )}

        <div className="border-t border-[var(--c-border)]">
          {allDayBlock && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
                <FiLock aria-hidden="true" /> Día bloqueado
                {allDayBlock.note ? ` · ${allDayBlock.note}` : ''}
              </span>
              <RowIconButton
                ariaLabel="Desbloquear día"
                onClick={() => unblock(allDayBlock)}
                disabled={busy}
              >
                <FiUnlock aria-hidden="true" />
              </RowIconButton>
            </div>
          )}

          {!allDayBlock && rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[var(--c-text-2)] sm:px-5">
              No hay horarios este día. Usa “Abrir horario” para publicar horas.
            </p>
          )}

          {!allDayBlock &&
            rows.map((row) => {
              if (row.kind === 'booked') {
                return (
                  <AgendaRow key={`b-${row.booking.id}`} time={row.booking.startTime}>
                    <div
                      className={`flex min-w-0 flex-1 flex-col gap-2.5 rounded-[var(--r-md)] border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${HOUR_STATUS_STYLE.booked.border} ${HOUR_STATUS_STYLE.booked.bg}`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--c-border)] bg-white text-xs font-bold text-[var(--c-ocean)] shadow-[0_1px_0_rgba(10,37,64,0.04)]">
                          {initials(row.booking.athleteName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-base font-extrabold leading-tight text-[var(--c-ocean)]">
                            {row.booking.athleteName}
                          </span>
                          <Link
                            href={`/coach/students?student=${encodeURIComponent(row.booking.athleteId)}`}
                            className="mt-1 inline-flex min-h-6 items-center text-sm font-semibold text-[var(--c-aqua-strong)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                          >
                            ver perfil ›
                          </Link>
                        </span>
                      </div>
                      {!adminMode && (
                        <button
                          type="button"
                          aria-label={`Cancelar clase de ${row.booking.athleteName}`}
                          onClick={() =>
                            setConfirmAction({ kind: 'cancel-booking', booking: row.booking })
                          }
                          disabled={busy}
                          className="inline-flex min-h-11 w-fit shrink-0 items-center gap-1.5 self-end rounded-full border border-[var(--rose-bd)] bg-white px-3.5 text-xs font-bold text-[var(--rose-tx)] transition-colors hover:bg-[var(--rose-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rose-tx)] disabled:opacity-50 sm:self-center"
                        >
                          <FiX aria-hidden="true" /> Cancelar
                        </button>
                      )}
                    </div>
                  </AgendaRow>
                )
              }
              if (row.kind === 'blocked') {
                return (
                  <AgendaRow key={`x-${row.slot.id}`} time={row.slot.startTime}>
                    <div
                      className={`flex flex-1 items-center justify-between gap-2 rounded-[var(--r-md)] border px-2.5 py-2.5 sm:px-3 ${HOUR_STATUS_STYLE.blocked.border} ${HOUR_STATUS_STYLE.blocked.bg}`}
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
                        <FiLock aria-hidden="true" className="shrink-0" />{' '}
                        <span className="truncate">
                          Bloqueado{row.block?.note ? ` · ${row.block.note}` : ''}
                        </span>
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        {!adminMode && (
                          <button
                            type="button"
                            onClick={() =>
                              setAddStudentSlot({
                                date: row.slot.date,
                                startTime: row.slot.startTime,
                                endTime: row.slot.endTime,
                                locationName: row.slot.locationName || 'Horario abierto',
                              })
                            }
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--c-aqua)] px-2.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:px-3"
                          >
                            <FiPlus aria-hidden="true" /> Alumno
                          </button>
                        )}
                        {row.block && (
                          <RowIconButton
                            ariaLabel="Desbloquear"
                            onClick={() => unblock(row.block as CoachScheduleBlock)}
                            disabled={busy}
                          >
                            <FiUnlock aria-hidden="true" />
                          </RowIconButton>
                        )}
                      </div>
                    </div>
                  </AgendaRow>
                )
              }
              return (
                <AgendaRow key={`a-${row.slot.id}`} time={row.slot.startTime}>
                  <div
                    className={`flex flex-1 items-center justify-between gap-2 rounded-[var(--r-md)] border px-2.5 py-2.5 sm:px-3 ${HOUR_STATUS_STYLE.available.border} ${HOUR_STATUS_STYLE.available.bg}`}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${HOUR_STATUS_STYLE.available.dot}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">Disponible</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                      {!adminMode && (
                        <button
                          type="button"
                          onClick={() =>
                            setAddStudentSlot({
                              date: row.slot.date,
                              startTime: row.slot.startTime,
                              endTime: row.slot.endTime,
                              locationName: row.slot.locationName,
                            })
                          }
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--c-aqua)] px-2.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:px-3"
                        >
                          <FiPlus aria-hidden="true" /> Alumno
                        </button>
                      )}
                      <RowIconButton
                        ariaLabel="Eliminar este horario"
                        onClick={() => setConfirmAction({ kind: 'delete-slot', slot: row.slot })}
                        disabled={
                          busy || dayBookings.some((b) => b.startTime === row.slot.startTime)
                        }
                      >
                        <FiX aria-hidden="true" />
                      </RowIconButton>
                      <RowIconButton
                        ariaLabel="Bloquear este horario para los atletas"
                        onClick={() => bloquearSlot(row.slot)}
                        disabled={busy}
                      >
                        <FiLock aria-hidden="true" />
                      </RowIconButton>
                    </div>
                  </div>
                </AgendaRow>
              )
            })}
        </div>
      </section>

      {openHoursOpen && (
        <AgendaOpenHoursModal
          weekDays={weekDates.map((date) => ({
            key: dateKey(date),
            label: weekdayChipLabel(date),
          }))}
          defaultDate={selectedDate}
          busy={busy}
          onClose={() => setOpenHoursOpen(false)}
          onSubmit={submitOpenHours}
        />
      )}

      {addStudentSlot && (
        <AgendaAddStudentModal
          slotLabel={`${new Date(`${addStudentSlot.date}T12:00:00`).toLocaleDateString('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })} · ${addStudentSlot.startTime}`}
          busy={busy}
          onClose={() => setAddStudentSlot(null)}
          onSubmit={(payload) => submitAddStudent(addStudentSlot, payload)}
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
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-white transition-colors disabled:opacity-50 ${
        tone === 'danger'
          ? 'border-rose-200 text-rose-500 hover:bg-rose-50'
          : 'border-[var(--c-border)] text-[var(--c-text-2)] hover:bg-[var(--c-surface)]'
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

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay()
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day))
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
