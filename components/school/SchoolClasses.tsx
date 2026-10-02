'use client'

import { useEffect, useRef, useState } from 'react'
import { FiCalendar, FiCheck, FiMapPin, FiPlus, FiX } from 'react-icons/fi'
import CoachAgenda from '@/components/coach/CoachAgenda'
import { useUser } from '@/context/UserContext'
import { getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import { useSchoolAgendaUpdates } from '@/lib/client/use-school-agenda-updates'
import {
  type SchoolBookingMode,
  type SchoolClassOccurrence,
  type SchoolClassRequest,
  type SchoolLocation,
  type SchoolStudent,
  schoolMembershipHasRole,
} from '@/lib/school'
import SchoolNoSelection from './SchoolNoSelection'
import SchoolReviewForm from './SchoolReviewForm'
import SchoolSelector from './SchoolSelector'
import { useSchoolSelection } from './useSchoolSelection'

interface Teacher {
  status?: string
  id: string
  name: string
  availability: Array<{ day: number; start: string; end: string }>
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function SchoolClasses() {
  const { schools, selected, selectedId, status: schoolStatus, selectSchool } = useSchoolSelection()
  const { user } = useUser() as {
    user: {
      uid?: string
      id?: string
      nickname?: string
      displayName?: string
      name?: string
      email?: string
    } | null
  }
  const previousSchoolId = useRef<string | null>(null)
  const [agendaRevision, setAgendaRevision] = useState(0)
  useSchoolAgendaUpdates(selectedId, () => setAgendaRevision((revision) => revision + 1))
  const [scheduleCoachId, setScheduleCoachId] = useState('')
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)
  const [classes, setClasses] = useState<SchoolClassOccurrence[]>([])
  const [students, setStudents] = useState<SchoolStudent[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [locations, setLocations] = useState<SchoolLocation[]>([])
  const [bookingMode, setBookingMode] = useState<SchoolBookingMode>('request')
  const [requests, setRequests] = useState<SchoolClassRequest[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<SchoolClassRequest | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // biome-ignore lint/correctness/useExhaustiveDependencies: agendaRevision reloads school requests and configuration after a remote mutation.
  useEffect(() => {
    if (!selectedId) return
    const resetSelection = previousSchoolId.current !== selectedId
    previousSchoolId.current = selectedId
    let active = true
    if (resetSelection) {
      setScheduleEditorOpen(false)
      setLoading(true)
    }
    setBookingMode(selected?.school.bookingMode || 'request')
    const isDirector = schoolMembershipHasRole(selected?.membership, 'director')
    const isStudentAccount = schoolMembershipHasRole(selected?.membership, 'student')
    const directorId = isDirector ? selected?.membership.userId : undefined
    if (resetSelection) setScheduleCoachId(directorId || '')
    const load = async () => {
      const [classResponse, studentResponse, teacherResponse, locationResponse] = await Promise.all(
        [
          getAuthed(`/api/schools/${selectedId}/classes`),
          getAuthed(`/api/schools/${selectedId}/students`),
          getAuthed(`/api/schools/${selectedId}/teachers`),
          getAuthed(`/api/schools/${selectedId}/locations`),
        ]
      )
      const [classPayload, studentPayload, teacherPayload, locationPayload] = await Promise.all([
        classResponse.json() as Promise<{ classes?: SchoolClassOccurrence[] }>,
        studentResponse.json() as Promise<{ students?: SchoolStudent[] }>,
        teacherResponse.json() as Promise<{ teachers?: Teacher[] }>,
        locationResponse.json() as Promise<{ locations?: SchoolLocation[] }>,
      ])
      let requestPayload: { requests?: SchoolClassRequest[] } = {}
      if (isDirector || isStudentAccount) {
        const requestResponse = await getAuthed(`/api/schools/${selectedId}/class-requests`)
        requestPayload = (await requestResponse.json()) as { requests?: SchoolClassRequest[] }
      }
      return { classPayload, studentPayload, teacherPayload, locationPayload, requestPayload }
    }
    load()
      .then(({ classPayload, studentPayload, teacherPayload, locationPayload, requestPayload }) => {
        if (!active) return
        setClasses(classPayload.classes || [])
        setStudents(studentPayload.students || [])
        const nextTeachers = teacherPayload.teachers || []
        setTeachers(nextTeachers)
        setScheduleCoachId((current) => {
          if (!resetSelection && current === '') return current
          if (isDirector && current === directorId) return current
          if (
            current &&
            nextTeachers.some((teacher) => teacher.id === current && teacher.status === 'active')
          )
            return current
          return isDirector ? directorId || '' : ''
        })
        setLocations(locationPayload.locations || [])
        setRequests(requestPayload.requests || [])
      })
      .catch(() => {
        if (!active) return
        if (resetSelection) setScheduleCoachId(directorId || '')
        setMessage('No se pudo cargar la agenda escolar.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [agendaRevision, selectedId, selected?.membership, selected?.school.bookingMode])

  if (schoolStatus === 'loading')
    return <div className="py-16 text-center text-sm text-(--c-text-2)">Cargando clases…</div>
  if (schoolStatus === 'error')
    return <p className="text-sm text-(--c-error,#b91c1c)">No pudimos cargar tus escuelas.</p>
  if (!selected) return <SchoolNoSelection />
  const activeSchool = selected
  const isDirector = schoolMembershipHasRole(selected.membership, 'director')
  const isStudentAccount = schoolMembershipHasRole(selected.membership, 'student')
  const isTeacher = schoolMembershipHasRole(selected.membership, 'teacher')
  const directorId = isDirector ? selected.membership.userId : undefined
  const directorTeacher = teachers.find((teacher) => teacher.id === directorId)
  const directorName =
    directorTeacher?.name ||
    (user && (user.uid === directorId || user.id === directorId)
      ? user.nickname || user.displayName || user.name || user.email?.split('@')[0]
      : undefined) ||
    'Mi horario'
  const activeTeachers = teachers.filter(
    (teacher) => teacher.status === 'active' && teacher.id !== directorId
  )
  const scheduleCoachOptions = [
    ...(isDirector && directorId ? [{ id: directorId, name: directorName }] : []),
    ...activeTeachers.map(({ id, name }) => ({ id, name })),
  ]
  const visibleClasses = classes.filter(
    (item) => item.status !== 'cancelled' || item.date >= today()
  )

  async function updateClass(id: string, status: 'cancelled' | 'completed') {
    try {
      await patchAuthed(`/api/schools/${activeSchool.school.id}/classes/${id}`, { status })
      setClasses((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
    } catch {
      setMessage('No se pudo actualizar la clase.')
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <h1 className="sr-only">Horarios</h1>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SchoolSelector
            schools={schools}
            selectedId={selected.school.id}
            onChange={selectSchool}
          />
          {isDirector && (
            <div className="flex flex-col gap-2 sm:w-64">
              <label htmlFor="schedule-coach" className="text-sm font-bold text-(--c-ocean)">
                Administrar horarios de un profe
              </label>
              <select
                id="schedule-coach"
                className="select select-bordered min-h-11 w-full"
                value={scheduleCoachId}
                disabled={loading}
                onChange={(event) => setScheduleCoachId(event.target.value)}
              >
                {activeTeachers.length > 0 && <option value="">Todos los profes</option>}
                {scheduleCoachOptions.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {isDirector && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setScheduleEditorOpen(true)}
            className="btn btn-primary min-h-11 gap-2 self-start sm:self-auto"
          >
            <FiPlus aria-hidden="true" /> Agregar o quitar horas
          </button>
        )}
        {!isDirector && isStudentAccount && (
          <button
            type="button"
            onClick={() => {
              setSelectedRequest(null)
              setShowCreate(true)
            }}
            className="btn btn-primary min-h-11 gap-2"
          >
            <FiPlus aria-hidden="true" /> Solicitar horario
          </button>
        )}
      </div>
      {message && (
        <p className="rounded-[var(--r-sm)] bg-(--c-surface) p-3 text-sm text-(--c-text-2)">
          {message}
        </p>
      )}
      <section aria-label="Agenda de la escuela" className="flex flex-col gap-4">
        <CoachAgenda
          key={selected.school.id}
          schoolId={selected.school.id}
          coachId={isDirector && scheduleCoachId ? scheduleCoachId : undefined}
          aggregateSchool
          readOnly={!isDirector}
          manageSchoolSchedule={isDirector}
          allowSchoolScheduleEdit={isDirector}
          scheduleEditorOpen={scheduleEditorOpen}
          onScheduleEditorClose={() => setScheduleEditorOpen(false)}
          scheduleCoachOptions={scheduleCoachOptions}
          onScheduleCoachChange={setScheduleCoachId}
        />
      </section>
      <section
        aria-label="Solicitudes y configuración de la escuela"
        className="flex flex-col gap-4"
      >
        {isDirector && requests.filter((item) => item.status === 'pending').length > 0 && (
          <div className="rounded-[var(--r-md)] border border-[#f4d59a] bg-[#fffaf0] p-5">
            <h2 className="font-bold text-(--c-ocean)">Solicitudes pendientes</h2>
            <div className="mt-3 grid gap-2">
              {requests
                .filter((item) => item.status === 'pending')
                .map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-sm)] bg-white p-3"
                  >
                    <div>
                      <p className="font-semibold text-(--c-ocean)">
                        {students.find((student) => student.id === request.studentId)?.name ||
                          'Alumno'}
                      </p>
                      <p className="text-xs text-(--c-text-2)">
                        {request.type === 'group' ? 'Grupal' : 'Individual'} ·{' '}
                        {request.preferredStartTime}–{request.preferredEndTime}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(request)
                        setShowCreate(true)
                      }}
                      className="btn btn-sm btn-primary"
                    >
                      Asignar
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
        {isStudentAccount && requests.length > 0 && (
          <div className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-5">
            <h2 className="font-bold text-(--c-ocean)">Mis solicitudes</h2>
            <div className="mt-3 grid gap-2">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--r-sm)] bg-(--c-surface) px-3 py-2 text-sm"
                >
                  <span>
                    {students.find((student) => student.id === request.studentId)?.name || 'Alumno'}{' '}
                    · {request.preferredStartTime}–{request.preferredEndTime}
                  </span>
                  <span className="font-semibold text-(--c-text-2)">
                    {request.status === 'pending'
                      ? 'Pendiente'
                      : request.status === 'approved'
                        ? 'Aprobada'
                        : request.status === 'rejected'
                          ? 'Rechazada'
                          : 'Cancelada'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {loading ? (
          <div className="py-12 text-center text-sm text-(--c-text-2)">Cargando…</div>
        ) : visibleClasses.length ? (
          <details className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-4">
            <summary className="cursor-pointer font-bold text-(--c-ocean)">
              Administrar clases ({visibleClasses.length})
            </summary>
            <div className="mt-4 grid gap-3">
              {visibleClasses.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-[var(--r-md)] border bg-white p-5 shadow-[var(--shadow-sm)] ${item.status === 'completed' ? 'border-[#b9dfc9]' : 'border-(--c-border)'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-(--c-ocean)">{item.title}</h2>
                        <span className="rounded-full bg-(--c-surface) px-2 py-1 text-xs font-bold text-(--c-text-2)">
                          {item.type === 'group' ? 'Grupal' : 'Particular'}
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-2 text-sm text-(--c-text-2)">
                        <FiCalendar aria-hidden="true" /> {item.date} · {item.startTime}–
                        {item.endTime}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-(--c-text-2)">
                        <FiMapPin aria-hidden="true" /> {item.location || 'Lugar por confirmar'}
                        {item.locationUrl && (
                          <a
                            href={item.locationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-(--c-ocean-mid)"
                          >
                            Ver mapa
                          </a>
                        )}
                      </p>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wide text-(--c-text-2)">
                      {item.status === 'completed'
                        ? 'Completada'
                        : item.status === 'cancelled'
                          ? 'Cancelada'
                          : 'Programada'}
                    </span>
                  </div>
                  {(isDirector || isTeacher) && item.status === 'scheduled' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void updateClass(item.id, 'completed')}
                        className="btn btn-outline btn-sm gap-1"
                      >
                        <FiCheck aria-hidden="true" /> Marcar completada
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateClass(item.id, 'cancelled')}
                        className="btn btn-ghost btn-sm gap-1 text-(--c-error,#b91c1c)"
                      >
                        <FiX aria-hidden="true" /> Cancelar
                      </button>
                    </div>
                  )}
                  {item.status === 'completed' && isTeacher && item.studentIds[0] && (
                    <SchoolReviewForm
                      schoolId={selected.school.id}
                      occurrenceId={item.id}
                      reviewerRole="teacher"
                      teacherId={item.teacherIds[0]}
                      studentId={item.studentIds[0]}
                      subjectName={
                        students.find((student) => student.id === item.studentIds[0])?.name ||
                        'alumno'
                      }
                    />
                  )}
                  {item.status === 'completed' &&
                    isStudentAccount &&
                    item.teacherIds[0] &&
                    item.studentIds[0] && (
                      <SchoolReviewForm
                        schoolId={selected.school.id}
                        occurrenceId={item.id}
                        reviewerRole="student"
                        teacherId={item.teacherIds[0]}
                        studentId={item.studentIds[0]}
                        subjectName={
                          teachers.find((teacher) => teacher.id === item.teacherIds[0])?.name ||
                          'coach'
                        }
                      />
                    )}
                </article>
              ))}
            </div>
          </details>
        ) : null}
      </section>
      {showCreate &&
        (isDirector ? (
          <CreateClassModal
            schoolId={selected.school.id}
            timezone={selected.school.timezone}
            teachers={teachers}
            students={students}
            locations={locations}
            request={selectedRequest}
            onClose={() => setShowCreate(false)}
            onCreated={(result) => {
              setClasses((current) =>
                [...current, ...(result.occurrences || [])].sort((a, b) =>
                  `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
                )
              )
              if (selectedRequest) {
                setRequests((current) =>
                  current.map((item) =>
                    item.id === selectedRequest.id ? { ...item, status: 'approved' } : item
                  )
                )
              }
              setShowCreate(false)
              setMessage('Clase creada y participantes notificados.')
            }}
          />
        ) : (
          <RequestClassModal
            schoolId={selected.school.id}
            students={students}
            teachers={teachers}
            bookingMode={bookingMode}
            onClose={() => setShowCreate(false)}
            onCreated={(result) => {
              if (result?.occurrences) {
                setClasses((current) =>
                  [...current, ...(result.occurrences || [])].sort((a, b) =>
                    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
                  )
                )
              }
              setShowCreate(false)
              setMessage(
                bookingMode === 'direct'
                  ? 'Clase reservada y participantes notificados.'
                  : 'Solicitud enviada a la dirección.'
              )
            }}
          />
        ))}
    </section>
  )
}

function CreateClassModal({
  schoolId,
  timezone,
  teachers,
  students,
  locations,
  request,
  onClose,
  onCreated,
}: {
  schoolId: string
  timezone: string
  teachers: Teacher[]
  students: SchoolStudent[]
  locations: SchoolLocation[]
  request: SchoolClassRequest | null
  onClose: () => void
  onCreated: (result: { occurrences?: SchoolClassOccurrence[] }) => void
}) {
  const [form, setForm] = useState({
    title: request ? 'Clase solicitada' : '',
    type: (request?.type || 'individual') as 'individual' | 'group',
    visibility: 'private' as 'public' | 'private',
    teacherIds: [] as string[],
    studentIds: request ? [request.studentId] : ([] as string[]),
    startDate: request?.startDate || today(),
    endDate: request?.endDate || today(),
    daysOfWeek: request?.preferredDays || [new Date().getDay()],
    startTime: request?.preferredStartTime || '16:00',
    endTime: request?.preferredEndTime || '17:00',
    location: request?.location || '',
    locationUrl: request?.locationUrl || '',
    recurring: Boolean(request),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  function toggle(field: 'teacherIds' | 'studentIds', id: string) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((value) => value !== id)
        : [...current[field], id],
    }))
  }
  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((value) => value !== day)
        : [...current.daysOfWeek, day],
    }))
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const input = {
        ...form,
        timezone,
      }
      const response = request
        ? await patchAuthed(`/api/schools/${schoolId}/class-requests/${request.id}`, {
            status: 'approved',
            teacherIds: form.teacherIds,
            title: form.title,
            startDate: form.startDate,
            endDate: form.endDate,
            startTime: form.startTime,
            endTime: form.endTime,
            daysOfWeek: form.daysOfWeek,
            location: form.location,
            locationUrl: form.locationUrl,
            timezone,
          })
        : await postAuthed(`/api/schools/${schoolId}/classes`, input)
      const result = (await response.json()) as {
        occurrences?: SchoolClassOccurrence[]
        seriesId: string
      }
      onCreated(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear la clase.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title={request ? 'Asignar solicitud' : 'Crear clase'} onClose={onClose}>
      <form onSubmit={submit} className="grid max-h-[75vh] gap-3 overflow-y-auto">
        <Text
          label="Nombre de la clase"
          value={form.title}
          onChange={(value) => setForm({ ...form, title: value })}
          required
        />
        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Tipo
          <select
            value={form.type}
            onChange={(event) =>
              setForm({ ...form, type: event.target.value as 'individual' | 'group' })
            }
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
          >
            <option value="individual">Particular</option>
            <option value="group">Grupal</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Visibilidad
          <select
            value={form.visibility}
            onChange={(event) =>
              setForm({ ...form, visibility: event.target.value as 'public' | 'private' })
            }
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
          >
            <option value="private">Privada · solo para la escuela</option>
            <option value="public">Pública · aparece en la página de la escuela</option>
          </select>
        </label>
        <CheckList
          label="Coaches"
          items={teachers.map((teacher) => ({ id: teacher.id, label: teacher.name }))}
          selected={form.teacherIds}
          onToggle={(id) => toggle('teacherIds', id)}
        />
        <CheckList
          label="Alumnos"
          items={students.map((student) => ({ id: student.id, label: student.name }))}
          selected={form.studentIds}
          onToggle={(id) => toggle('studentIds', id)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Text
            label="Fecha inicial"
            type="date"
            value={form.startDate}
            onChange={(value) => setForm({ ...form, startDate: value })}
            required
          />
          <Text
            label="Fecha final"
            type="date"
            value={form.endDate}
            onChange={(value) => setForm({ ...form, endDate: value })}
            required
          />
          <Text
            label="Hora inicial"
            type="time"
            value={form.startTime}
            onChange={(value) => setForm({ ...form, startTime: value })}
            required
          />
          <Text
            label="Hora final"
            type="time"
            value={form.endTime}
            onChange={(value) => setForm({ ...form, endTime: value })}
            required
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-(--c-ocean)">Días de la semana</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((day, index) => (
              <button
                type="button"
                key={day}
                onClick={() => toggleDay(index)}
                className={`rounded-full border px-3 py-2 text-xs font-bold ${form.daysOfWeek.includes(index) ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) text-(--c-text-2)'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-(--c-ocean)">
          <input
            type="checkbox"
            checked={form.recurring}
            onChange={(event) => setForm({ ...form, recurring: event.target.checked })}
          />{' '}
          Repetir esta clase
        </label>
        {locations.length > 0 && (
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Usar instalación guardada
            <select
              value={
                locations.some((location) => location.name === form.location) ? form.location : ''
              }
              onChange={(event) => {
                const location = locations.find((item) => item.name === event.target.value)
                setForm({
                  ...form,
                  location: location?.name || '',
                  locationUrl: location?.mapUrl || form.locationUrl,
                })
              }}
              className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
            >
              <option value="">Escribir otro lugar…</option>
              {locations.map((location) => (
                <option key={location.id} value={location.name}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Text
          label="Lugar"
          value={form.location}
          onChange={(value) => setForm({ ...form, location: value })}
        />
        <Text
          label="Enlace de ubicación"
          value={form.locationUrl}
          onChange={(value) => setForm({ ...form, locationUrl: value })}
        />
        {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary min-h-11">
          {saving ? 'Guardando…' : request ? 'Asignar clase' : 'Crear clase'}
        </button>
      </form>
    </Modal>
  )
}

function RequestClassModal({
  schoolId,
  students,
  teachers,
  bookingMode,
  onClose,
  onCreated,
}: {
  schoolId: string
  students: SchoolStudent[]
  teachers: Teacher[]
  bookingMode: SchoolBookingMode
  onClose: () => void
  onCreated: (result?: { occurrences?: SchoolClassOccurrence[] }) => void
}) {
  const [form, setForm] = useState({
    studentId: students[0]?.id || '',
    teacherId: '',
    title: '',
    type: 'individual',
    preferredDays: [1],
    preferredStartTime: '16:00',
    preferredEndTime: '19:00',
    startDate: today(),
    endDate: '',
    durationMinutes: 60,
    location: '',
    locationUrl: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await postAuthed(`/api/schools/${schoolId}/class-requests`, {
        ...form,
        directBooking: bookingMode === 'direct',
      })
      const result = (await response.json()) as { occurrences?: SchoolClassOccurrence[] }
      onCreated(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo enviar la solicitud.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal
      title={bookingMode === 'direct' ? 'Reservar clase' : 'Solicitar horario'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
          Alumno
          <select
            required
            value={form.studentId}
            onChange={(event) => setForm({ ...form, studentId: event.target.value })}
            className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </label>
        {bookingMode === 'direct' && (
          <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
            Coach
            <select
              required
              value={form.teacherId}
              onChange={(event) => setForm({ ...form, teacherId: event.target.value })}
              className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
            >
              <option value="">Selecciona un coach…</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {bookingMode === 'direct' && (
          <Text
            label="Nombre de la clase"
            value={form.title}
            onChange={(value) => setForm({ ...form, title: value })}
            required
          />
        )}
        <div>
          <p className="text-sm font-semibold text-(--c-ocean)">Días preferidos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((day, index) => (
              <button
                type="button"
                key={day}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    preferredDays: current.preferredDays.includes(index)
                      ? current.preferredDays.filter((value) => value !== index)
                      : [...current.preferredDays, index],
                  }))
                }
                className={`rounded-full border px-3 py-2 text-xs font-bold ${form.preferredDays.includes(index) ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) text-(--c-text-2)'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Text
            label="Desde"
            type="date"
            value={form.startDate}
            onChange={(value) => setForm({ ...form, startDate: value })}
            required
          />
          <Text
            label="Hasta"
            type="date"
            value={form.endDate}
            onChange={(value) => setForm({ ...form, endDate: value })}
          />
          <Text
            label="Desde hora"
            type="time"
            value={form.preferredStartTime}
            onChange={(value) => setForm({ ...form, preferredStartTime: value })}
            required
          />
          <Text
            label="Hasta hora"
            type="time"
            value={form.preferredEndTime}
            onChange={(value) => setForm({ ...form, preferredEndTime: value })}
            required
          />
        </div>
        <Text
          label="Lugar preferido"
          value={form.location}
          onChange={(value) => setForm({ ...form, location: value })}
        />
        <Text
          label="Notas"
          value={form.notes}
          onChange={(value) => setForm({ ...form, notes: value })}
        />
        {error && <p className="text-sm text-(--c-error,#b91c1c)">{error}</p>}
        <button
          type="submit"
          disabled={saving || !form.studentId}
          className="btn btn-primary min-h-11"
        >
          {saving ? 'Guardando…' : bookingMode === 'direct' ? 'Reservar clase' : 'Enviar solicitud'}
        </button>
      </form>
    </Modal>
  )
}

function CheckList({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string
  items: Array<{ id: string; label: string }>
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-(--c-ocean)">{label}</legend>
      <div className="mt-2 grid max-h-32 gap-2 overflow-y-auto rounded-[var(--r-sm)] border border-(--c-border) p-2">
        {items.length ? (
          items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2 px-2 py-1 text-sm text-(--c-ocean)"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => onToggle(item.id)}
              />
              {item.label}
            </label>
          ))
        ) : (
          <p className="px-2 py-1 text-xs font-normal text-(--c-text-2)">
            Puedes asignarlo después.
          </p>
        )}
      </div>
    </fieldset>
  )
}

function Text({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-(--c-ocean)">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
      />
    </label>
  )
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(10,37,64,0.55)] p-4"
    >
      <div className="max-h-[calc(100dvh-2rem)] w-full overflow-y-auto max-w-xl rounded-[var(--r-md)] bg-white p-5 shadow-[var(--shadow-md)] sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-(--c-ocean)">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-(--c-text-2)"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
