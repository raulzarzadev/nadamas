'use client'

import { useState } from 'react'
import { FiClipboard } from 'react-icons/fi'
import ScheduleTag from '@/components/ui/schedule-tag'
import Sheet from '@/components/ui/sheet'
import type { Booking } from '@/lib/coach-booking'
import AgendaAddStudentModal, { type AddStudentPayload } from './AgendaAddStudentModal'
import type { AgendaStudentAction } from './AgendaStudentActions'

export default function ScheduleStudentsModal({
  schoolId,
  bookings,
  slotCount,
  busy,
  error,
  onClose,
  onAdd,
  onResolve,
  onEdit,
}: {
  schoolId: string
  bookings: Booking[]
  slotCount: number
  busy: boolean
  error?: string
  onClose: () => void
  onAdd: (students: AddStudentPayload[]) => void
  onResolve: (booking: Booking, status: 'approved' | 'rejected') => void
  onEdit: (booking: Booking, student: AgendaStudentAction) => void
}) {
  const [adding, setAdding] = useState(false)
  const requests = bookings.filter(
    (booking) => booking.schoolRequestId && booking.status === 'pending'
  )
  const enrolled = bookings.filter(
    (booking) => !booking.schoolRequestId && booking.status !== 'cancelled'
  )
  if (adding)
    return (
      <AgendaAddStudentModal
        schoolId={schoolId}
        slotLabel={`${slotCount} horarios seleccionados`}
        busy={busy}
        submitError={error}
        onClose={() => setAdding(false)}
        onSubmit={onAdd}
      />
    )
  return (
    <Sheet
      open
      onClose={onClose}
      closeDisabled={busy}
      label="Alumnos de los horarios seleccionados"
    >
      <div className="flex flex-col gap-4 px-4 sm:px-0">
        <h2 className="text-lg font-bold">Alumnos</h2>
        <p className="text-sm text-(--c-text-2)">{slotCount} horarios seleccionados</p>
        {error && (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        )}
        <section className="grid gap-2" aria-label="Alumnos inscritos">
          <h3 className="text-sm font-bold">Inscritos</h3>
          {!enrolled.length && (
            <p className="text-sm text-(--c-text-2)">No hay alumnos inscritos en estos horarios.</p>
          )}
          {enrolled.map((booking) => (
            <div key={`${booking.id}:${booking.coachId}`} className="grid gap-2">
              <ScheduleTag
                date={formatDate(booking.date)}
                time={booking.startTime}
                coachName={booking.coachName || 'Sin profe aún'}
                unassigned={booking.coachId === '__unassigned__'}
                groupType={booking.groupType}
                enrolledCount={
                  booking.schoolClassStudents?.filter((student) => !student.pending).length || 1
                }
              />
              <ul className="grid gap-1 px-3 pb-2 text-sm">
                {(booking.schoolClassStudents?.length
                  ? booking.schoolClassStudents.map((student) => ({
                      id: student.id,
                      name: student.name,
                      attended: student.attended || false,
                      note: student.note || '',
                    }))
                  : [
                      {
                        id: booking.athleteId || booking.id,
                        name: booking.athleteName || 'Alumno',
                        attended: booking.attended || false,
                        note: booking.studentNote || '',
                      },
                    ]
                ).map((student) => (
                  <li key={student.id} className="flex items-center justify-between gap-2">
                    <strong className="min-w-0 flex-1">{student.name}</strong>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                      Inscrito
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`Editar la clase de ${student.name} del ${formatDate(booking.date)} a las ${booking.startTime}`}
                      onClick={() =>
                        onEdit(booking, {
                          studentId: student.id,
                          studentName: student.name,
                          attended: student.attended,
                          note: student.note,
                          date: booking.date,
                          startTime: booking.startTime,
                        })
                      }
                      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-ocean) disabled:opacity-50"
                    >
                      <FiClipboard aria-hidden="true" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        {requests.length > 0 && (
          <section className="grid gap-2" aria-label="Solicitudes pendientes">
            <h3 className="text-sm font-bold">Solicitudes ({requests.length})</h3>
            {requests.map((booking) => (
              <div
                key={booking.schoolRequestId}
                className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
              >
                <strong className="text-sm">{booking.athleteName || 'Alumno'}</strong>
                <span className="text-xs text-(--c-text-2)">{formatDate(booking.date)}</span>
                <ScheduleTag
                  time={booking.startTime}
                  coachName={booking.coachName || 'Sin profe aún'}
                  unassigned={booking.coachId === '__unassigned__'}
                  groupType={booking.groupType}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onResolve(booking, 'approved')}
                    className="min-h-11 rounded-full bg-(--c-ocean) px-4 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onResolve(booking, 'rejected')}
                    className="min-h-11 rounded-full border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => setAdding(true)}
          className="min-h-11 rounded-full bg-(--c-aqua-strong) px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          Agregar alumnos
        </button>
      </div>
    </Sheet>
  )
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
