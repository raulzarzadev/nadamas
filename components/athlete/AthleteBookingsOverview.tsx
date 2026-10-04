'use client'

import Loading from '@comps/Loading'
import Sheet from '@comps/ui/sheet'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { FiCalendar, FiChevronRight, FiEdit3, FiSearch, FiUser, FiX } from 'react-icons/fi'
import ClassEvaluationForm from '@/components/bookings/ClassEvaluationForm'
import CalendarConnectionCard from '@/components/calendar/CalendarConnectionCard'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { auth } from '@/firebase/index'
import { type ClassEvaluation, canEvaluateBooking } from '@/lib/class-evaluation'
import { deleteAuthed, getAuthed, postAuthed } from '@/lib/client/authed-api'
import { useSchoolAgendaUpdates } from '@/lib/client/use-school-agenda-updates'
import type { Booking } from '@/lib/coach-booking'
import type { SchoolHistorySharedComment } from '@/lib/school-student-history'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

interface CoachInfo {
  name: string
  avatarUrl: string | null
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

function BookingGroupRow({
  bookings,
  coach,
  onCancel,
  onEvaluate,
}: {
  bookings: Booking[]
  coach?: CoachInfo
  onCancel?: (booking: Booking) => void
  onEvaluate?: (booking: Booking) => void
}) {
  const booking = bookings[0]
  const terminology = useSchoolTerminology()
  const coachName =
    coach?.name ||
    booking.coachName ||
    `${terminology.schoolId ? terminology.coachSingular : 'coach'} de natación`
  const studentCount = bookings.reduce(
    (total, item) => total + (item.schoolClassStudentCount || 1),
    0
  )
  return (
    <li className="rounded-xl border border-[var(--c-border)] bg-white px-3 py-3 sm:px-4">
      <div className="flex items-start gap-3 sm:items-center">
        <div className="w-24 shrink-0 border-r border-[var(--c-border)] pr-3">
          <p className="text-sm font-bold capitalize text-[var(--c-text-2)]">{dayLabel(booking)}</p>
          <p className="text-lg font-extrabold leading-tight text-[var(--c-ocean)]">
            {booking.startTime}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
              <p className="truncate font-bold text-[var(--c-ocean)]">{coachName}</p>
              <span className="text-sm text-[var(--c-text-2)]">
                · {timeLabel(booking).split(' · ')[1] || 'Clase'}
              </span>
            </div>
            <Link
              href={`/athlete/coach/${booking.coachId}`}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 text-sm font-semibold text-[var(--c-aqua-strong)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
            >
              Ver perfil <FiChevronRight aria-hidden="true" size={14} />
            </Link>
          </div>
          <p className="flex items-center gap-1 text-sm text-[var(--c-text-2)]">
            <FiUser aria-hidden="true" size={14} /> {modalityLabel(booking)}
            {studentCount > 1 && <span>· {studentCount} alumnos</span>}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {bookings.map((item) => {
              const status = STATUS_STYLE[item.status] || {
                label: item.status,
                className: 'border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-2)]',
              }
              return (
                <li key={item.id} className="flex min-h-9 items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--c-ocean)]">
                    {item.athleteName}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                  {onCancel && (
                    <button
                      type="button"
                      onClick={() => onCancel(item)}
                      aria-label={`Cancelar clase de ${item.athleteName}`}
                      className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold text-[var(--rose-tx)] hover:bg-[var(--rose-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                    >
                      Cancelar
                    </button>
                  )}
                  {onEvaluate && canEvaluateBooking(item) && (
                    <button
                      type="button"
                      onClick={() => onEvaluate(item)}
                      className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold text-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
                    >
                      {item.evaluation ? 'Editar evaluación' : 'Evaluar'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </li>
  )
}

function groupByClassTime(bookings: Booking[]) {
  const groups = new Map<string, Booking[]>()
  for (const booking of bookings) {
    const key = [
      booking.schoolId || '',
      booking.coachId,
      booking.date,
      booking.startTime,
      booking.endTime,
      booking.groupType,
      booking.locationName,
    ].join('::')
    groups.set(key, [...(groups.get(key) || []), booking])
  }
  return [...groups.values()]
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
        <ul className="flex flex-col gap-1.5">
          {groupByClassTime(bookings).map((group) => (
            <BookingGroupRow
              key={group[0].id}
              bookings={group}
              coach={coaches[group[0].coachId]}
              onEvaluate={onEvaluate}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default function AthleteBookingsOverview() {
  const terminology = useSchoolTerminology()
  const [toEvaluate, setToEvaluate] = useState<Booking | null>(null)
  const [evaluationSaved, setEvaluationSaved] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined)
  const [coaches, setCoaches] = useState<Record<string, CoachInfo>>({})
  const { selectedId: selectedSchoolId } = useSchoolSelection({
    includePersonal: true,
    athleteMode: true,
  })
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [toCancel, setToCancel] = useState<Booking | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [studentComments, setStudentComments] = useState<SchoolHistorySharedComment[]>([])
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [commentError, setCommentError] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const response = await getAuthed('/api/bookings')
      const payload = (await response.json()) as { bookings: Booking[] }
      const list = payload.bookings || []
      const linkedStudentId = auth.currentUser?.uid
      const schoolIds = [
        ...new Set(
          [...list.map((booking) => booking.schoolId), selectedSchoolId].filter(
            (id): id is string => typeof id === 'string' && !!id
          )
        ),
      ]
      const histories = await Promise.all(
        linkedStudentId
          ? schoolIds.map(async (schoolId) => {
              try {
                const historyResponse = await getAuthed(
                  `/api/schools/${encodeURIComponent(schoolId as string)}/students/${encodeURIComponent(linkedStudentId)}/history`
                )
                if (!historyResponse.ok) return []
                const history = (await historyResponse.json()) as {
                  comments?: SchoolHistorySharedComment[]
                }
                return history.comments || []
              } catch {
                return []
              }
            })
          : []
      )
      setStudentComments(histories.flat().sort((a, b) => a.createdAt - b.createdAt))
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
  }, [selectedSchoolId])

  useEffect(() => {
    void load()
  }, [load])

  useSchoolAgendaUpdates(selectedSchoolId, () => {
    void load()
  })

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

  async function saveSharedComment() {
    if (!selectedSchoolId || !commentText.trim() || commentBusy) return
    const studentId = auth.currentUser?.uid
    if (!studentId) {
      setCommentError(true)
      return
    }
    setCommentBusy(true)
    setCommentError(false)
    try {
      await postAuthed(
        `/api/schools/${encodeURIComponent(selectedSchoolId)}/students/${encodeURIComponent(studentId)}/history/comments`,
        { text: commentText.trim() }
      )
      setCommentOpen(false)
      setCommentText('')
      await load()
    } catch {
      setCommentError(true)
    } finally {
      setCommentBusy(false)
    }
  }

  const selectedBookings =
    bookings?.filter((booking) => !selectedSchoolId || booking.schoolId === selectedSchoolId) ?? []
  const upcomingBookings = selectedBookings.filter((booking) => !isPastBooking(booking))
  const pastBookings = selectedBookings.filter(isPastBooking)
  const upcomingGroups = groupByClassTime(upcomingBookings)
  const activeCount = upcomingBookings.length

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--c-ocean)]">Próximas clases</h1>
          {upcomingBookings.length > 0 && (
            <p className="mt-1 text-sm text-[var(--c-text-2)]">
              {activeCount} {activeCount === 1 ? 'clase agendada' : 'clases agendadas'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedSchoolId && (
            <button
              type="button"
              onClick={() => setCommentOpen(true)}
              aria-label="Escribir comentario sobre ti"
              title="Escribir comentario"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-sm)] border border-[var(--c-ocean)] text-lg text-[var(--c-ocean)] hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
            >
              <FiEdit3 aria-hidden="true" />
            </button>
          )}
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
        </div>
      </header>

      {studentComments.length > 0 && (
        <section className="rounded-[var(--r-sm)] border border-[var(--c-border)] bg-white p-4">
          <h2 className="font-bold text-[var(--c-ocean)]">Comentarios sobre ti</h2>
          <ul className="mt-2 grid gap-2">
            {studentComments.map((comment) => (
              <li key={comment.id} className="text-sm text-[var(--c-text-2)]">
                <span className="font-semibold text-[var(--c-ocean)]">{comment.authorName}: </span>
                <span className="whitespace-pre-wrap">{comment.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Sheet
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        label="Suscribirme al calendario"
        keyboardAware
        fullBleedMobile
        size="xl"
      >
        <div id="class-calendar-subscription" className="grid gap-4 px-4 pb-3 sm:px-0 sm:pb-0">
          <div className="flex items-center justify-between gap-3">
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
      </Sheet>

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
            Aún no tienes clases próximas.{' '}
            {terminology.schoolId
              ? `Busca a tu ${terminology.coachSingular} y reserva tu primer entrenamiento.`
              : 'Encuentra un coach y reserva tu primer entrenamiento.'}
          </p>
          <Link
            href="/athlete/find-coach"
            className="inline-flex items-center justify-center rounded-full bg-[var(--c-ocean)] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Buscar {terminology.schoolId ? terminology.coachSingular : 'coach'}
          </Link>
        </div>
      ) : (
        <>
          {upcomingBookings.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {upcomingGroups.map((group) => (
                <BookingGroupRow
                  key={group[0].id}
                  bookings={group}
                  coach={coaches[group[0].coachId]}
                  onCancel={setToCancel}
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
          coachName={
            coaches[toEvaluate.coachId]?.name ||
            toEvaluate.coachName ||
            `Tu ${terminology.schoolId ? terminology.coachSingular : 'coach'}`
          }
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
      <Sheet
        open={commentOpen}
        onClose={() => setCommentOpen(false)}
        label="Escribir comentario sobre ti"
        keyboardAware
      >
        {commentOpen && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--c-ocean)]">Comentario sobre ti</h2>
              <p className="mt-2 text-sm text-[var(--c-text-2)]">
                Tu comentario podrán verlo tú y tus profesores.
              </p>
            </div>
            <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--c-ocean)]">
              Comentario
              <textarea
                rows={5}
                maxLength={1000}
                value={commentText}
                onChange={(event) => setCommentText(event.currentTarget.value)}
                disabled={commentBusy}
                placeholder="Escribe un comentario sobre ti…"
                className="w-full resize-y rounded-[var(--r-sm)] border border-[var(--c-border)] p-3 text-sm font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
              />
            </label>
            {commentError && (
              <p role="alert" className="text-sm font-semibold text-[var(--c-error,#b91c1c)]">
                No se pudo guardar el comentario. Inténtalo de nuevo.
              </p>
            )}
            <button
              type="button"
              onClick={() => void saveSharedComment()}
              disabled={!commentText.trim() || commentBusy}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--c-aqua)] px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {commentBusy ? 'Guardando…' : 'Guardar comentario'}
            </button>
          </div>
        )}
      </Sheet>
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
              {coaches[toCancel.coachId]?.name ||
                toCancel.coachName ||
                `tu ${terminology.schoolId ? terminology.coachSingular : 'coach'}`}
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
