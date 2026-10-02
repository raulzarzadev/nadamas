import { NextResponse } from 'next/server'
import type { SchoolStudent } from '@/lib/school'
import { type SchoolGender, schoolMembershipHasRole } from '@/lib/school'
import { getAdditionalProfile } from '@/lib/server/additional-profiles'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import {
  getSchoolCaller,
  getSchoolMembership,
  isGlobalAdmin,
  requireSchoolAccess,
  schoolPeopleAreValid,
} from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'
import {
  createClassRequest,
  createSchoolClass,
  listClassRequests,
  validateClassInput,
} from '@/lib/server/school-classes'
import { createSchoolStudent, listSchoolStudents } from '@/lib/server/school-students'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'student'])
  if (access.response) return access.response
  return NextResponse.json({
    requests: await listClassRequests(
      schoolId,
      !access.globalAdmin && !schoolMembershipHasRole(access.membership, 'director')
        ? access.caller.uid
        : undefined
    ),
  })
}

async function handlePOST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const guarded = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (guarded.response && guarded.response.status === 401) return guarded.response
  const caller = guarded.response ? await getSchoolCaller(request) : guarded.caller
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const school = await getSchoolById(schoolId)
  if (!school) return NextResponse.json({ error: 'Escuela no encontrada.' }, { status: 404 })
  const membership = guarded.response
    ? await getSchoolMembership(schoolId, caller.uid)
    : guarded.membership
  const globalAdmin = guarded.response ? await isGlobalAdmin(caller.uid) : guarded.globalAdmin
  if (guarded.response && !globalAdmin && (!school.isPublic || membership?.status !== 'active'))
    return guarded.response
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const students = await listSchoolStudents(schoolId, caller.uid)
  let studentId = typeof body.studentId === 'string' ? body.studentId : ''
  let student: SchoolStudent | undefined = students.find((item) => item.id === studentId)
  if (!student) {
    const participant = body.participant as
      | { type?: unknown; additionalProfileId?: unknown }
      | undefined
    const userSnapshot = await adminDb.collection('users').doc(caller.uid).get()
    const user = userSnapshot.data() || {}
    const accountName =
      [user.firstName, user.lastName]
        .filter((part) => typeof part === 'string' && part)
        .join(' ') ||
      (typeof user.nickname === 'string' && user.nickname.trim()) ||
      (typeof user.displayName === 'string' && user.displayName.trim()) ||
      (typeof user.name === 'string' && user.name.trim()) ||
      caller.name ||
      caller.email?.split('@')[0] ||
      'Atleta'
    if (participant?.type === 'self') {
      student = await createSchoolStudent({
        schoolId,
        studentUserId: caller.uid,
        guardianId: caller.uid,
        guardianEmail: caller.email || '',
        name: accountName,
        birthDate: '',
        gender: 'otro',
        guardianName: accountName,
        guardianRelationship: '',
        guardianPhone: '',
        studentEmail: caller.email || '',
      })
    } else if (
      participant?.type === 'additional' &&
      typeof participant.additionalProfileId === 'string'
    ) {
      const profile = await getAdditionalProfile(caller.uid, participant.additionalProfileId)
      if (!profile)
        return NextResponse.json({ error: 'Perfil adicional inválido.' }, { status: 400 })
      student = await createSchoolStudent({
        schoolId,
        guardianId: caller.uid,
        guardianEmail: caller.email || '',
        name: profile.name,
        birthDate: profile.birthDate,
        gender: profile.gender as SchoolGender,
        guardianName: accountName,
        guardianRelationship: '',
        guardianPhone: '',
        additionalProfileId: profile.id,
      })
    } else {
      return NextResponse.json(
        { error: 'Selecciona a quién se reservará la clase.' },
        { status: 400 }
      )
    }
    studentId = student.id
    const existingMembership = membership
    if (existingMembership?.status && existingMembership.status !== 'active')
      return NextResponse.json({ error: 'No puedes reservar en esta escuela.' }, { status: 403 })
    const roles = new Set<string>(
      existingMembership?.roles || (existingMembership?.role ? [existingMembership.role] : [])
    )
    roles.add('student')
    await adminDb
      .collection('schoolMemberships')
      .doc(`${schoolId}_${caller.uid}`)
      .set(
        {
          schoolId,
          userId: caller.uid,
          role: existingMembership?.role || 'student',
          roles: [...roles],
          status: 'active',
          createdAt: existingMembership?.createdAt || Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      )
  }
  if (!student) return NextResponse.json({ error: 'Alumno inválido.' }, { status: 400 })
  const canRequestForParticipant =
    schoolMembershipHasRole(membership, 'student') || students.length > 0 || school.isPublic
  if (!canRequestForParticipant)
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
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
      actorId: caller.uid,
      actorName: caller.name || null,
      type: 'school_class_assigned',
      title: 'Nueva reserva',
      body: `${classValidation.value.title} fue agregada a tu agenda.`,
      link: '/school/classes',
    }).catch(() => {})
    void createNotification({
      recipientId: school.directorId,
      actorId: caller.uid,
      actorName: caller.name || caller.email,
      type: 'school_class_requested',
      title: 'Nueva reserva directa',
      body: 'Un alumno reservó una clase directamente.',
      link: '/school/classes',
    }).catch(() => {})
    return NextResponse.json({ direct: true, ...classResult }, { status: 201 })
  }
  const requestRecord = await createClassRequest({
    schoolId,
    studentId,
    studentName: student.name,
    requestedBy: caller.uid,
    preferredTeacherId:
      typeof body.preferredTeacherId === 'string' ? body.preferredTeacherId : undefined,
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
      actorId: caller.uid,
      actorName: caller.name || caller.email,
      type: 'school_class_requested',
      title: 'Nueva solicitud de clase',
      body: 'Un alumno solicitó un horario para un alumno.',
      link: '/school/classes',
    }).catch(() => {})
  return NextResponse.json({ request: requestRecord }, { status: 201 })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
