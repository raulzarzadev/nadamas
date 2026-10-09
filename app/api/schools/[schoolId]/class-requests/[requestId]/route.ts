import { FieldValue } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import {
  type SchoolClassOccurrence,
  type SchoolClassRequest,
  schoolClassDisplayTitle,
  schoolMembershipHasRole,
} from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess, schoolPeopleAreValid } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'
import { createSchoolClass, validateClassInput } from '@/lib/server/school-classes'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string; requestId: string }>
}

async function handlePATCH(request: Request, { params }: RouteProps) {
  const { schoolId, requestId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'student'])
  if (access.response) return access.response
  const requestRef = adminDb.collection('schoolClassRequests').doc(requestId)
  const snapshot = await requestRef.get()
  if (!snapshot.exists || snapshot.data()?.schoolId !== schoolId)
    return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 })
  const record = snapshot.data() as SchoolClassRequest
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const body = (await request.json().catch(() => ({}))) as {
    action?: unknown
    status?: unknown
    teacherIds?: unknown
    title?: unknown
    startDate?: unknown
    endDate?: unknown
    startTime?: unknown
    endTime?: unknown
    daysOfWeek?: unknown
    timezone?: unknown
    location?: unknown
    locationUrl?: unknown
  }
  if (body.action === 'archive') {
    if (!isDirector && record.requestedBy !== access.caller.uid)
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    if (!['approved', 'rejected', 'cancelled'].includes(record.status))
      return NextResponse.json(
        { error: 'Solo puedes archivar solicitudes resueltas.' },
        { status: 409 }
      )
    await requestRef.update({ archivedBy: FieldValue.arrayUnion(access.caller.uid) })
    return NextResponse.json({ archived: true })
  }
  if (!isDirector)
    return NextResponse.json(
      { error: 'No tienes permiso para aprobar reservas de esta escuela.' },
      { status: 403 }
    )
  const status =
    body.status === 'rejected' ? 'rejected' : body.status === 'approved' ? 'approved' : null
  if (!status) return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 })
  if (record.status === status) return NextResponse.json({ status })
  if (status === 'rejected') {
    const occurrences: SchoolClassOccurrence[] = []
    const now = Date.now()
    await adminDb.runTransaction(async (transaction) => {
      occurrences.length = 0
      const fresh = await transaction.get(requestRef)
      if (fresh.data()?.status !== record.status) throw new Error('REQUEST_CHANGED')
      const assigned =
        record.status === 'approved'
          ? await transaction.get(
              adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId)
            )
          : null
      const changes = (assigned?.docs || []).filter((doc) => {
        const item = doc.data() as SchoolClassOccurrence
        return (
          (record.classOccurrenceIds
            ? record.classOccurrenceIds.includes(doc.id)
            : Boolean(record.classSeriesId && item.seriesId === record.classSeriesId)) &&
          item.studentIds.includes(record.studentId) &&
          item.status !== 'completed'
        )
      })
      for (const doc of changes) {
        const item = doc.data() as SchoolClassOccurrence
        const studentIds = item.studentIds.filter((id) => id !== record.studentId)
        const updated = {
          ...item,
          id: doc.id,
          studentIds,
          status: studentIds.length ? item.status : ('cancelled' as const),
          updatedAt: now,
        }
        transaction.update(doc.ref, { studentIds, status: updated.status, updatedAt: now })
        occurrences.push(updated)
      }
      transaction.update(requestRef, { status, updatedAt: now })
    })
    await createNotification({
      recipientId: record.requestedBy,
      actorId: access.caller.uid,
      actorName: null,
      type: 'school_class_requested',
      title: 'Reserva rechazada',
      body: 'El entrenador no pudo aceptar el horario solicitado.',
      link: '/athlete/progress',
    }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
    return NextResponse.json({ status, occurrences })
  }
  const teacherIds = Array.isArray(body.teacherIds)
    ? body.teacherIds.filter((id): id is string => typeof id === 'string')
    : record.preferredTeacherId
      ? [record.preferredTeacherId]
      : []
  if (!teacherIds.length)
    return NextResponse.json({ error: 'Asigna al menos un coach.' }, { status: 400 })
  if (!(await schoolPeopleAreValid(schoolId, teacherIds, [record.studentId])))
    return NextResponse.json(
      { error: 'Selecciona un coach que pertenezca a la escuela.' },
      { status: 400 }
    )
  const classValidation = validateClassInput({
    schoolId,
    title: schoolClassDisplayTitle(typeof body.title === 'string' ? body.title : undefined),
    type: record.type,
    teacherIds,
    studentIds: [record.studentId],
    startDate: typeof body.startDate === 'string' ? body.startDate : record.startDate,
    endDate: typeof body.endDate === 'string' ? body.endDate : record.endDate || record.startDate,
    daysOfWeek: Array.isArray(body.daysOfWeek)
      ? body.daysOfWeek.filter(
          (day): day is number => Number.isInteger(day) && day >= 0 && day <= 6
        )
      : record.preferredDays,
    startTime: typeof body.startTime === 'string' ? body.startTime : record.preferredStartTime,
    endTime: typeof body.endTime === 'string' ? body.endTime : record.preferredEndTime,
    timezone: typeof body.timezone === 'string' ? body.timezone : 'America/Mexico_City',
    location: typeof body.location === 'string' ? body.location : record.location,
    locationUrl: typeof body.locationUrl === 'string' ? body.locationUrl : record.locationUrl,
    recurring: true,
  })
  if (!classValidation.ok)
    return NextResponse.json({ error: 'Revisa los datos del horario.' }, { status: 400 })
  let classResult: Awaited<ReturnType<typeof createSchoolClass>>
  try {
    classResult = await createSchoolClass(classValidation.value)
  } catch (error) {
    if (error instanceof Error && error.message === 'GROUP_CLASS_FULL')
      return NextResponse.json({ error: 'El cupo de esta clase está cerrado.' }, { status: 409 })
    throw error
  }
  await requestRef.update({
    status,
    updatedAt: Date.now(),
    classSeriesId: classResult.seriesId,
    classOccurrenceIds: classResult.occurrences.map((item) => item.id),
  })
  const classLink = classDeepLink(schoolId, classResult)
  const classLinkData = classDeepLinkData(classResult)
  await createNotification({
    recipientId: record.requestedBy,
    actorId: access.caller.uid,
    actorName: null,
    type: 'school_class_assigned',
    title: 'Solicitud aprobada',
    body: 'La dirección asignó un horario para tu solicitud.',
    link: classLink.replace('/school/classes', '/athlete/find-coach'),
    ...(classLinkData ? { data: classLinkData } : {}),
  }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
  for (const teacherId of teacherIds) {
    await createNotification({
      recipientId: teacherId,
      classEvent: classResult.occurrences[0]
        ? {
            schoolId,
            date: classResult.occurrences[0].date,
            startTime: classResult.occurrences[0].startTime,
            endTime: classResult.occurrences[0].endTime,
            groupType: classValidation.value.type === 'group' ? 'grupal' : 'particular',
          }
        : undefined,
      actorId: access.caller.uid,
      actorName: null,
      type: 'school_class_assigned',
      title: 'Nueva clase asignada',
      body: `${classValidation.value.title} fue asignada a tu agenda.`,
      link: classLink.replace('/school/classes', '/coach/agenda'),
      ...(classLinkData ? { data: classLinkData } : {}),
    }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
  }
  return NextResponse.json({ status, ...classResult })
}

function classDeepLink(
  schoolId: string,
  result: { seriesId: string; occurrences?: Array<{ date: string; startTime: string }> }
) {
  const first = [...(result.occurrences || [])].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  )[0]
  const params = new URLSearchParams({ school: schoolId })
  if (first?.date) params.set('date', first.date)
  if (first?.startTime) params.set('time', first.startTime)
  if (result.seriesId) params.set('class', result.seriesId)
  return `/school/classes?${params.toString()}`
}

function classDeepLinkData(result: {
  seriesId: string
  occurrences?: Array<{ date: string; startTime: string }>
}): { date?: string; startTime?: string } | undefined {
  const first = [...(result.occurrences || [])].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  )[0]
  if (!first?.date && !first?.startTime) return undefined
  return {
    ...(first?.date ? { date: first.date } : {}),
    ...(first?.startTime ? { startTime: first.startTime } : {}),
  }
}

export const PATCH = withSchoolAgendaUpdate(handlePATCH)
