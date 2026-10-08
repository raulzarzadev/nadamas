'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FiCheck, FiHash, FiSearch } from 'react-icons/fi'
import Avatar from '@/components/ui/avatar'
import DateInput from '@/components/ui/date-input'
import ScheduleTag from '@/components/ui/schedule-tag'
import Sheet from '@/components/ui/sheet'
import {
  ATTENDANCE_MESSAGES,
  type AttendanceCandidate,
  type AttendanceMethod,
  type AttendanceRecord,
} from '@/lib/attendance'
import { AuthedApiError, getAuthed, postAuthed } from '@/lib/client/authed-api'
import { type SchoolClassOccurrence, UNASSIGNED_SCHOOL_COACH_ID } from '@/lib/school'
import QrCameraScanner from './QrCameraScanner'

type Mode = AttendanceMethod
type Candidate = AttendanceCandidate
type Flags = { addToClass?: true; linkToSchool?: true; promoteToGroup?: true }
type Selection = { candidate: Candidate; method: Mode; qrValue?: string; flags: Flags }
type Payload = {
  classes: Array<SchoolClassOccurrence & { sourceOccurrenceIds?: string[] }>
  coachNames: Record<string, string>
  roster?: Candidate[]
  records?: AttendanceRecord[]
  candidates?: Candidate[]
}
const ERRORS: Record<string, string> = {
  ...ATTENDANCE_MESSAGES,
  missing_person: 'No encontramos al atleta. Revisa el ID o su credencial.',
  inactive_student: 'Este atleta está inactivo. La dirección debe revisar su inscripción.',
  unauthorized: 'No tienes permiso para pasar lista en esta clase.',
  blocked: 'La clase está bloqueada. Desbloquéala desde Configurar clase para pasar lista.',
  not_found: 'No encontramos al atleta. Revisa el ID o su credencial.',
  forbidden: 'No tienes permiso para pasar lista en esta clase.',
}

export default function AttendanceModal({
  schoolId,
  date,
  occurrenceId,
  initialSlot,
  onClose,
  onUpdated,
}: {
  schoolId: string
  date: string
  occurrenceId?: string
  initialSlot?: { coachId: string; startTime: string }
  onClose: () => void
  onUpdated: () => void
}) {
  const [selectedDate, setSelectedDate] = useState(date)
  const [selectedClass, setSelectedClass] = useState(occurrenceId || '')
  const [payload, setPayload] = useState<Payload>({ classes: [], coachNames: {} })
  const [mode, setMode] = useState<Mode>('name')
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<(Selection & { code: string }) | null>(null)
  const requestVersion = useRef(0)
  const endpoint = `/api/schools/${encodeURIComponent(schoolId)}/attendance`
  const selected = payload.classes.find(
    (item) => item.id === selectedClass || item.sourceOccurrenceIds?.includes(selectedClass)
  )

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ date: selectedDate })
      if (selectedClass) params.set('occurrenceId', selectedClass)
      const response = await getAuthed(`${endpoint}?${params}`)
      const next = (await response.json()) as Payload
      if (version === requestVersion.current) {
        setPayload(next)
        if (!selectedClass && initialSlot && selectedDate === date) {
          const match = next.classes.find(
            (item) =>
              item.startTime === initialSlot.startTime &&
              (item.teacherIds.includes(initialSlot.coachId) ||
                (!item.teacherIds.length && initialSlot.coachId === UNASSIGNED_SCHOOL_COACH_ID))
          )
          if (match) setSelectedClass(match.id)
        }
      }
    } catch {
      if (version === requestVersion.current)
        setError('No pudimos cargar las clases. Inténtalo de nuevo.')
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [date, endpoint, initialSlot, selectedClass, selectedDate])

  useEffect(() => {
    void refresh()
    return () => {
      requestVersion.current += 1
    }
  }, [refresh])

  function changeClass(id: string) {
    setSelectedClass(id)
    setCandidates(null)
    setMessage('')
    setQuery('')
    setConfirmation(null)
  }

  async function register(selection: Selection) {
    if (busy || !selectedClass) return
    setBusy(true)
    setError('')
    setMessage('')
    const numericId = selection.candidate.numericId
    try {
      const response = await postAuthed(endpoint, {
        occurrenceId: selectedClass,
        ...(selection.qrValue
          ? { qrValue: selection.qrValue }
          : selection.candidate.studentId
            ? { studentId: selection.candidate.studentId }
            : { numericId }),
        method: selection.method,
        ...selection.flags,
      })
      const result = (await response.json()) as {
        alreadyRecorded: boolean
        record?: AttendanceRecord
      }
      setConfirmation(null)
      setCandidates(null)
      setQuery('')
      setMessage(
        result.alreadyRecorded
          ? `${selection.candidate.name}: asistencia ya registrada.`
          : `${selection.candidate.name}: asistencia registrada.`
      )
      if (result.record?.occurrenceId && result.record.occurrenceId !== selectedClass)
        setSelectedClass(result.record.occurrenceId)
      else await refresh()
      onUpdated()
    } catch (caught) {
      const code =
        caught instanceof AuthedApiError
          ? (caught as AuthedApiError & { code?: string }).code
          : undefined
      if (code && ['not_enrolled', 'outside_school', 'promote_required'].includes(code)) {
        setConfirmation({ ...selection, code })
      } else {
        setError(
          (code && ERRORS[code]) || 'No pudimos registrar la asistencia. Inténtalo de nuevo.'
        )
      }
    } finally {
      setBusy(false)
    }
  }

  async function search(raw = query, searchMode: Mode = mode) {
    if (!selectedClass || busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const params = new URLSearchParams({
        occurrenceId: selectedClass,
        mode: searchMode,
        query: raw.trim(),
      })
      const response = await getAuthed(`${endpoint}?${params}`)
      const found = ((await response.json()) as Payload).candidates || []
      setCandidates(found)
      if (searchMode === 'qr' && found.length === 1) {
        // Release the request guard before registering the scanned athlete.
        setBusy(false)
        await register({ candidate: found[0], method: 'qr', qrValue: raw.trim(), flags: {} })
      }
    } catch {
      setError('No pudimos buscar al atleta. Revisa los datos e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const list = candidates || payload.roster || []
  return (
    <Sheet
      open
      onClose={onClose}
      label="Pase de lista"
      size="lg"
      keyboardAware
      closeDisabled={busy}
    >
      <div className="grid gap-4">
        <div>
          <h2 className="text-xl font-bold text-(--c-ocean)">Pase de lista</h2>
          <p className="mt-1 text-sm text-(--c-text-2)">
            Elige una clase y registra la asistencia de sus atletas.
          </p>
        </div>
        <DateInput
          label="Fecha de la clase"
          value={selectedDate}
          onChange={(value) => {
            setSelectedDate(value)
            changeClass('')
          }}
          disabled={busy}
        />
        {loading ? (
          <p role="status">Cargando clases…</p>
        ) : !payload.classes.length ? (
          <p className="text-sm text-(--c-text-2)">No hay clases para esta fecha.</p>
        ) : (
          <fieldset className="grid gap-2" aria-label="Clase para pasar lista">
            {payload.classes.map((item) => (
              <button
                type="button"
                key={item.id}
                disabled={busy}
                aria-pressed={selected?.id === item.id}
                onClick={() => changeClass(item.id)}
                className={`min-h-11 rounded-xl border p-2 text-left ${selected?.id === item.id ? 'border-(--c-ocean) bg-(--c-surface) ring-1 ring-(--c-ocean)' : 'border-(--c-border) bg-white'}`}
              >
                <ScheduleTag
                  time={`${item.startTime}–${item.endTime}`}
                  unassigned={!item.teacherIds.length}
                  coachName={
                    item.teacherIds
                      .map((id) => payload.coachNames[id])
                      .filter(Boolean)
                      .join(', ') || 'Sin profe aún'
                  }
                  groupType={item.type === 'group' ? 'grupal' : 'particular'}
                />
              </button>
            ))}
          </fieldset>
        )}
        {selected && !loading && (
          <>
            <p className="text-sm font-semibold">
              {(payload.roster || []).filter((item) => item.attended).length} asistencias
              registradas · {payload.roster?.length || 0} alumnos en la clase
            </p>
            <fieldset className="flex flex-wrap gap-2" aria-label="Método para pasar lista">
              {(
                [
                  { id: 'qr', label: 'Escanear QR' },
                  { id: 'name', label: 'Nombre' },
                  { id: 'id', label: 'ID del atleta' },
                ] as const
              ).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={mode === item.id}
                  disabled={busy}
                  className={`btn min-h-11 ${mode === item.id ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    setMode(item.id)
                    setCandidates(null)
                    setQuery('')
                    setError('')
                  }}
                >
                  {item.label}
                </button>
              ))}
            </fieldset>
            {mode === 'qr' ? (
              !busy &&
              !confirmation && <QrCameraScanner onScan={(value) => void search(value, 'qr')} />
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void search()
                }}
                className="flex items-end gap-2"
              >
                <label className="grid min-w-0 flex-1 gap-1 text-sm font-semibold">
                  {mode === 'id' ? 'ID de seis dígitos' : 'Nombre del atleta'}
                  <input
                    value={query}
                    onChange={(event) =>
                      setQuery(
                        mode === 'id'
                          ? event.target.value.replace(/\D/g, '').slice(0, 6)
                          : event.target.value
                      )
                    }
                    maxLength={mode === 'id' ? 6 : 100}
                    inputMode={mode === 'id' ? 'numeric' : 'text'}
                    autoComplete="off"
                    disabled={busy}
                    className="min-h-11 min-w-0 rounded-xl border border-(--c-border) bg-white px-3 font-normal"
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-outline min-h-11"
                  aria-label="Buscar atleta"
                  disabled={busy || (mode === 'id' ? query.length !== 6 : query.trim().length < 2)}
                >
                  {mode === 'id' ? <FiHash /> : <FiSearch />}
                </button>
              </form>
            )}
            {busy && <p role="status">Procesando…</p>}
            {confirmation && (
              <div className="grid gap-3 rounded-xl border border-(--c-border) bg-(--c-surface) p-4">
                <strong>{confirmation.candidate.name}</strong>
                <p className="text-sm">
                  {confirmation.code === 'outside_school'
                    ? 'Este atleta no pertenece a la escuela. ¿Vincularlo a la escuela, incorporarlo a esta clase y registrar su asistencia?'
                    : confirmation.code === 'promote_required'
                      ? 'Esta clase particular ya tiene un alumno. ¿Convertirla en grupal, incorporar al atleta y registrar su asistencia?'
                      : 'Este atleta no está inscrito. ¿Incorporarlo a la clase y registrar su asistencia?'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className="btn btn-outline min-h-11"
                    onClick={() => setConfirmation(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="btn btn-primary min-h-11"
                    onClick={() =>
                      void register({
                        ...confirmation,
                        flags: {
                          ...confirmation.flags,
                          addToClass: true,
                          ...(confirmation.code === 'outside_school' ? { linkToSchool: true } : {}),
                          ...(confirmation.code === 'promote_required'
                            ? { promoteToGroup: true }
                            : {}),
                        },
                      })
                    }
                  >
                    Confirmar y registrar
                  </button>
                </div>
              </div>
            )}
            {!confirmation && (
              <ul className="grid gap-2">
                {list.map((candidate, index) => (
                  <li
                    key={candidate.studentId || candidate.numericId || index}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-(--c-surface) p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar
                        name={candidate.name}
                        src={candidate.photoURL}
                        size={36}
                        tone="white"
                      />
                      <div>
                        <strong className="break-words">{candidate.name}</strong>
                        <p className="text-xs text-(--c-text-2)">
                          {candidate.numericId || 'ID por asignar'}
                          {candidate.pending ? ' · Inscripción pendiente' : ''}
                        </p>
                      </div>
                    </div>
                    {candidate.attended ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-(--c-ocean)">
                        <FiCheck aria-hidden="true" /> Presente
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline min-h-11"
                        disabled={busy}
                        onClick={() =>
                          void register({
                            candidate,
                            method: mode === 'qr' ? 'name' : mode,
                            flags: {},
                          })
                        }
                      >
                        Registrar
                      </button>
                    )}
                  </li>
                ))}
                {candidates && !list.length && (
                  <li className="text-sm text-(--c-text-2)">
                    No encontramos atletas con esos datos.
                  </li>
                )}
              </ul>
            )}
          </>
        )}
        {message && (
          <p role="status" className="rounded-xl bg-(--c-surface) p-3 text-sm font-semibold">
            {message}
          </p>
        )}
        {error && (
          <div role="alert" className="grid gap-2 text-sm text-(--c-error,#b91c1c)">
            <p>{error}</p>
            {!selected && (
              <button
                type="button"
                className="btn btn-outline min-h-11"
                onClick={() => void refresh()}
              >
                Reintentar
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}
