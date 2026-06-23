'use client'

import Loading from '@comps/Loading'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiLock, FiPlus, FiUnlock, FiX } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { CoachAgendaPayload, CoachAvailableSlot, CoachScheduleBlock } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import AgendaAddStudentModal, { type AddStudentPayload } from './AgendaAddStudentModal'
import AgendaOpenHoursModal from './AgendaOpenHoursModal'

const WEEKDAYS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']

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

  const dayStats = useMemo(() => {
    const map = new Map<string, number>()
    for (const booking of activeBookings) map.set(booking.date, (map.get(booking.date) || 0) + 1)
    for (const slot of agenda?.availableSlots || []) {
      if (slot.status === 'available') map.set(slot.date, (map.get(slot.date) || 0) + 1)
    }
    return map
  }, [activeBookings, agenda?.availableSlots])

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
    // A coach can add a student to a blocked hour; once booked, show the booking
    // row instead of the block.
    const blocked = dayBlocks
      .filter((block) => !block.allDay && !block.hidden && !bookedTimes.has(block.startTime || ''))
      .map((block) => ({ kind: 'blocked' as const, sort: block.startTime || '', block }))
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
      <p className="-mt-2 text-sm text-[var(--c-text-2)]">
        {adminMode
          ? 'Toca un día para ver y editar los horarios del coach.'
          : 'Toca un día para ver y editar tus horas.'}
      </p>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date) => {
          const key = dateKey(date)
          const selected = key === selectedDate
          const count = Math.min(dayStats.get(key) || 0, 3)
          return (
            <button
              type="button"
              key={key}
              onClick={() => setSelectedDate(key)}
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
              <span className="flex h-1.5 items-center gap-0.5">
                {['d1', 'd2', 'd3'].slice(0, count).map((dotKey) => (
                  <span
                    key={dotKey}
                    className={`h-1 w-1 rounded-full ${selected ? 'bg-white' : 'bg-[var(--c-aqua)]'}`}
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
              {dayBookings.length} agendada(s) ·{' '}
              {rows.filter((row) => row.kind === 'available').length} libres
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
                    <div className="flex flex-1 items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--c-aqua-light)] bg-[var(--c-aqua-light)]/25 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--c-border)] bg-white text-xs font-bold text-[var(--c-ocean)]">
                          {initials(row.booking.athleteName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-[var(--c-ocean)]">
                            {row.booking.athleteName}
                          </span>
                          <Link
                            href="/coach/students"
                            className="text-xs font-semibold text-[var(--c-aqua-strong)] hover:underline"
                          >
                            ver perfil ›
                          </Link>
                        </span>
                      </div>
                      {!adminMode && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmAction({ kind: 'cancel-booking', booking: row.booking })
                          }
                          disabled={busy}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
                        >
                          <FiX aria-hidden="true" /> Cancelar clase
                        </button>
                      )}
                    </div>
                  </AgendaRow>
                )
              }
              if (row.kind === 'blocked') {
                return (
                  <AgendaRow key={`x-${row.block.id}`} time={row.block.startTime || ''}>
                    <div className="flex flex-1 items-center justify-between gap-3 rounded-[var(--r-md)] border border-rose-100 bg-rose-50/60 px-3 py-2.5">
                      <span className="flex items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
                        <FiLock aria-hidden="true" /> Bloqueado
                        {row.block.note ? ` · ${row.block.note}` : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        {!adminMode && row.block.startTime && row.block.endTime && (
                          <button
                            type="button"
                            onClick={() =>
                              setAddStudentSlot({
                                date: row.block.date,
                                startTime: row.block.startTime as string,
                                endTime: row.block.endTime as string,
                                locationName: 'Horario abierto',
                              })
                            }
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--c-aqua)] px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                          >
                            <FiPlus aria-hidden="true" /> Alumno
                          </button>
                        )}
                        <RowIconButton
                          ariaLabel="Desbloquear"
                          onClick={() => unblock(row.block)}
                          disabled={busy}
                        >
                          <FiUnlock aria-hidden="true" />
                        </RowIconButton>
                      </div>
                    </div>
                  </AgendaRow>
                )
              }
              return (
                <AgendaRow key={`a-${row.slot.id}`} time={row.slot.startTime}>
                  <div className="flex flex-1 items-center justify-between gap-2 rounded-[var(--r-md)] border border-[var(--c-aqua-light)] bg-[var(--c-surface)] px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
                      <span
                        className="h-2 w-2 rounded-full bg-[var(--c-aqua)]"
                        aria-hidden="true"
                      />
                      Disponible
                    </span>
                    <div className="flex items-center gap-2">
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
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--c-aqua)] px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
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
    <div className="flex items-center gap-3 border-b border-[var(--c-border)] px-4 py-2.5 last:border-b-0 sm:px-5">
      <span className="w-12 shrink-0 text-sm font-semibold text-[var(--c-text-2)]">{time}</span>
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
