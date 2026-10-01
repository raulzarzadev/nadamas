'use client'

import Loading from '@comps/Loading'
import Avatar from '@comps/ui/avatar'
import Chip from '@comps/ui/chip'
import Sheet from '@comps/ui/sheet'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FiArrowUpRight,
  FiCalendar,
  FiChevronRight,
  FiClock,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi'
import ClassEvaluationForm from '@/components/bookings/ClassEvaluationForm'
import CalendarConnectionCard from '@/components/calendar/CalendarConnectionCard'
import { type ClassEvaluation, canEvaluateBooking } from '@/lib/class-evaluation'
import { deleteAuthed, getAuthed } from '@/lib/client/authed-api'
import type { Booking } from '@/lib/coach-booking'
import type { School, SchoolMembership } from '@/lib/school'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

interface CoachInfo {
  name: string
  avatarUrl: string | null
}

interface SchoolAccess {
  school: School
  membership: SchoolMembership
}

const SCHOOL_ROLE_LABEL: Record<string, string> = {
  director: 'Director',
  teacher: 'Coach',
  student: 'Alumno',
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  confirmed: {
    label: 'Confirmada',
    className: 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-aqua-strong)]',
  },
  pending: {
    label: 'Pendiente',
    className: 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-2)]',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'border-[var(--rose-bd)] bg-[var(--rose-bg)] text-[var(--rose-tx)]',
  },
}

function dayLabel(booking: Booking) {
  return new Date(`${booking.date}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

function timeLabel(booking: Booking) {
  const toMinutes = (value: string) => {
    const [h, m] = value.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }
  const minutes = toMinutes(booking.endTime) - toMinutes(booking.startTime)
  return minutes > 0 ? `${booking.startTime} · ${minutes} min` : booking.startTime
}

function modalityLabel(booking: Booking) {
  return booking.groupType === 'grupal' ? 'Clase grupal' : 'Clase individual'
}

function isPastBooking(booking: Booking) {
  if (booking.status === 'cancelled') return true
  const endTime = booking.endTime || booking.startTime || '23:59'
  const endTimestamp = Date.parse(`${booking.date}T${endTime}`)
  return Number.isFinite(endTimestamp) && endTimestamp < Date.now()
}

function BookingCard({
  booking,
  coach,
  onCancel,
  onEvaluate,
}: {
  booking: Booking
  coach?: CoachInfo
  onCancel?: (booking: Booking) => void
  onEvaluate?: (booking: Booking) => void
}) {
  const cancelled = booking.status === 'cancelled'
  const coachName = coach?.name || booking.coachName || 'Coach de natación'
  const status = STATUS_STYLE[booking.status] || {
    label: booking.status,
    className: 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-2)]',
  }

  return (
    <li
      className={`overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-sm)] ${cancelled ? 'opacity-70' : ''}`}
    >
      <div className="h-1 bg-[image:var(--grad-brand)]" />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={coachName} src={coach?.avatarUrl} size={42} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-[var(--c-ocean)]">{coachName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--c-text-2)]">
              <FiUser aria-hidden="true" /> {modalityLabel(booking)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2">
          <Chip icon={<FiCalendar size={14} />}>{dayLabel(booking)}</Chip>
          <Chip icon={<FiClock size={14} />}>{timeLabel(booking)}</Chip>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2">
          <Link
            href={`/athlete/coach/${booking.coachId}`}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--c-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)]"
          >
            Ver perfil <FiChevronRight aria-hidden="true" size={14} />
          </Link>
          {onEvaluate && canEvaluateBooking(booking) && (
            <button
              type="button"
              onClick={() => onEvaluate(booking)}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[var(--c-ocean)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {booking.evaluation ? 'Editar evaluación' : 'Evaluar clase'}
            </button>
          )}
          {onCancel && !cancelled && (
            <button
              type="button"
              onClick={() => onCancel(booking)}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-[var(--rose-bd)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--rose-tx)] transition hover:bg-[var(--rose-bg)]"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

function PastBookings({
  bookings,
  coaches,
  onEvaluate,
}: {
  bookings: Booking[]
  coaches: Record<string, CoachInfo>
  onEvaluate: (booking: Booking) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <section className="flex flex-col gap-3 border-t border-[var(--c-border)] pt-5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white px-4 text-left transition hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
      >
        <span>
          <span className="block font-bold text-[var(--c-ocean)]">Clases pasadas</span>
          <span className="mt-0.5 block text-xs text-[var(--c-text-2)]">
            {bookings.length} {bookings.length === 1 ? 'clase' : 'clases'}, incluidas las canceladas
          </span>
        </span>
        <FiChevronRight
          aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <ul className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              coach={coaches[booking.coachId]}
              onEvaluate={onEvaluate}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default function BookingsPage() {
  const [toEvaluate, setToEvaluate] = useState<Booking | null>(null)
  const [evaluationSaved, setEvaluationSaved] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const calendarDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = calendarDialogRef.current
    if (!dialog) return
    if (calendarOpen && !dialog.open) dialog.showModal()
    else if (!calendarOpen && dialog.open) dialog.close()
  }, [calendarOpen])

  useEffect(() => {
    if (!calendarOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [calendarOpen])
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined)
  const [coaches, setCoaches] = useState<Record<string, CoachInfo>>({})
  const [schools, setSchools] = useState<SchoolAccess[]>([])
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [toCancel, setToCancel] = useState<Booking | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const response = await getAuthed('/api/bookings')
      const payload = (await response.json()) as { bookings: Booking[] }
      const list = payload.bookings || []
      setBookings(list)

      const coachIds = [...new Set(list.map((b) => b.coachId))]
      const entries = await Promise.all(
        coachIds.map(async (coachId) => {
          try {
            const res = await fetch(`/api/public/coaches/${coachId}`)
            if (!res.ok) return null
            const data = (await res.json()) as { name?: string; avatarUrl?: string | null }
            return [coachId, { name: data.name || '', avatarUrl: data.avatarUrl || null }] as const
          } catch {
            return null
          }
        })
      )
      setCoaches(Object.fromEntries(entries.filter((entry) => entry !== null)))
    } catch (loadError) {
      reportInternalError('ATHLETE_BOOKINGS', loadError)
      setBookings([])
      setError(GENERIC_USER_ERROR)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let active = true
    getAuthed('/api/schools')
      .then((response) => response.json() as Promise<{ schools?: SchoolAccess[] }>)
      .then((payload) => {
        if (active) setSchools(payload.schools || [])
      })
      .catch(() => {
        if (active) setSchools([])
      })
    return () => {
      active = false
    }
  }, [])

  async function cancelBooking(booking: Booking) {
    setCancellingId(booking.id)
    try {
      await deleteAuthed(`/api/bookings/${booking.id}`)
      setToCancel(null)
      await load()
    } catch (cancelError) {
      reportInternalError('ATHLETE_BOOKING_CANCEL', cancelError)
      setError(GENERIC_USER_ERROR)
    } finally {
      setCancellingId(null)
    }
  }

  const upcomingBookings = bookings?.filter((booking) => !isPastBooking(booking)) ?? []
  const pastBookings = bookings?.filter(isPastBooking) ?? []
  const activeCount = upcomingBookings.length

  return (
    <div className="flex flex-col gap-5">
      {schools.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--c-ocean)]">Mis escuelas</h1>
            <p className="mt-1 text-sm text-[var(--c-text-2)]">
              Escuelas de las que formas parte como alumno o coach.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {schools.map(({ school, membership }) => {
              const roles = membership.roles?.length ? membership.roles : [membership.role]
              return (
                <article
                  key={school.id}
                  className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-4 shadow-[var(--shadow-sm)]"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--c-surface)] text-lg font-extrabold text-[var(--c-ocean-mid)]">
                    {school.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold text-[var(--c-ocean)]">{school.name}</h2>
                    <p className="mt-1 text-xs text-[var(--c-text-2)]">
                      {roles.map((role) => SCHOOL_ROLE_LABEL[role] || role).join(' · ')}
                    </p>
                  </div>
                  <Link
                    href={`/school/${school.slug}`}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[var(--c-aqua-strong)] hover:underline"
                  >
                    Ver escuela <FiArrowUpRight aria-hidden="true" />
                  </Link>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--c-ocean)]">Próximas clases</h1>
          {upcomingBookings.length > 0 && (
            <p className="mt-1 text-sm text-[var(--c-text-2)]">
              {activeCount} {activeCount === 1 ? 'clase agendada' : 'clases agendadas'}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-controls="class-calendar-subscription"
          onClick={() => setCalendarOpen(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--c-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--c-ocean)] hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
        >
          <FiCalendar aria-hidden="true" />
          Suscribirme al calendario
        </button>
      </header>

      <dialog
        ref={calendarDialogRef}
        id="class-calendar-subscription"
        aria-labelledby="class-calendar-title"
        onCancel={() => setCalendarOpen(false)}
        onClose={() => setCalendarOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setCalendarOpen(false)
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setCalendarOpen(false)
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-0 text-[var(--c-ocean)] shadow-[var(--shadow-md)] backdrop:bg-[rgba(10,37,64,0.45)] backdrop:backdrop-blur-sm"
      >
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="class-calendar-title" className="text-xl font-bold">
              Suscribirme al calendario
            </h2>
            <button
              type="button"
              aria-label="Cerrar calendario"
              onClick={() => setCalendarOpen(false)}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
            >
              <FiX aria-hidden="true" size={22} />
            </button>
          </div>
          {calendarOpen && <CalendarConnectionCard calendarRole="athlete" embedded />}
        </div>
      </dialog>

      {bookings === undefined ? (
        <Loading />
      ) : error ? (
        <div className="rounded-[var(--r-md)] border border-[var(--c-border)] bg-white p-6 text-center text-[var(--c-text-2)] shadow-[var(--shadow-sm)]">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="btn btn-outline btn-sm mt-4">
            Reintentar
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-surface)] p-9 text-center">
          <FiSearch aria-hidden="true" className="mx-auto mb-3 text-3xl text-[var(--c-aqua)]" />
          <p className="mx-auto mb-4 max-w-xs text-sm leading-relaxed text-[var(--c-text-2)]">
            Aún no tienes clases próximas. Encuentra un coach y reserva tu primer entrenamiento.
          </p>
          <Link
            href="/athlete/find-coach"
            className="inline-flex items-center justify-center rounded-full bg-[var(--c-ocean)] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Buscar coach
          </Link>
        </div>
      ) : (
        <>
          {upcomingBookings.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {upcomingBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  coach={coaches[booking.coachId]}
                  onCancel={(nextBooking) => setToCancel(nextBooking)}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-[var(--r-md)] border border-dashed border-[var(--c-border)] bg-[var(--c-surface)] p-6 text-center text-sm text-[var(--c-text-2)]">
              No tienes clases próximas.
            </div>
          )}
          {pastBookings.length > 0 && (
            <PastBookings
              bookings={pastBookings}
              coaches={coaches}
              onEvaluate={(booking) => {
                setEvaluationSaved(false)
                setToEvaluate(booking)
              }}
            />
          )}
        </>
      )}

      {evaluationSaved && (
        <p role="status" className="text-sm text-[var(--c-ocean)]">
          Evaluación guardada.
        </p>
      )}
      {toEvaluate && (
        <ClassEvaluationForm
          key={toEvaluate.id}
          booking={toEvaluate}
          coachName={coaches[toEvaluate.coachId]?.name || toEvaluate.coachName || 'Tu coach'}
          onClose={() => setToEvaluate(null)}
          onSaved={(evaluation: ClassEvaluation) => {
            setBookings((current) =>
              current?.map((booking) =>
                booking.id === toEvaluate.id ? { ...booking, evaluation } : booking
              )
            )
            setToEvaluate(null)
            setEvaluationSaved(true)
          }}
        />
      )}
      <Sheet open={!!toCancel} onClose={() => setToCancel(null)} label="Cancelar clase">
        {toCancel && (
          <>
            <span className="mx-auto mb-3.5 grid h-11 w-11 place-items-center rounded-full bg-[var(--rose-bg)] text-[var(--rose-tx)]">
              <FiCalendar aria-hidden="true" size={22} />
            </span>
            <h3 className="text-center text-xl font-bold text-[var(--c-ocean)]">
              ¿Cancelar esta clase?
            </h3>
            <p className="mx-auto mt-2 mb-5 max-w-xs text-center text-sm text-[var(--c-text-2)]">
              {dayLabel(toCancel)} · {toCancel.startTime} con{' '}
              {coaches[toCancel.coachId]?.name || toCancel.coachName || 'tu coach'}
            </p>
            <button
              type="button"
              disabled={cancellingId === toCancel.id}
              onClick={() => void cancelBooking(toCancel)}
              className="mt-1 w-full rounded-[var(--r-sm)] bg-[var(--rose-tx)] py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {cancellingId === toCancel.id ? 'Cancelando…' : 'Sí, cancelar reserva'}
            </button>
            <button
              type="button"
              onClick={() => setToCancel(null)}
              className="mt-2 w-full rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white py-3 text-sm font-semibold text-[var(--c-ocean)] transition hover:bg-[var(--c-surface)]"
            >
              Conservar clase
            </button>
          </>
        )}
      </Sheet>
    </div>
  )
}
