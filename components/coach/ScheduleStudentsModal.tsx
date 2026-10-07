'use client'

import { useState } from 'react'
import ClassCard from '@/components/ui/class-card'
import Sheet from '@/components/ui/sheet'
import StudentTag from '@/components/ui/student-tag'
import type { CoachAvailableSlot } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import AgendaAddStudentModal, { type AddStudentPayload } from './AgendaAddStudentModal'
import type { AgendaStudentAction } from './AgendaStudentActions'

export default function ScheduleStudentsModal({
  schoolId,
  bookings,
  slotCount,
  selectedSlots,
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
  selectedSlots: CoachAvailableSlot[]
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
  const classes = new Map<string, Booking[]>()
  for (const booking of enrolled) {
    const key = [
      booking.schoolId || schoolId,
      booking.coachId,
      booking.date,
      booking.startTime,
      booking.endTime,
      booking.groupType,
      booking.groupType === 'particular' ? booking.schoolClassId || booking.id : 'group',
    ].join('|')
    classes.set(key, [...(classes.get(key) || []), booking])
  }
  if (adding)
    return (
      <AgendaAddStudentModal
        schoolId={schoolId}
        slotLabel={`${slotCount} horarios seleccionados`}
        selectedSlots={selectedSlots}
        promotionRequired={enrolled.some(
          (booking) => booking.groupType === 'particular' && Boolean(booking.schoolClassId)
        )}
        occupiedIndividual={enrolled.some(
          (booking) => booking.groupType === 'particular' && !booking.schoolClassId
        )}
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
        <p className="text-sm text-(--c-text-2)">
          {slotCount} {slotCount === 1 ? 'horario seleccionado' : 'horarios seleccionados'}
        </p>
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
          {[...classes.entries()].map(([key, classBookings]) => {
            const booking = classBookings[0]
            const students = new Map<
              string,
              {
                booking: Booking
                id: string
                name: string
                attended: boolean
                note: string
                pending: boolean
              }
            >()
            for (const item of classBookings) {
              const roster = item.schoolClassStudents?.length
                ? item.schoolClassStudents.map((student) => ({
                    id: student.id,
                    name: student.name,
                    attended: student.attended || false,
                    note: student.note || '',
                    pending: Boolean(student.pending),
                  }))
                : [
                    {
                      id: item.athleteId || item.id,
                      name: item.athleteName || 'Alumno',
                      attended: item.attended || false,
                      note: item.studentNote || '',
                      pending: item.status === 'pending',
                    },
                  ]
              for (const student of roster) students.set(student.id, { ...student, booking: item })
            }
            return (
              <div key={key} className="@container">
                <ClassCard
                  date={formatDate(booking.date)}
                  time={booking.startTime}
                  coachName={
                    booking.coachName ||
                    selectedSlots.find((slot) => slot.coachId === booking.coachId)?.coachName ||
                    'Sin profe aún'
                  }
                  showCoachName
                  unassigned={booking.coachId === '__unassigned__'}
                  groupType={booking.groupType}
                  status={booking.groupType === 'grupal' ? 'group' : 'booked'}
                  showSeparator={false}
                >
                  <ul className="grid gap-2 pb-1 text-sm">
                    {[...students.values()].map((student) => (
                      <li key={student.id}>
                        <StudentTag
                          name={student.name}
                          status={student.pending ? 'pending' : 'enrolled'}
                          disabled={busy}
                          editLabel={`Editar la clase de ${student.name} del ${formatDate(booking.date)} a las ${booking.startTime}`}
                          onEdit={() =>
                            onEdit(student.booking, {
                              studentId: student.id,
                              studentName: student.name,
                              attended: student.attended,
                              note: student.note,
                              date: booking.date,
                              startTime: booking.startTime,
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </ClassCard>
              </div>
            )
          })}
        </section>
        {requests.length > 0 && (
          <section className="grid gap-2" aria-label="Solicitudes pendientes">
            <h3 className="text-sm font-bold">Solicitudes ({requests.length})</h3>
            {requests.map((booking) => (
              <ClassCard
                key={booking.schoolRequestId}
                date={formatDate(booking.date)}
                time={booking.startTime}
                coachName={booking.coachName || 'Sin profe aún'}
                showCoachName
                unassigned={booking.coachId === '__unassigned__'}
                groupType={booking.groupType}
                status={booking.groupType === 'grupal' ? 'group' : 'booked'}
                pending
                showSeparator={false}
              >
                <StudentTag name={booking.athleteName || 'Alumno'} status="pending" />
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
              </ClassCard>
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
