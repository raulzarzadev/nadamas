import { NextResponse } from 'next/server'
import type { SchoolClassRequest } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess, schoolPeopleAreValid } from '@/lib/server/school-access'
import { createSchoolClass, validateClassInput } from '@/lib/server/school-classes'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string; requestId: string }>
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { schoolId, requestId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const requestRef = adminDb.collection('schoolClassRequests').doc(requestId)
  const snapshot = await requestRef.get()
  if (!snapshot.exists || snapshot.data()?.schoolId !== schoolId)
    return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 })
  const record = snapshot.data() as SchoolClassRequest
  if (record.status !== 'pending')
    return NextResponse.json({ error: 'Esta solicitud ya fue atendida.' }, { status: 409 })
  const body = (await request.json().catch(() => ({}))) as {
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
  const status =
    body.status === 'rejected' ? 'rejected' : body.status === 'approved' ? 'approved' : null
  if (!status) return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 })
  if (status === 'rejected') {
    await requestRef.update({ status, updatedAt: Date.now() })
    return NextResponse.json({ status })
  }
  const teacherIds = Array.isArray(body.teacherIds)
    ? body.teacherIds.filter((id): id is string => typeof id === 'string')
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
    title:
      typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Clase escolar',
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
  const classResult = await createSchoolClass(classValidation.value)
  await requestRef.update({ status, updatedAt: Date.now(), classSeriesId: classResult.seriesId })
  void createNotification({
    recipientId: record.requestedBy,
    actorId: access.caller.uid,
    actorName: null,
    type: 'school_class_assigned',
    title: 'Solicitud aprobada',
    body: 'La dirección asignó un horario para tu solicitud.',
    link: '/school/classes',
  }).catch(() => {})
  for (const teacherId of teacherIds) {
    void createNotification({
      recipientId: teacherId,
      actorId: access.caller.uid,
      actorName: null,
      type: 'school_class_assigned',
      title: 'Nueva clase asignada',
      body: `${classValidation.value.title} fue asignada a tu agenda.`,
      link: '/school/classes',
    }).catch(() => {})
  }
  return NextResponse.json({ status, ...classResult })
}
