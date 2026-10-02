'use client'

import { useEffect, useState } from 'react'
import Sheet from '@/components/ui/sheet'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import type { CoachAgendaPayload, CoachAvailableSlot } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { capitalizeSchoolTerm } from '@/lib/school'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

export default function SchoolReassignStudent({
  schoolId,
  booking,
  onClose,
  onSaved,
}: {
  schoolId: string
  booking: Booking
  onClose: () => void
  onSaved: () => void
}) {
  const terminology = useSchoolTerminology()
  const participantSingular = terminology.schoolId ? terminology.participantSingular : 'alumno'
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'
  const [date, setDate] = useState(booking.date)
  const [agenda, setAgenda] = useState<CoachAgendaPayload>()
  const [destination, setDestination] = useState('')
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
  const slots = new Map<
    string,
    Pick<CoachAvailableSlot, 'coachId' | 'startTime' | 'endTime' | 'groupType'>
  >()
  for (const slot of agenda?.availableSlots || []) {
    if (slot.date === date && slot.status !== 'blocked')
      slots.set(`${slot.coachId}|${slot.startTime}`, slot)
  }
  for (const item of agenda?.bookings || []) {
    if (item.date === date && item.status !== 'cancelled')
      slots.set(`${item.coachId}|${item.startTime}`, item)
  }
  const available = [...slots.entries()]
    .filter(([, slot]) => {
      if (
        slot.coachId === booking.coachId &&
        date === booking.date &&
        slot.startTime === booking.startTime
      )
        return false
      const classmates = (agenda?.bookings || []).filter(
        (item) =>
          item.coachId === slot.coachId &&
          item.date === date &&
          item.startTime === slot.startTime &&
          item.status !== 'cancelled'
      )
      if (
        (agenda?.blocks || []).some(
          (block) =>
            block.coachId === slot.coachId &&
            block.date === date &&
            (block.allDay ||
              (block.startTime &&
                block.endTime &&
                block.startTime < slot.endTime &&
                slot.startTime < block.endTime))
        )
      )
        return false
      return (
        !classmates.some((item) => item.classFull || item.athleteId === booking.athleteId) &&
        (slot.groupType === 'grupal' || classmates.length === 0)
      )
    })
    .sort((a, b) => a[1].startTime.localeCompare(b[1].startTime))
  async function save() {
    const slot = slots.get(destination)
    if (!slot) return
    setBusy(true)
    setError(null)
    try {
      await postAuthed(`/api/schools/${encodeURIComponent(schoolId)}/agenda/reassign`, {
        bookingId: booking.id,
        coachId: slot.coachId,
        date,
        startTime: slot.startTime,
      })
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
      onClose={() => {
        if (!busy) onClose()
      }}
      label={`Reasignar ${participantSingular}`}
    >
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-(--c-ocean)">Reasignar a {booking.athleteName}</h3>
        <label className="flex flex-col gap-2 text-sm font-bold">
          Fecha
          <input
            type="date"
            className="input input-bordered min-h-11 w-full"
            value={date}
            disabled={busy}
            onChange={(event) => {
              if (event.target.value) {
                setDate(event.target.value)
                setDestination('')
              }
            }}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-bold">
          Clase de destino
          <select
            className="select select-bordered min-h-11 w-full"
            value={destination}
            disabled={busy || !agenda}
            onChange={(event) => setDestination(event.target.value)}
          >
            <option value="">{agenda ? 'Selecciona una clase' : 'Cargando horarios…'}</option>
            {available.map(([key, slot]) => (
              <option key={key} value={key}>
                {slot.startTime}–{slot.endTime} ·{' '}
                {agenda?.coachNames?.[slot.coachId] || capitalizeSchoolTerm(coachSingular)} ·{' '}
                {slot.groupType === 'grupal' ? 'Grupal' : 'Particular'}
              </option>
            ))}
          </select>
        </label>
        {agenda && available.length === 0 && (
          <p className="text-sm text-(--c-text-2)">
            No hay clases disponibles en esta fecha. Elige otra fecha o agrega un horario.
          </p>
        )}
        <p className="text-sm text-(--c-text-2)">
          Al cambiar la clase, la asistencia y evaluación anteriores se conservarán. en el
          historial.
        </p>
        {error && (
          <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
            {error}
          </p>
        )}
        <div className="sticky bottom-0 flex gap-2 bg-white py-3">
          <button
            type="button"
            className="btn btn-primary min-h-11 flex-1"
            disabled={busy || !destination || !agenda}
            onClick={() => void save()}
          >
            {busy ? 'Guardando…' : `Reasignar ${participantSingular}`}
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
