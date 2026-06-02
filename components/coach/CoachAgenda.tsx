'use client'

import Loading from '@comps/Loading'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiLock,
  FiMapPin,
  FiPhone,
  FiTrash2,
  FiUnlock,
  FiUser,
} from 'react-icons/fi'
import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { CoachAgendaPayload, CoachAvailableSlot, CoachScheduleBlock } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CoachAgenda() {
  const [agenda, setAgenda] = useState<CoachAgendaPayload | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [blockMode, setBlockMode] = useState<'day' | 'time'>('day')
  const [blockStart, setBlockStart] = useState('06:00')
  const [blockEnd, setBlockEnd] = useState('07:00')
  const [blockNote, setBlockNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAgenda = useCallback(async (month: Date) => {
    setError(null)
    try {
      const response = await getAuthed(`/api/coach/agenda?month=${monthKey(month)}`)
      const payload = (await response.json()) as CoachAgendaPayload
      setAgenda(payload)
    } catch (err) {
      reportInternalError('COACH_AGENDA_LOAD', err)
      setError(GENERIC_USER_ERROR)
      setAgenda({ bookings: [], availableSlots: [], blocks: [] })
    }
  }, [])

  useEffect(() => {
    loadAgenda(visibleMonth)
  }, [loadAgenda, visibleMonth])

  const activeBookings = useMemo(() => {
    return (agenda?.bookings || [])
      .filter((booking) => booking.status !== 'cancelled')
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  }, [agenda?.bookings])

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const dayStats = useMemo(() => {
    const map = new Map<string, { available: number; booked: number; blocked: number }>()
    for (const date of calendarDays) {
      map.set(dateKey(date), { available: 0, booked: 0, blocked: 0 })
    }
    for (const slot of agenda?.availableSlots || []) {
      const stats = map.get(slot.date) || { available: 0, booked: 0, blocked: 0 }
      stats[slot.status] += 1
      map.set(slot.date, stats)
    }
    for (const block of agenda?.blocks || []) {
      const stats = map.get(block.date) || { available: 0, booked: 0, blocked: 0 }
      if (block.allDay) stats.blocked = Math.max(stats.blocked, 1)
      map.set(block.date, stats)
    }
    return map
  }, [agenda?.availableSlots, agenda?.blocks, calendarDays])

  const selectedSlots = (agenda?.availableSlots || []).filter((slot) => slot.date === selectedDate)
  const selectedAvailable = selectedSlots.filter((slot) => slot.status === 'available')
  const selectedBookings = activeBookings.filter((booking) => booking.date === selectedDate)
  const selectedBlocks = (agenda?.blocks || []).filter((block) => block.date === selectedDate)
  const monthStats = calendarDays.reduce(
    (total, date) => {
      if (date.getMonth() !== visibleMonth.getMonth()) return total
      const stats = dayStats.get(dateKey(date))
      return {
        available: total.available + (stats?.available || 0),
        booked: total.booked + (stats?.booked || 0),
        blocked: total.blocked + (stats?.blocked || 0),
      }
    },
    { available: 0, booked: 0, blocked: 0 }
  )

  async function createBlock(input?: Pick<CoachAvailableSlot, 'startTime' | 'endTime'>) {
    setBusy(true)
    setError(null)
    try {
      await postAuthed('/api/coach/agenda', {
        date: selectedDate,
        allDay: input ? false : blockMode === 'day',
        startTime: input?.startTime || blockStart,
        endTime: input?.endTime || blockEnd,
        note: blockNote,
      })
      setBlockNote('')
      await loadAgenda(visibleMonth)
    } catch (err) {
      reportInternalError('COACH_BLOCK_CREATE', err)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  async function deleteBlock(id: string) {
    setBusy(true)
    setError(null)
    try {
      await deleteAuthed(`/api/coach/agenda?id=${encodeURIComponent(id)}`)
      await loadAgenda(visibleMonth)
    } catch (err) {
      reportInternalError('COACH_BLOCK_DELETE', err)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  if (agenda === undefined) return <Loading />

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
      <section className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold capitalize text-[var(--c-ocean)]">
              {visibleMonth.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <Pill label={`${monthStats.available} disponibles`} tone="available" />
              <Pill label={`${monthStats.booked} agendadas`} tone="booked" />
              <Pill label={`${monthStats.blocked} bloqueadas`} tone="blocked" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)]"
            >
              <FiChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--c-border)] text-[var(--c-ocean)]"
            >
              <FiChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-[var(--c-text-2)]">
          {WEEKDAYS.map((day) => (
            <span key={day} className="py-2">
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date) => {
            const key = dateKey(date)
            const stats = dayStats.get(key) || { available: 0, booked: 0, blocked: 0 }
            const isSelected = selectedDate === key
            const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
            const hasActivity = stats.available + stats.booked + stats.blocked > 0

            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelectedDate(key)}
                className={`flex aspect-square min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--r-sm)] border text-sm transition-colors ${
                  isSelected
                    ? 'border-[var(--c-ocean)] bg-[var(--c-ocean)] text-white'
                    : 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-ocean)]'
                } ${isCurrentMonth ? '' : 'opacity-45'}`}
              >
                <span className="font-bold">{date.getDate()}</span>
                {hasActivity && (
                  <span className="flex items-center gap-1 text-[9px] font-bold">
                    {stats.available > 0 && <Dot label={stats.available} tone="available" />}
                    {stats.booked > 0 && <Dot label={stats.booked} tone="booked" />}
                    {stats.blocked > 0 && <Dot label={stats.blocked} tone="blocked" />}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold capitalize text-[var(--c-ocean)]">
            {formatLongDate(selectedDate)}
          </h2>
          <p className="text-sm text-[var(--c-text-2)]">
            {selectedAvailable.length} disponibles · {selectedBookings.length} agendadas ·{' '}
            {selectedBlocks.length} bloqueadas
          </p>
        </div>

        {error && (
          <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-[var(--c-surface)] p-4 text-sm text-[var(--c-text-2)]">
            {error}
          </div>
        )}

        <BlockControls
          mode={blockMode}
          start={blockStart}
          end={blockEnd}
          note={blockNote}
          busy={busy}
          onModeChange={setBlockMode}
          onStartChange={setBlockStart}
          onEndChange={setBlockEnd}
          onNoteChange={setBlockNote}
          onSubmit={() => createBlock()}
        />

        <AgendaSection title="Clases agendadas" empty="No hay clases agendadas este día.">
          {selectedBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </AgendaSection>

        <AgendaSection title="Horarios disponibles" empty="No hay horarios disponibles este día.">
          {selectedAvailable.map((slot) => (
            <SlotCard key={slot.id} slot={slot} busy={busy} onBlock={() => createBlock(slot)} />
          ))}
        </AgendaSection>

        <AgendaSection title="Bloqueos" empty="No hay bloqueos este día.">
          {selectedBlocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              busy={busy}
              onDelete={() => deleteBlock(block.id)}
            />
          ))}
        </AgendaSection>
      </section>
    </div>
  )
}

function BlockControls({
  mode,
  start,
  end,
  note,
  busy,
  onModeChange,
  onStartChange,
  onEndChange,
  onNoteChange,
  onSubmit,
}: {
  mode: 'day' | 'time'
  start: string
  end: string
  note: string
  busy: boolean
  onModeChange: (mode: 'day' | 'time') => void
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  onNoteChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onModeChange('day')}
          className={`rounded-full px-3 py-2 text-sm font-bold ${
            mode === 'day'
              ? 'bg-[var(--c-ocean)] text-white'
              : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
          }`}
        >
          Bloquear día
        </button>
        <button
          type="button"
          onClick={() => onModeChange('time')}
          className={`rounded-full px-3 py-2 text-sm font-bold ${
            mode === 'time'
              ? 'bg-[var(--c-ocean)] text-white'
              : 'bg-[var(--c-surface)] text-[var(--c-ocean)]'
          }`}
        >
          Bloquear hora
        </button>
      </div>
      {mode === 'time' && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-semibold text-[var(--c-ocean)]">
            Inicio
            <input
              type="time"
              value={start}
              onChange={(event) => onStartChange(event.target.value)}
              className="min-h-11 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[var(--c-ocean)]">
            Fin
            <input
              type="time"
              value={end}
              onChange={(event) => onEndChange(event.target.value)}
              className="min-h-11 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3"
            />
          </label>
        </div>
      )}
      <label className="mt-3 grid gap-1 text-sm font-semibold text-[var(--c-ocean)]">
        Nota
        <input
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          maxLength={160}
          placeholder="Ej. competencia, viaje, mantenimiento de alberca"
          className="min-h-11 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3"
        />
      </label>
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[var(--r-sm)] bg-[var(--c-ocean)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <FiLock aria-hidden="true" />
        Guardar bloqueo
      </button>
    </div>
  )
}

function AgendaSection({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : []
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-bold text-[var(--c-ocean)]">{title}</h3>
      {items.length ? (
        items
      ) : (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-surface)] p-5 text-center text-sm text-[var(--c-text-2)]">
          {empty}
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <article className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 py-2.5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
            <FiClock aria-hidden="true" />
            {booking.startTime} - {booking.endTime}
          </p>
          <p className="flex items-center gap-2 text-xs text-[var(--c-text-2)]">
            <FiUser aria-hidden="true" />
            {booking.athleteName}
          </p>
          <p className="flex items-center gap-2 text-xs text-[var(--c-text-2)]">
            <FiMapPin aria-hidden="true" />
            {booking.locationName}
          </p>
          {booking.athletePhone && (
            <p className="flex items-center gap-2 text-xs text-[var(--c-text-2)]">
              <FiPhone aria-hidden="true" />
              {booking.athletePhone}
            </p>
          )}
        </div>
        <Pill label="Agendada" tone="booked" />
      </div>
    </article>
  )
}

function SlotCard({
  slot,
  busy,
  onBlock,
}: {
  slot: CoachAvailableSlot
  busy: boolean
  onBlock: () => void
}) {
  return (
    <article className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-3 py-2.5 shadow-[var(--shadow-sm)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
            <FiUnlock aria-hidden="true" />
            {slot.startTime} - {slot.endTime}
          </p>
          <p className="mt-0.5 text-xs text-[var(--c-text-2)]">{slot.locationName}</p>
        </div>
        <button
          type="button"
          onClick={onBlock}
          disabled={busy}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-[var(--c-border)] px-3 py-1.5 text-xs font-bold text-[var(--c-ocean)] disabled:opacity-60"
        >
          <FiLock aria-hidden="true" />
          Bloquear
        </button>
      </div>
    </article>
  )
}

function BlockCard({
  block,
  busy,
  onDelete,
}: {
  block: CoachScheduleBlock
  busy: boolean
  onDelete: () => void
}) {
  return (
    <article className="rounded-[var(--r-sm)] border border-rose-100 bg-rose-50/50 px-3 py-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[var(--c-ocean)]">
            <FiLock aria-hidden="true" />
            {block.allDay ? 'Todo el día' : `${block.startTime} - ${block.endTime}`}
          </p>
          {block.note && <p className="mt-0.5 text-xs text-[var(--c-text-2)]">{block.note}</p>}
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--r-sm)] border border-rose-100 bg-white px-3 py-1.5 text-xs font-bold text-[var(--c-ocean)] disabled:opacity-60"
        >
          <FiTrash2 aria-hidden="true" />
          Desbloquear
        </button>
      </div>
    </article>
  )
}

function Pill({ label, tone }: { label: string; tone: 'available' | 'booked' | 'blocked' }) {
  const className =
    tone === 'available'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'booked'
        ? 'bg-[var(--c-aqua-light)] text-[var(--c-ocean)]'
        : 'bg-rose-50 text-rose-700'
  return (
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${className}`}>{label}</span>
  )
}

function Dot({ label, tone }: { label: number; tone: 'available' | 'booked' | 'blocked' }) {
  const className =
    tone === 'available'
      ? 'bg-emerald-500 text-white'
      : tone === 'booked'
        ? 'bg-sky-500 text-white'
        : 'bg-rose-500 text-white'
  return <span className={`min-w-4 rounded-full px-1 ${className}`}>{label}</span>
}

function buildCalendarDays(month: Date) {
  const first = startOfMonth(month)
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1
  const start = addDays(first, -offset)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthKey(date: Date) {
  return dateKey(date).slice(0, 7)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function formatLongDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
