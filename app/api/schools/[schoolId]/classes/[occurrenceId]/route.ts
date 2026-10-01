import { NextResponse } from 'next/server'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { getSchoolClassOccurrence } from '@/lib/server/school-classes'
import { listSchoolStudents } from '@/lib/server/school-students'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string; occurrenceId: string }>
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { schoolId, occurrenceId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response
  const occurrence = await getSchoolClassOccurrence(schoolId, occurrenceId)
  if (!occurrence) return NextResponse.json({ error: 'Clase no encontrada.' }, { status: 404 })
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const isTeacher = occurrence.teacherIds.includes(access.caller.uid)
  const isStudentAccount =
    !isDirector && !isTeacher && schoolMembershipHasRole(access.membership, 'student')
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const status =
    body.status === 'cancelled' || body.status === 'completed' || body.status === 'scheduled'
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
  const editable = isStudentAccount ? {} : body
  const update = {
    ...(status ? { status } : {}),
    ...(typeof editable.date === 'string' ? { date: editable.date } : {}),
    ...(typeof editable.startTime === 'string' ? { startTime: editable.startTime } : {}),
    ...(typeof editable.endTime === 'string' ? { endTime: editable.endTime } : {}),
    ...(typeof editable.location === 'string' ? { location: editable.location.slice(0, 200) } : {}),
    ...(typeof editable.locationUrl === 'string'
      ? { locationUrl: editable.locationUrl.slice(0, 500) }
      : {}),
    updatedAt: Date.now(),
  }
  await adminDb.collection('schoolClassOccurrences').doc(occurrenceId).update(update)
  for (const teacherId of occurrence.teacherIds)
    void createNotification({
      recipientId: teacherId,
      actorId: access.caller.uid,
      actorName: access.caller.name || null,
      type: status === 'cancelled' ? 'school_class_cancelled' : 'school_class_assigned',
      title: status === 'cancelled' ? 'Clase cancelada' : 'Clase actualizada',
      body:
        status === 'cancelled'
          ? `La clase ${occurrence.title} fue cancelada.`
          : `La clase ${occurrence.title} fue actualizada.`,
      link: '/school/classes',
    }).catch(() => {})
  return NextResponse.json({ occurrence: { ...occurrence, ...update } })
}
