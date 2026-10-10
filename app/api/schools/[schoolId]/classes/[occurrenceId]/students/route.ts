import { NextResponse } from 'next/server'
import { type SchoolClassOccurrence, schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { preparePaymentEvents } from '@/lib/server/payments/reservations'
import { requireSchoolAccess, schoolPeopleAreValid } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string; occurrenceId: string }>
}

async function handlePOST(request: Request, { params }: RouteProps) {
  const { schoolId, occurrenceId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response

  const body = (await request.json().catch(() => ({}))) as {
    allowPackage?: unknown
    paymentExceptionReason?: unknown
    studentIds?: unknown
    promoteToGroup?: unknown
  }
  if (
    !Array.isArray(body.studentIds) ||
    body.studentIds.length === 0 ||
    body.studentIds.length > 100 ||
    body.studentIds.some((id) => typeof id !== 'string' || !id.trim())
  )
    return NextResponse.json({ error: 'Selecciona al menos un atleta.' }, { status: 400 })

  const studentIds = [...new Set((body.studentIds as string[]).map((id) => id.trim()))]
  if (!(await schoolPeopleAreValid(schoolId, [], studentIds)))
    return NextResponse.json(
      { error: 'Selecciona atletas que pertenezcan a esta escuela.' },
      { status: 400 }
    )

  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const promoteToGroup = body.promoteToGroup === true
  const classRef = adminDb.collection('schoolClassOccurrences').doc(occurrenceId)
  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(classRef)
    if (!snapshot.exists) return { status: 'missing' as const }

    const occurrence = snapshot.data() as SchoolClassOccurrence
    if (occurrence.schoolId !== schoolId) return { status: 'missing' as const }
    const isAssignedTeacher =
      schoolMembershipHasRole(access.membership, 'teacher') &&
      Array.isArray(occurrence.teacherIds) &&
      occurrence.teacherIds.includes(access.caller.uid)
    if (!isDirector && !isAssignedTeacher) return { status: 'unauthorized' as const }
    if (occurrence.status !== 'scheduled' && occurrence.status !== 'pending')
      return { status: 'inactive' as const }
    const shouldPromote = occurrence.type !== 'group' && promoteToGroup && isDirector
    if (occurrence.type !== 'group' && !shouldPromote) return { status: 'individual' as const }
    if (occurrence.classFull) return { status: 'full' as const }

    const currentIds = Array.isArray(occurrence.studentIds)
      ? [...new Set(occurrence.studentIds.filter((id): id is string => typeof id === 'string'))]
      : []
    const nextIds = [...new Set([...currentIds, ...studentIds])]
    if (nextIds.length > 100) return { status: 'limit' as const }
    const addedCount = nextIds.length - currentIds.length
    const apply = await preparePaymentEvents(
      transaction,
      studentIds
        .filter((id) => !currentIds.includes(id))
        .map((studentId) => ({
          scope: `school:${schoolId}`,
          studentId,
          sourceId: occurrenceId,
          date: occurrence.date,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          actorId: access.caller.uid,
          action: 'reserve',
          allowPackage: body.allowPackage === true,
          exceptionReason:
            isDirector && typeof body.paymentExceptionReason === 'string'
              ? body.paymentExceptionReason.trim().slice(0, 300)
              : undefined,
        }))
    )
    apply()
    if (addedCount > 0 || shouldPromote)
      transaction.update(classRef, {
        studentIds: nextIds,
        ...(shouldPromote ? { type: 'group' } : {}),
        updatedAt: Date.now(),
      })
    return { status: 'ok' as const, addedCount }
  })

  if (result.status !== 'ok') {
    const errors = {
      missing: { message: 'No encontramos esta clase.', status: 404 },
      unauthorized: {
        message: 'No tienes permiso para agregar atletas a esta clase.',
        status: 403,
      },
      inactive: { message: 'Esta clase ya no admite atletas.', status: 409 },
      individual: { message: 'Solo se pueden agregar atletas a clases grupales.', status: 409 },
      full: { message: 'El cupo de esta clase está cerrado.', status: 409 },
      limit: { message: 'La clase alcanzó el máximo de 100 atletas.', status: 409 },
    } as const
    const error = errors[result.status]
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  if (isDirector && result.addedCount > 0) {
    const occurrence = (await classRef.get()).data() as SchoolClassOccurrence
    for (const teacherId of occurrence.teacherIds) {
      await createNotification({
        recipientId: teacherId,
        actorId: access.caller.uid,
        type: 'school_class_assigned',
        title: 'Se actualizó la clase grupal',
        body: 'La dirección actualizó los alumnos de tu clase.',
        link: '/coach/agenda',
        data: { date: occurrence.date, startTime: occurrence.startTime },
        classEvent: {
          schoolId,
          date: occurrence.date,
          startTime: occurrence.startTime,
          endTime: occurrence.endTime,
          groupType: 'grupal',
        },
      }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
    }
  }
  return NextResponse.json({ ok: true, addedCount: result.addedCount })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
