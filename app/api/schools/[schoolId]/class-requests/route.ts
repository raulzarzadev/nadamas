import { NextResponse } from 'next/server'
import { buildAvailableSlots } from '@/lib/coach-agenda'
import { resolveOfferings } from '@/lib/coach-offerings'
import type { SchoolClassOccurrence, SchoolStudent } from '@/lib/school'
import {
  type SchoolGender,
  schoolClassDisplayTitle,
  schoolMembershipHasRole,
  UNASSIGNED_SCHOOL_COACH_ID,
} from '@/lib/school'
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
  const teacherId =
    typeof body.preferredTeacherId === 'string'
      ? body.preferredTeacherId
      : typeof body.teacherId === 'string'
        ? body.teacherId
        : ''
  if (!teacherId) return NextResponse.json({ error: 'Selecciona un entrenador.' }, { status: 400 })
  const unassignedTeacher = teacherId === UNASSIGNED_SCHOOL_COACH_ID
  if (!unassignedTeacher && !(await schoolPeopleAreValid(schoolId, [teacherId], [studentId])))
    return NextResponse.json(
      { error: 'Selecciona un entrenador que pertenezca a la escuela.' },
      { status: 400 }
    )
  const requestedDate =
    typeof body.startDate === 'string' ? body.startDate : new Date().toISOString().slice(0, 10)
  const requestedStart =
    typeof body.preferredStartTime === 'string' ? body.preferredStartTime : '16:00'
  const requestedEnd = typeof body.preferredEndTime === 'string' ? body.preferredEndTime : '17:00'
  if (unassignedTeacher) {
    const dateAssignments = await adminDb
      .collection('schoolScheduleAssignments')
      .where('schoolId', '==', schoolId)
      .get()
    if (
      dateAssignments.docs.some((doc) => {
        const assignment = doc.data()
        return assignment.date === requestedDate && assignment.startTime === requestedStart
      })
    )
      return NextResponse.json({ error: 'El horario ya no está disponible.' }, { status: 409 })
    const offeringSnapshot = await adminDb
      .collection('schoolCoachOfferings')
      .doc(`${schoolId}_${UNASSIGNED_SCHOOL_COACH_ID}`)
      .get()
    const offerings = resolveOfferings({
      classOfferings: offeringSnapshot.data()?.classOfferings || [],
      teachingLocations: [],
      priceOptions: [],
    })
    const date = new Date(`${requestedDate}T12:00:00`)
    const available = buildAvailableSlots({
      coachId: UNASSIGNED_SCHOOL_COACH_ID,
      offerings,
      bookings: [],
      blocks: [],
      startDate: date,
      endDate: date,
    }).some(
      (slot) =>
        slot.startTime === requestedStart &&
        slot.endTime === requestedEnd &&
        slot.groupType === (body.type === 'group' ? 'grupal' : 'particular')
    )
    if (!available)
      return NextResponse.json({ error: 'El horario ya no está disponible.' }, { status: 409 })
  }
  const classValidation = validateClassInput({
    schoolId,
    title: schoolClassDisplayTitle(typeof body.title === 'string' ? body.title : undefined),
    type: body.type === 'group' ? 'group' : 'individual',
    teacherIds: unassignedTeacher ? [] : [teacherId],
    studentIds: [studentId],
    startDate: requestedDate,
    endDate: requestedDate,
    daysOfWeek: preferredDays,
    startTime: requestedStart,
    endTime: requestedEnd,
    timezone: typeof body.timezone === 'string' ? body.timezone : school.timezone,
    location: typeof body.location === 'string' ? body.location.slice(0, 200) : '',
    locationUrl: typeof body.locationUrl === 'string' ? body.locationUrl.slice(0, 500) : '',
    recurring: false,
  })
  if (!classValidation.ok)
    return NextResponse.json({ error: 'Revisa la fecha y el horario.' }, { status: 400 })
  if (school.bookingMode === 'direct') {
    const endDate =
      typeof body.endDate === 'string' && body.endDate >= requestedDate
        ? body.endDate
        : requestedDate
    const directClassValidation = validateClassInput({
      ...classValidation.value,
      endDate,
      daysOfWeek:
        endDate === requestedDate
          ? [new Date(`${requestedDate}T00:00:00Z`).getUTCDay()]
          : preferredDays,
      recurring: endDate !== requestedDate,
    })
    if (!directClassValidation.ok)
      return NextResponse.json({ error: 'Revisa la fecha y el horario.' }, { status: 400 })
    let classResult: Awaited<ReturnType<typeof createSchoolClass>>
    if (directClassValidation.value.type === 'group') {
      const occurrencesSnapshot = await adminDb
        .collection('schoolClassOccurrences')
        .where('schoolId', '==', schoolId)
        .get()
      const existingGroup = occurrencesSnapshot.docs.find((doc) => {
        const occurrence = doc.data() as SchoolClassOccurrence
        return (
          occurrence.status === 'scheduled' &&
          occurrence.type === 'group' &&
          occurrence.date === directClassValidation.value.startDate &&
          occurrence.startTime === directClassValidation.value.startTime &&
          occurrence.endTime === directClassValidation.value.endTime &&
          (unassignedTeacher
            ? occurrence.teacherIds.length === 0
            : occurrence.teacherIds.includes(teacherId))
        )
      })
      if (existingGroup) {
        const result = await adminDb.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(existingGroup.ref)
          if (!snapshot.exists) return { kind: 'missing' as const }
          const occurrence = snapshot.data() as SchoolClassOccurrence
          if (occurrence.status !== 'scheduled') return { kind: 'changed' as const }
          if (occurrence.studentIds.includes(studentId)) return { kind: 'duplicate' as const }
          const studentIds = [...occurrence.studentIds, studentId]
          const updatedAt = Date.now()
          transaction.update(existingGroup.ref, { studentIds, updatedAt })
          return {
            kind: 'updated' as const,
            occurrence: { ...occurrence, studentIds, updatedAt },
          }
        })
        if (result.kind === 'duplicate')
          return NextResponse.json(
            { error: 'Esta persona ya está inscrita en esta clase grupal.' },
            { status: 409 }
          )
        if (result.kind !== 'updated')
          return NextResponse.json(
            { error: 'El horario cambió. Actualiza la agenda e inténtalo de nuevo.' },
            { status: 409 }
          )
        classResult = {
          seriesId: result.occurrence.seriesId,
          occurrences: [result.occurrence],
        }
      } else {
        classResult = await createSchoolClass(directClassValidation.value)
      }
    } else {
      classResult = await createSchoolClass(directClassValidation.value)
    }
    await createNotification({
      recipientId: student.studentUserId || caller.uid,
      actorId: caller.uid,
      actorName: caller.name || caller.email,
      type: 'school_class_assigned',
      title: 'Reserva confirmada',
      body: 'La clase se agregó directamente a tu agenda.',
      link: '/athlete/progress',
    }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
    for (const assignedTeacherId of directClassValidation.value.teacherIds) {
      await createNotification({
        recipientId: assignedTeacherId,
        classEvent: classResult.occurrences[0]
          ? {
              schoolId,
              date: classResult.occurrences[0].date,
              startTime: classResult.occurrences[0].startTime,
              endTime: classResult.occurrences[0].endTime,
              groupType: directClassValidation.value.type === 'group' ? 'grupal' : 'particular',
            }
          : undefined,
        actorId: caller.uid,
        actorName: caller.name || caller.email,
        type: 'school_class_assigned',
        title: 'Nueva clase agendada',
        body: `${student.name} reservó una clase directamente.`,
        link: '/coach/agenda',
      }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
    }
    return NextResponse.json(
      { direct: true, pendingApproval: false, ...classResult },
      { status: 201 }
    )
  }
  const requestRecord = await createClassRequest({
    schoolId,
    studentId,
    studentName: student.name,
    requestedBy: caller.uid,
    preferredTeacherId: teacherId,
    type: body.type === 'group' ? 'group' : 'individual',
    preferredDays,
    preferredStartTime: classValidation.value.startTime,
    preferredEndTime: classValidation.value.endTime,
    startDate: requestedDate,
    endDate: typeof body.endDate === 'string' ? body.endDate : '',
    durationMinutes: typeof body.durationMinutes === 'number' ? body.durationMinutes : 60,
    location: typeof body.location === 'string' ? body.location.slice(0, 200) : '',
    locationUrl: typeof body.locationUrl === 'string' ? body.locationUrl.slice(0, 500) : '',
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : '',
  })
  if (school)
    await createNotification({
      recipientId: school.directorId,
      actorId: caller.uid,
      actorName: caller.name || caller.email,
      type: 'school_class_requested',
      title: 'Nueva solicitud de clase',
      body: 'Un alumno solicitó un horario para un alumno.',
      link: '/school/classes',
    }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
  await createNotification({
    recipientId: teacherId,
    actorId: caller.uid,
    actorName: caller.name || caller.email,
    type: 'school_class_requested',
    title: 'Reserva pendiente de aprobación',
    body: `${student.name} solicitó una clase para el ${requestRecord.startDate} a las ${requestRecord.preferredStartTime}.`,
    link: '/coach/agenda',
  }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
  return NextResponse.json({ request: requestRecord, pendingApproval: true }, { status: 201 })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
