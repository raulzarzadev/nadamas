import { NextResponse } from 'next/server'
import { schoolMembershipHasRole } from '@/lib/school'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess, schoolPeopleAreValid } from '@/lib/server/school-access'
import {
  createClassRequest,
  createSchoolClass,
  listClassRequests,
  validateClassInput,
} from '@/lib/server/school-classes'
import { listSchoolStudents } from '@/lib/server/school-students'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'guardian'])
  if (access.response) return access.response
  return NextResponse.json({
    requests: await listClassRequests(
      schoolId,
      schoolMembershipHasRole(access.membership, 'guardian') ? access.caller.uid : undefined
    ),
  })
}

export async function POST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['guardian'])
  if (access.response) return access.response
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const students = await listSchoolStudents(schoolId, access.caller.uid)
  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  if (!students.some((student) => student.id === studentId))
    return NextResponse.json({ error: 'Alumno inválido.' }, { status: 400 })
  const school = await getSchoolById(schoolId)
  if (!school) return NextResponse.json({ error: 'Escuela no encontrada.' }, { status: 404 })
  const preferredDays = Array.isArray(body.preferredDays)
    ? body.preferredDays.filter(
        (day): day is number => Number.isInteger(day) && day >= 0 && day <= 6
      )
    : []
  if (!preferredDays.length)
    return NextResponse.json({ error: 'Selecciona al menos un día.' }, { status: 400 })
  if (school.bookingMode === 'direct' && body.directBooking === true) {
    const teacherId = typeof body.teacherId === 'string' ? body.teacherId : ''
    if (!teacherId) return NextResponse.json({ error: 'Selecciona un coach.' }, { status: 400 })
    if (!(await schoolPeopleAreValid(schoolId, [teacherId], [studentId])))
      return NextResponse.json(
        { error: 'Selecciona un coach que pertenezca a la escuela.' },
        { status: 400 }
      )
    const startDate = typeof body.startDate === 'string' ? body.startDate : ''
    const classValidation = validateClassInput({
      schoolId,
      title: typeof body.title === 'string' && body.title.trim() ? body.title : 'Clase escolar',
      type: body.type === 'group' ? 'group' : 'individual',
      teacherIds: [teacherId],
      studentIds: [studentId],
      startDate,
      endDate: startDate,
      daysOfWeek: preferredDays,
      startTime: typeof body.preferredStartTime === 'string' ? body.preferredStartTime : '',
      endTime: typeof body.preferredEndTime === 'string' ? body.preferredEndTime : '',
      timezone: typeof body.timezone === 'string' ? body.timezone : school.timezone,
      location: typeof body.location === 'string' ? body.location.slice(0, 200) : '',
      locationUrl: typeof body.locationUrl === 'string' ? body.locationUrl.slice(0, 500) : '',
      recurring: false,
    })
    if (!classValidation.ok)
      return NextResponse.json({ error: 'Revisa la fecha y el horario.' }, { status: 400 })
    const classResult = await createSchoolClass(classValidation.value)
    void createNotification({
      recipientId: teacherId,
      actorId: access.caller.uid,
      actorName: access.caller.name || null,
      type: 'school_class_assigned',
      title: 'Nueva reserva',
      body: `${classValidation.value.title} fue agregada a tu agenda.`,
      link: '/school/classes',
    }).catch(() => {})
    void createNotification({
      recipientId: school.directorId,
      actorId: access.caller.uid,
      actorName: access.caller.name || access.caller.email,
      type: 'school_class_requested',
      title: 'Nueva reserva directa',
      body: 'Un tutor reservó una clase directamente.',
      link: '/school/classes',
    }).catch(() => {})
    return NextResponse.json({ direct: true, ...classResult }, { status: 201 })
  }
  const requestRecord = await createClassRequest({
    schoolId,
    studentId,
    requestedBy: access.caller.uid,
    type: body.type === 'group' ? 'group' : 'individual',
    preferredDays,
    preferredStartTime:
      typeof body.preferredStartTime === 'string' ? body.preferredStartTime : '16:00',
    preferredEndTime: typeof body.preferredEndTime === 'string' ? body.preferredEndTime : '19:00',
    startDate:
      typeof body.startDate === 'string' ? body.startDate : new Date().toISOString().slice(0, 10),
    endDate: typeof body.endDate === 'string' ? body.endDate : '',
    durationMinutes: typeof body.durationMinutes === 'number' ? body.durationMinutes : 60,
    location: typeof body.location === 'string' ? body.location.slice(0, 200) : '',
    locationUrl: typeof body.locationUrl === 'string' ? body.locationUrl.slice(0, 500) : '',
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : '',
  })
  if (school)
    void createNotification({
      recipientId: school.directorId,
      actorId: access.caller.uid,
      actorName: access.caller.name || access.caller.email,
      type: 'school_class_requested',
      title: 'Nueva solicitud de clase',
      body: 'Un tutor solicitó un horario para un alumno.',
      link: '/school/classes',
    }).catch(() => {})
  return NextResponse.json({ request: requestRecord }, { status: 201 })
}
