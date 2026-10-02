import { NextResponse } from 'next/server'
import { buildAvailableSlots, type CoachScheduleBlock } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { resolveOfferings } from '@/lib/coach-offerings'
import {
  type SchoolClassOccurrence,
  type SchoolClassRequest,
  schoolMembershipHasRole,
} from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess, schoolPeopleAreValid } from '@/lib/server/school-access'
import { legacySchoolOfferings, schoolClassAgendaBooking } from '@/lib/server/school-agenda'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'
import { getSchoolClassOccurrence } from '@/lib/server/school-classes'
import { listSchoolStudents } from '@/lib/server/school-students'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string; occurrenceId: string }>
}

async function handlePATCH(request: Request, { params }: RouteProps) {
  const { schoolId, occurrenceId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response
  const occurrence = await getSchoolClassOccurrence(schoolId, occurrenceId)
  if (!occurrence) return NextResponse.json({ error: 'Clase no encontrada.' }, { status: 404 })
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const canManageBookings = isDirector || access.membership?.canManageSchoolBookings === true
  const isTeacher = occurrence.teacherIds.includes(access.caller.uid)
  const isStudentAccount =
    !isDirector && !isTeacher && schoolMembershipHasRole(access.membership, 'student')
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const status =
    body.status === 'cancelled' ||
    body.status === 'completed' ||
    body.status === 'scheduled' ||
    body.status === 'pending'
      ? body.status
      : null
  if (
    schoolMembershipHasRole(access.membership, 'teacher') &&
    !isTeacher &&
    !isDirector &&
    !isStudentAccount
  )
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  if (isStudentAccount) {
    const students = await listSchoolStudents(schoolId, access.caller.uid)
    const canCancel = students.some((student) => occurrence.studentIds.includes(student.id))
    if (!canCancel || status !== 'cancelled')
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }
  if (!status && !isDirector && !access.globalAdmin)
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  if (
    (status === 'pending' || (occurrence.status === 'pending' && status === 'scheduled')) &&
    !canManageBookings
  )
    return NextResponse.json(
      { error: 'No tienes permiso para revisar reservas de esta escuela.' },
      { status: 403 }
    )
  const teacherIds = Array.isArray(body.teacherIds)
    ? [...new Set(body.teacherIds.filter((id): id is string => typeof id === 'string'))]
    : null
  if (teacherIds && !teacherIds.length)
    return NextResponse.json({ error: 'Asigna al menos un entrenador.' }, { status: 400 })
  if (teacherIds && !(await schoolPeopleAreValid(schoolId, teacherIds, occurrence.studentIds)))
    return NextResponse.json(
      { error: 'Selecciona entrenadores activos de esta escuela.' },
      { status: 400 }
    )
  const date = typeof body.date === 'string' ? body.date : null
  const startTime = typeof body.startTime === 'string' ? body.startTime : null
  const endTime = typeof body.endTime === 'string' ? body.endTime : null
  const requestedType = body.type === 'group' || body.type === 'individual' ? body.type : null
  if (body.type !== undefined && !requestedType)
    return NextResponse.json({ error: 'Tipo de clase inválido.' }, { status: 400 })
  const requestedClassFull = typeof body.classFull === 'boolean' ? body.classFull : null
  if (body.classFull !== undefined && requestedClassFull === null)
    return NextResponse.json({ error: 'Cupo de clase inválido.' }, { status: 400 })
  if (requestedType === 'individual' && occurrence.studentIds.length > 1)
    return NextResponse.json(
      { error: 'Una clase con varios alumnos debe ser grupal.' },
      { status: 409 }
    )
  if (requestedClassFull === true && (requestedType || occurrence.type) !== 'group')
    return NextResponse.json({ error: 'El cupo solo aplica a clases grupales.' }, { status: 400 })
  const hasScheduleChange = Boolean(teacherIds || date || startTime || endTime)
  if (!isDirector && (hasScheduleChange || requestedType || requestedClassFull !== null))
    return NextResponse.json(
      { error: 'Solo la dirección puede cambiar el horario o el entrenador.' },
      { status: 403 }
    )
  if (
    (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) ||
    (startTime && !/^\d{2}:\d{2}$/.test(startTime)) ||
    (endTime && !/^\d{2}:\d{2}$/.test(endTime)) ||
    ((startTime || endTime) &&
      (startTime || occurrence.startTime) >= (endTime || occurrence.endTime))
  )
    return NextResponse.json({ error: 'Revisa la fecha y el horario.' }, { status: 400 })
  if (hasScheduleChange) {
    const destinationTeachers = teacherIds || occurrence.teacherIds
    if (destinationTeachers.length !== 1)
      return NextResponse.json(
        { error: 'Selecciona un entrenador para validar el horario disponible.' },
        { status: 400 }
      )
    const coachId = destinationTeachers[0]
    const destinationType = requestedType || occurrence.type
    const destinationDate = date || occurrence.date
    const destinationStartTime = startTime || occurrence.startTime
    const destinationEndTime = endTime || occurrence.endTime
    const [
      offeringsSnapshot,
      legacySnapshot,
      bookingsSnapshot,
      blocksSnapshot,
      classesSnapshot,
      requestsSnapshot,
    ] = await Promise.all([
      adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${coachId}`).get(),
      adminDb.collection('schoolAvailability').doc(`${schoolId}_${coachId}`).get(),
      adminDb.collection('bookings').where('schoolId', '==', schoolId).get(),
      adminDb.collection('coachScheduleBlocks').where('schoolId', '==', schoolId).get(),
      adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId).get(),
      adminDb.collection('schoolClassRequests').where('schoolId', '==', schoolId).get(),
    ])
    const offerings = offeringsSnapshot.exists
      ? resolveOfferings({ classOfferings: offeringsSnapshot.data()?.classOfferings || [] })
      : legacySchoolOfferings(legacySnapshot.data()?.weeklySlots)
    const bookings: Booking[] = bookingsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Booking, 'id'>) }))
      .filter((booking) => booking.coachId === coachId && booking.status !== 'cancelled')
    const blocks = blocksSnapshot.docs
      .map((doc) => doc.data() as CoachScheduleBlock)
      .filter((block) => block.coachId === coachId)
    for (const doc of classesSnapshot.docs) {
      if (doc.id === occurrenceId) continue
      const item = doc.data() as SchoolClassOccurrence
      if (
        (item.status === 'scheduled' || item.status === 'pending') &&
        item.teacherIds.includes(coachId) &&
        item.date === destinationDate
      ) {
        bookings.push(
          schoolClassAgendaBooking({
            schoolId,
            occurrence: { ...item, id: doc.id },
            coachId,
            coachName: null,
          })
        )
      }
    }
    for (const doc of requestsSnapshot.docs) {
      const item = doc.data() as SchoolClassRequest
      if (
        item.status === 'pending' &&
        item.preferredTeacherId === coachId &&
        item.startDate === destinationDate
      ) {
        bookings.push({
          id: `school-request-${doc.id}`,
          schoolId,
          coachId,
          coachName: null,
          athleteId: item.studentId,
          athleteName: item.studentName || 'Alumno',
          athleteEmail: null,
          date: destinationDate,
          startTime: item.preferredStartTime,
          endTime: item.preferredEndTime,
          offeringId: `school-request:${doc.id}`,
          scheduleId: `school-request:${doc.id}`,
          locationName: item.location || '',
          mode: 'fixed',
          groupType: item.type === 'group' ? 'grupal' : 'particular',
          days: [],
          priceCents: null,
          currency: 'MXN',
          unit: 'clase',
          status: 'pending',
          source: 'school-request',
          createdAt: item.createdAt || 0,
          updatedAt: item.updatedAt || 0,
          classFull: false,
        })
      }
    }
    const targetDate = new Date(`${destinationDate}T12:00:00`)
    const slot = buildAvailableSlots({
      coachId,
      offerings,
      bookings,
      blocks,
      startDate: targetDate,
      endDate: targetDate,
    }).find(
      (candidate) =>
        candidate.date === destinationDate &&
        candidate.startTime === destinationStartTime &&
        candidate.endTime === destinationEndTime &&
        candidate.status === 'available' &&
        candidate.groupType === (destinationType === 'group' ? 'grupal' : 'particular')
    )
    if (!slot)
      return NextResponse.json(
        { error: 'Ese entrenador no tiene disponible el horario seleccionado.' },
        { status: 409 }
      )
  }
  const editable = isStudentAccount ? {} : body
  const update = {
    ...(status ? { status } : {}),
    ...(typeof editable.date === 'string' ? { date: editable.date } : {}),
    ...(typeof editable.startTime === 'string' ? { startTime: editable.startTime } : {}),
    ...(typeof editable.endTime === 'string' ? { endTime: editable.endTime } : {}),
    ...(requestedType ? { type: requestedType } : {}),
    ...(requestedClassFull !== null || requestedType === 'individual'
      ? { classFull: requestedType === 'individual' ? false : requestedClassFull }
      : {}),
    ...(teacherIds ? { teacherIds } : {}),
    ...(typeof editable.location === 'string' ? { location: editable.location.slice(0, 200) } : {}),
    ...(typeof editable.locationUrl === 'string'
      ? { locationUrl: editable.locationUrl.slice(0, 500) }
      : {}),
    updatedAt: Date.now(),
  }
  await adminDb.collection('schoolClassOccurrences').doc(occurrenceId).update(update)
  for (const teacherId of new Set([...occurrence.teacherIds, ...(teacherIds || [])]))
    void createNotification({
      recipientId: teacherId,
      actorId: access.caller.uid,
      actorName: access.caller.name || null,
      type: status === 'cancelled' ? 'school_class_cancelled' : 'school_class_assigned',
      title:
        status === 'cancelled'
          ? 'Clase cancelada'
          : status === 'pending'
            ? 'Clase pendiente de aprobación'
            : 'Clase actualizada',
      body:
        status === 'cancelled'
          ? `La clase ${occurrence.title} fue cancelada.`
          : status === 'pending'
            ? `La clase ${occurrence.title} quedó pendiente de aprobación.`
            : `La clase ${occurrence.title} fue actualizada.`,
      link: '/school/classes',
    }).catch(() => {})
  return NextResponse.json({ occurrence: { ...occurrence, ...update } })
}

export const PATCH = withSchoolAgendaUpdate(handlePATCH)
