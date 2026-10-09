'use client'

import Sheet from '@comps/ui/sheet'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { FiCheck, FiMapPin, FiMessageSquare, FiPlus, FiX } from 'react-icons/fi'
import { LuHourglass } from 'react-icons/lu'
import CoachAgenda from '@/components/coach/CoachAgenda'
import ClassCard from '@/components/ui/class-card'
import ClassRequestCard from '@/components/ui/class-request-card'
import CoachBadge from '@/components/ui/coach-badge'
import StatusBadge from '@/components/ui/status-badge'
import StudentBadge from '@/components/ui/student-badge'
import { useSchoolTerminology } from '@/context/SchoolTerminologyContext'
import { useUser } from '@/context/UserContext'
import { getAuthed, patchAuthed, postAuthed } from '@/lib/client/authed-api'
import { useSchoolAgendaUpdates } from '@/lib/client/use-school-agenda-updates'
import {
  capitalizeSchoolTerm,
  type SchoolBookingMode,
  type SchoolClassOccurrence,
  type SchoolClassRequest,
  type SchoolLocation,
  type SchoolStudent,
  schoolMembershipHasRole,
  UNASSIGNED_SCHOOL_COACH_ID,
} from '@/lib/school'
import SchoolNoSelection from './SchoolNoSelection'
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
  const searchParams = useSearchParams()
  const focusSchool = searchParams.get('school')
  const focusDate = searchParams.get('date')
  const focusTime = searchParams.get('time')
  const focusClass = searchParams.get('class')
  const validFocusDate = focusDate && /^\d{4}-\d{2}-\d{2}$/.test(focusDate) ? focusDate : undefined
  const validFocusTime = focusTime && /^\d{2}:\d{2}$/.test(focusTime) ? focusTime : undefined
  const terminology = useSchoolTerminology()
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
  useEffect(() => {
    if (focusSchool && schools.some((item) => item.school.id === focusSchool)) {
      selectSchool(focusSchool)
    }
  }, [focusSchool, schools, selectSchool])
  const [scheduleCoachId, setScheduleCoachId] = useState('')
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false)
  const [classes, setClasses] = useState<SchoolClassOccurrence[]>([])
  const [students, setStudents] = useState<SchoolStudent[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [locations, setLocations] = useState<SchoolLocation[]>([])
  const [bookingMode, setBookingMode] = useState<SchoolBookingMode>('request')
  const [requests, setRequests] = useState<SchoolClassRequest[]>([])
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showClasses, setShowClasses] = useState(false)
  const [showRequests, setShowRequests] = useState(false)
  const [showArchivedRequests, setShowArchivedRequests] = useState(false)
  const [archivedRequestLimit, setArchivedRequestLimit] = useState(10)
  const [archivingRequestId, setArchivingRequestId] = useState<string | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [changeRequest, setChangeRequest] = useState<SchoolClassRequest | null>(null)
  const [requestDetails, setRequestDetails] = useState<SchoolClassRequest | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<SchoolClassRequest | null>(null)
  const [commentClass, setCommentClass] = useState<SchoolClassOccurrence | null>(null)
  const [classNoteDraft, setClassNoteDraft] = useState('')
  const [savingClassNote, setSavingClassNote] = useState(false)
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
      setShowRequests(false)
      setRequestDetails(null)
      setChangeRequest(null)
      setShowArchivedRequests(false)
      setLoading(true)
    }
    setBookingMode(selected?.school.bookingMode || 'request')
    const isDirector = schoolMembershipHasRole(selected?.membership, 'director')
    const isStudentAccount = schoolMembershipHasRole(selected?.membership, 'student')
    const directorId = isDirector ? selected?.membership.userId : undefined
    if (resetSelection) setScheduleCoachId('')
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
          if (resetSelection) return ''
          if (current === '') return current
          if (isDirector && current === directorId) return current
          if (
            current &&
            nextTeachers.some((teacher) => teacher.id === current && teacher.status === 'active')
          )
            return current
          return ''
        })
        setLocations(locationPayload.locations || [])
        setRequests(requestPayload.requests || [])
      })
      .catch(() => {
        if (!active) return
        if (resetSelection) setScheduleCoachId('')
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
  const canManageBookings = isDirector || selected.membership?.canManageSchoolBookings === true
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
    ...(isDirector ? [{ id: UNASSIGNED_SCHOOL_COACH_ID, name: 'Sin profe aún' }] : []),
  ]
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'
  const participantSingular = terminology.schoolId ? terminology.participantSingular : 'alumno'
  const visibleClasses = classes.filter(
    (item) =>
      item.status !== 'scheduled' &&
      item.status !== 'completed' &&
      (item.status !== 'cancelled' || item.date >= today())
  )

  const viewerId = user?.uid || user?.id || ''
  const activeRequests = requests.filter((request) => !request.archivedBy?.includes(viewerId))

  const archivedRequests = requests
    .filter((request) => request.archivedBy?.includes(viewerId))
    .sort((a, b) => b.createdAt - a.createdAt)
  const displayedRequests = showArchivedRequests
    ? archivedRequests.slice(0, archivedRequestLimit)
    : activeRequests

  async function resolveRequest(request: SchoolClassRequest, nextStatus: 'approved' | 'rejected') {
    setResolvingRequestId(request.id)
    setMessage(null)
    setArchiveError(null)
    try {
      const response = await patchAuthed(
        `/api/schools/${selectedId}/class-requests/${request.id}`,
        { status: nextStatus }
      )
      const result = (await response.json()) as {
        occurrences?: SchoolClassOccurrence[]
      }
      setRequests((current) =>
        current.map((item) => (item.id === request.id ? { ...item, status: nextStatus } : item))
      )
      if (result.occurrences)
        setClasses((current) =>
          [
            ...current.filter(
              (item) => !result.occurrences?.some((created) => created.id === item.id)
            ),
            ...(result.occurrences || []),
          ].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
        )
      setAgendaRevision((current) => current + 1)
      setMessage(nextStatus === 'approved' ? 'Solicitud aceptada.' : 'Solicitud rechazada.')
      setChangeRequest(null)
    } catch {
      const errorText =
        'No pudimos resolver la solicitud. Revisa el profesor y el horario e inténtalo de nuevo.'
      setArchiveError(errorText)
      setMessage(errorText)
    } finally {
      setResolvingRequestId(null)
    }
  }

  async function archiveRequest(requestId: string) {
    setArchivingRequestId(requestId)
    setArchiveError(null)
    try {
      await patchAuthed(`/api/schools/${activeSchool.school.id}/class-requests/${requestId}`, {
        action: 'archive',
      })
      setRequests((current) =>
        current.map((item) =>
          item.id === requestId
            ? { ...item, archivedBy: [...(item.archivedBy || []), viewerId] }
            : item
        )
      )
    } catch {
      setArchiveError('No pudimos archivar la solicitud. Inténtalo de nuevo.')
    } finally {
      setArchivingRequestId(null)
    }
  }

  async function updateClass(
    id: string,
    status: 'cancelled' | 'completed' | 'pending' | 'scheduled'
  ) {
    try {
      await patchAuthed(`/api/schools/${activeSchool.school.id}/classes/${id}`, { status })
      setClasses((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
    } catch {
      setMessage('No se pudo actualizar la clase.')
    }
  }

  async function saveClassNote() {
    if (!commentClass) return
    setSavingClassNote(true)
    try {
      const response = await patchAuthed(
        `/api/schools/${activeSchool.school.id}/classes/${commentClass.id}`,
        { classNote: classNoteDraft }
      )
      const payload = (await response.json()) as { occurrence?: SchoolClassOccurrence }
      const savedNote = payload.occurrence?.classNote ?? classNoteDraft.trim()
      setClasses((current) =>
        current.map((item) =>
          item.id === commentClass.id ? { ...item, classNote: savedNote } : item
        )
      )
      setCommentClass(null)
    } catch {
      setMessage('No se pudo guardar el comentario.')
    } finally {
      setSavingClassNote(false)
    }
  }

  function classDuration(startTime: string, endTime: string) {
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    return Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute))
  }

  function formatClassDate(date: string) {
    const value = new Date(`${date}T12:00:00`)
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(value)
  }

  const pendingRequests = requests
    .filter((request) => request.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt)

  function renderRequestCard(request: SchoolClassRequest, grouped = false) {
    return (
      <ClassRequestCard
        key={request.id}
        time={request.preferredStartTime}
        date={formatClassDate(request.startDate)}
        coachName={
          teachers.find((teacher) => teacher.id === request.preferredTeacherId)?.name ||
          'Sin profe aún'
        }
        unassigned={
          !request.preferredTeacherId || request.preferredTeacherId === UNASSIGNED_SCHOOL_COACH_ID
        }
        groupType={request.type === 'group' ? 'grupal' : 'particular'}
        studentName={
          request.studentName ||
          students.find((student) => student.id === request.studentId)?.name ||
          capitalizeSchoolTerm(participantSingular)
        }
        status={request.status}
        busy={resolvingRequestId !== null || archivingRequestId !== null}
        onAccept={isDirector ? () => void resolveRequest(request, 'approved') : undefined}
        onReject={isDirector ? () => void resolveRequest(request, 'rejected') : undefined}
        onArchive={
          !grouped || !showArchivedRequests ? () => void archiveRequest(request.id) : undefined
        }
        onChange={
          isDirector
            ? () => {
                setArchiveError(null)
                setChangeRequest(request)
              }
            : undefined
        }
        onEdit={
          request.status !== 'pending'
            ? () => {
                setRequestDetails(request)
              }
            : isDirector && request.status === 'pending'
              ? () => {
                  setSelectedRequest(request)
                  setShowClasses(false)
                  setShowRequests(false)
                  setShowCreate(true)
                }
              : undefined
        }
      />
    )
  }

  return (
    <section className="flex flex-col gap-5">
      <h1 className="sr-only">Horarios</h1>
      {!loading && (visibleClasses.length > 0 || (isDirector && pendingRequests.length > 0)) && (
        <>
          <button
            type="button"
            onClick={() => setShowClasses(true)}
            className="rounded-[var(--r-md)] border border-(--c-border) bg-white p-4 text-left font-bold text-(--c-ocean)"
          >
            Clases y solicitudes (
            {visibleClasses.length + (isDirector ? pendingRequests.length : 0)})
          </button>
          <Sheet
            open={showClasses}
            onClose={() => setShowClasses(false)}
            label="Clases y solicitudes"
            size="xl"
            closeDisabled={resolvingRequestId !== null}
          >
            <div className="px-4 sm:px-0">
              <h2 className="text-lg font-bold">
                Clases y solicitudes (
                {visibleClasses.length + (isDirector ? pendingRequests.length : 0)})
              </h2>
              {message && (
                <p role="status" className="mt-2 text-sm text-(--c-text-2)">
                  {message}
                </p>
              )}
              <div className="mt-4 grid gap-3">
                {isDirector && pendingRequests.length > 0 && (
                  <section aria-label="Solicitudes nuevas" className="flex flex-col gap-3">
                    <h2 className="font-bold text-(--c-ocean)">Solicitudes nuevas</h2>
                    {pendingRequests.map((request) => renderRequestCard(request))}
                  </section>
                )}

                {visibleClasses.map((item) => {
                  const coachName =
                    item.teacherIds
                      .map(
                        (teacherId) => teachers.find((teacher) => teacher.id === teacherId)?.name
                      )
                      .filter((name): name is string => Boolean(name))
                      .join(', ') || 'Sin profe aún'
                  const studentBadges = item.studentIds.flatMap((studentId) => {
                    const student = students.find((entry) => entry.id === studentId)
                    return student ? [{ id: studentId, name: student.name }] : []
                  })
                  const canComment =
                    isDirector || (isTeacher && item.teacherIds.includes(user?.uid || ''))
                  const locationLabel = item.location.trim()
                  const hasLocation =
                    locationLabel &&
                    !['lugar por definir', 'lugar por confirmar'].includes(
                      locationLabel.toLocaleLowerCase('es-MX')
                    )
                  return (
                    <ClassCard
                      key={item.id}
                      time={item.startTime}
                      date={formatClassDate(item.date)}
                      coachName={coachName}
                      showCoachName
                      unassigned={item.teacherIds.length === 0}
                      groupType={item.type === 'group' ? 'grupal' : 'particular'}
                      status={item.type === 'group' ? 'group' : 'booked'}
                      pending={item.status === 'pending'}
                      agendaLabel={`${classDuration(item.startTime, item.endTime)} min`}
                      showSeparator={false}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {studentBadges.length > 0 ? (
                          studentBadges.map((student) => (
                            <StudentBadge key={student.id} name={student.name} />
                          ))
                        ) : (
                          <StudentBadge name="Sin alumno" />
                        )}
                        {item.status !== 'pending' && (
                          <StatusBadge
                            status={item.status === 'cancelled' ? 'cancelled' : 'confirmed'}
                          />
                        )}
                        {item.status === 'completed' && (
                          <span className="text-xs text-(--c-text-2)">Completada</span>
                        )}
                      </div>
                      {hasLocation && (
                        <p className="mt-2 flex items-center gap-2 text-sm text-(--c-text-2)">
                          <FiMapPin aria-hidden="true" /> {locationLabel}
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
                      )}
                      {item.classNote && (
                        <p className="mt-2 text-sm text-(--c-text-2)">{item.classNote}</p>
                      )}
                      <div className="mt-3 flex flex-nowrap items-center gap-1.5 overflow-x-auto">
                        {(isDirector || isTeacher) && item.status === 'scheduled' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void updateClass(item.id, 'completed')}
                              className="btn btn-outline btn-sm shrink-0 gap-1 px-2 text-xs"
                            >
                              <FiCheck aria-hidden="true" /> Completar
                            </button>
                            <button
                              type="button"
                              onClick={() => void updateClass(item.id, 'cancelled')}
                              className="btn btn-ghost btn-sm shrink-0 gap-1 px-2 text-xs text-(--c-error,#b91c1c)"
                            >
                              <FiX aria-hidden="true" /> Cancelar
                            </button>
                          </>
                        )}
                        {canManageBookings && item.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void updateClass(item.id, 'scheduled')}
                              className="btn btn-primary btn-sm shrink-0 px-2 text-xs"
                            >
                              Aprobar clase
                            </button>
                            <button
                              type="button"
                              onClick={() => void updateClass(item.id, 'cancelled')}
                              className="btn btn-ghost btn-sm shrink-0 gap-1 px-2 text-xs text-(--c-error,#b91c1c)"
                            >
                              <FiX aria-hidden="true" /> Rechazar
                            </button>
                          </>
                        )}
                        {canComment && (
                          <button
                            type="button"
                            aria-label={
                              item.classNote
                                ? 'Editar comentario de clase'
                                : 'Agregar comentario a la clase'
                            }
                            onClick={() => {
                              setShowClasses(false)
                              setCommentClass(item)
                              setClassNoteDraft(item.classNote || '')
                            }}
                            className="btn btn-ghost btn-sm shrink-0 gap-1 px-2 text-xs"
                          >
                            <FiMessageSquare aria-hidden="true" />{' '}
                            {item.classNote ? 'Editar nota' : 'Comentar'}
                          </button>
                        )}
                      </div>
                    </ClassCard>
                  )
                })}
              </div>
            </div>
          </Sheet>
        </>
      )}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
          <SchoolSelector
            schools={schools}
            selectedId={selected.school.id}
            onChange={selectSchool}
          />
          {isDirector && (
            <div className="flex w-full min-w-0 flex-1 items-end gap-2">
              <fieldset className="grid min-w-0 flex-1 gap-2">
                <legend className="mb-2 text-sm font-bold text-(--c-ocean)">
                  Administrar horarios de {coachSingular}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {[{ id: '', name: 'Todos' }, ...scheduleCoachOptions].map((coach) => (
                    <button
                      key={coach.id}
                      type="button"
                      disabled={loading}
                      aria-pressed={scheduleCoachId === coach.id}
                      onClick={() => setScheduleCoachId(coach.id)}
                      className={`min-h-8 rounded-full border px-2.5 py-1 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50 ${scheduleCoachId === coach.id ? 'border-(--c-ocean) bg-(--c-ocean) text-white [&>span]:text-white' : 'border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface)'} [&>span]:border-0 [&>span]:bg-transparent [&>span]:p-0 [&>span]:text-xs`}
                    >
                      {coach.id ? (
                        <CoachBadge
                          name={coach.name}
                          unassigned={coach.id === UNASSIGNED_SCHOOL_COACH_ID}
                        />
                      ) : (
                        'Todos'
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </div>
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
      {isStudentAccount && requests.length > 0 && (
        <Sheet
          open={showRequests}
          onClose={() => setShowRequests(false)}
          label={showArchivedRequests ? 'Solicitudes archivadas' : 'Mis solicitudes'}
          size="lg"
          showFooterClose={false}
          footer={
            <div className="flex flex-col items-center pt-2">
              <button
                type="button"
                onClick={() => setShowRequests(false)}
                className="min-h-11 px-4 text-sm font-medium text-(--c-text-2) hover:text-(--c-ocean) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setArchivedRequestLimit(10)
                  setShowArchivedRequests((current) => !current)
                }}
                className="min-h-11 px-3 text-[11px] text-(--c-text-2) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
              >
                {showArchivedRequests ? 'Volver a mis solicitudes' : 'Archivadas'}
              </button>
            </div>
          }
        >
          <h2 className="text-xl font-bold text-(--c-ocean)">
            {showArchivedRequests ? 'Solicitudes archivadas' : 'Mis solicitudes'}
          </h2>
          {showArchivedRequests && (
            <p className="mt-1 text-xs text-(--c-text-2)">
              Solicitudes archivadas, de la más reciente a la más antigua.
            </p>
          )}
          {archiveError && (
            <p role="alert" className="mt-3 text-sm text-(--c-error,#b91c1c)">
              {archiveError}
            </p>
          )}
          {displayedRequests.length === 0 && (
            <p className="mt-4 text-sm text-(--c-text-2)">
              {showArchivedRequests
                ? 'No tienes solicitudes archivadas.'
                : 'No tienes solicitudes sin archivar.'}
            </p>
          )}
          <div className="mt-4 grid gap-3">
            {displayedRequests.map((request) => renderRequestCard(request, true))}
          </div>
          {showArchivedRequests && archivedRequests.length > archivedRequestLimit && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setArchivedRequestLimit((current) => current + 10)}
                className="min-h-11 px-3 text-xs text-(--c-text-2) underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
              >
                Ver más
              </button>
            </div>
          )}
        </Sheet>
      )}
      <Sheet
        open={Boolean(changeRequest)}
        onClose={() => setChangeRequest(null)}
        label="Cambiar estado de solicitud"
        closeDisabled={resolvingRequestId !== null}
      >
        {changeRequest && (
          <div className="grid gap-3">
            <h2 className="text-xl font-bold text-(--c-ocean)">Cambiar estado</h2>
            <StudentBadge
              name={changeRequest.studentName || capitalizeSchoolTerm(participantSingular)}
            />
            <p className="text-sm text-(--c-text-2)">
              {formatClassDate(changeRequest.startDate)} · {changeRequest.preferredStartTime}–
              {changeRequest.preferredEndTime}
            </p>
            {changeRequest.status === 'approved' && (
              <p className="text-sm text-(--c-text-2)">
                Al rechazar, se retirará al alumno de las clases asignadas por esta solicitud.
              </p>
            )}
            {archiveError && (
              <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
                {archiveError}
              </p>
            )}
            <button
              type="button"
              disabled={resolvingRequestId !== null}
              onClick={() =>
                void resolveRequest(
                  changeRequest,
                  changeRequest.status === 'approved' ? 'rejected' : 'approved'
                )
              }
              className="btn btn-primary min-h-11"
            >
              {resolvingRequestId
                ? 'Guardando…'
                : changeRequest.status === 'approved'
                  ? 'Rechazar solicitud'
                  : 'Aceptar solicitud'}
            </button>
          </div>
        )}
      </Sheet>
      <Sheet
        open={Boolean(requestDetails)}
        onClose={() => setRequestDetails(null)}
        label="Detalle de solicitud"
      >
        {requestDetails && (
          <div className="grid gap-3">
            <h2 className="text-xl font-bold text-(--c-ocean)">Detalle de solicitud</h2>
            <StudentBadge
              name={
                requestDetails.studentName ||
                students.find((student) => student.id === requestDetails.studentId)?.name ||
                capitalizeSchoolTerm(participantSingular)
              }
            />
            <CoachBadge
              name={
                teachers.find((teacher) => teacher.id === requestDetails.preferredTeacherId)
                  ?.name || 'Sin profe aún'
              }
              unassigned={
                !requestDetails.preferredTeacherId ||
                requestDetails.preferredTeacherId === UNASSIGNED_SCHOOL_COACH_ID
              }
            />
            <StatusBadge
              status={requestDetails.status === 'approved' ? 'confirmed' : 'cancelled'}
              label={
                requestDetails.status === 'approved'
                  ? 'Aprobada'
                  : requestDetails.status === 'rejected'
                    ? 'Rechazada'
                    : 'Cancelada'
              }
            />
            <p className="text-sm text-(--c-text-2)">
              {formatClassDate(requestDetails.startDate)} · {requestDetails.preferredStartTime}–
              {requestDetails.preferredEndTime}
            </p>
            {requestDetails.notes && (
              <p className="whitespace-pre-wrap text-sm text-(--c-text-2)">
                {requestDetails.notes}
              </p>
            )}
          </div>
        )}
      </Sheet>
      <section aria-label="Agenda de la escuela" className="flex flex-col gap-4">
        <CoachAgenda
          key={selected.school.id}
          schoolId={selected.school.id}
          coachId={isDirector && scheduleCoachId ? scheduleCoachId : undefined}
          aggregateSchool
          toolbarActions={
            isStudentAccount && requests.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setShowArchivedRequests(false)
                  setShowRequests(true)
                }}
                aria-haspopup="dialog"
                className="btn btn-outline h-8 min-h-8 gap-1 border px-2 text-xs"
              >
                <LuHourglass aria-hidden="true" /> Mis solicitudes
                <span className="rounded-full bg-(--c-surface) px-1.5 py-0.5 text-xs text-(--c-ocean)">
                  {activeRequests.length}
                </span>
              </button>
            ) : undefined
          }
          readOnly={!isDirector}
          manageSchoolSchedule={isDirector}
          allowSchoolScheduleEdit={isDirector}
          scheduleEditorOpen={scheduleEditorOpen}
          onScheduleEditorClose={() => setScheduleEditorOpen(false)}
          onScheduleEditorOpen={isDirector ? () => setScheduleEditorOpen(true) : undefined}
          scheduleCoachOptions={scheduleCoachOptions}
          onScheduleCoachChange={setScheduleCoachId}
          initialDate={validFocusDate}
          focusClassId={focusClass || undefined}
          focusTime={validFocusTime}
        />
      </section>
      <Sheet
        open={Boolean(commentClass)}
        onClose={() => setCommentClass(null)}
        label="Agregar comentario de clase"
        keyboardAware
      >
        {commentClass && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-(--c-ocean)">Comentario de clase</h2>
              <p className="mt-1 text-sm text-(--c-text-2)">
                {formatClassDate(commentClass.date)} · {commentClass.startTime}–
                {commentClass.endTime}
              </p>
            </div>
            <textarea
              value={classNoteDraft}
              onChange={(event) => setClassNoteDraft(event.target.value)}
              maxLength={1000}
              rows={5}
              placeholder="Escribe un comentario sobre esta clase…"
              className="textarea textarea-bordered min-h-32 w-full"
            />
            <button
              type="button"
              onClick={() => void saveClassNote()}
              disabled={savingClassNote}
              className="btn btn-primary"
            >
              {savingClassNote ? 'Guardando…' : 'Guardar comentario'}
            </button>
          </div>
        )}
      </Sheet>
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
  const terminology = useSchoolTerminology()
  const coachPlural = terminology.schoolId ? terminology.coachPlural : 'coaches'
  const participantPlural = terminology.schoolId ? terminology.participantPlural : 'alumnos'
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
          label={capitalizeSchoolTerm(coachPlural)}
          items={teachers.map((teacher) => ({ id: teacher.id, label: teacher.name }))}
          selected={form.teacherIds}
          onToggle={(id) => toggle('teacherIds', id)}
        />
        <CheckList
          label={capitalizeSchoolTerm(participantPlural)}
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
  const terminology = useSchoolTerminology()
  const coachSingular = terminology.schoolId ? terminology.coachSingular : 'coach'
  const participantSingular = terminology.schoolId ? terminology.participantSingular : 'alumno'
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
          {capitalizeSchoolTerm(participantSingular)}
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
            {capitalizeSchoolTerm(coachSingular)}
            <select
              required
              value={form.teacherId}
              onChange={(event) => setForm({ ...form, teacherId: event.target.value })}
              className="min-h-11 rounded-[var(--r-sm)] border border-(--c-border) px-3 font-normal"
            >
              <option value="">Selecciona {coachSingular}…</option>
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
    <Sheet open onClose={onClose} label={title} keyboardAware fullBleedMobile size="xl">
      <div className="grid gap-4 px-4 pb-3 sm:px-0 sm:pb-0">
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
    </Sheet>
  )
}
