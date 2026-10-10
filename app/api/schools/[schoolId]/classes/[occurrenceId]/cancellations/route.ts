import { NextResponse } from 'next/server'
import { type SchoolClassOccurrence, schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { preparePaymentEvents } from '@/lib/server/payments/reservations'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

type Props = { params: Promise<{ schoolId: string; occurrenceId: string }> }
export const POST = withSchoolAgendaUpdate(async (request: Request, { params }: Props) => {
  const { schoolId, occurrenceId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  const input = await request.json().catch(() => ({}))
  const body = input && typeof input === 'object' ? input : {}
  if (
    !Array.isArray(body.studentIds) ||
    body.studentIds.length > 100 ||
    body.studentIds.some((id: unknown) => typeof id !== 'string' || !id)
  )
    return NextResponse.json(
      { error: 'Selecciona los participantes que quieres retirar.' },
      { status: 400 }
    )
  const selected = new Set<string>(body.studentIds)
  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(
      adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId)
    )
    const doc = snapshot.docs.find((item) => item.id === occurrenceId)
    if (!doc) return { error: 'missing' as const }
    const occurrence = doc.data() as SchoolClassOccurrence
    if (
      !access.globalAdmin &&
      !schoolMembershipHasRole(access.membership, 'director') &&
      !occurrence.teacherIds.includes(access.caller.uid)
    )
      return { error: 'unauthorized' as const }
    if (!['scheduled', 'pending'].includes(occurrence.status)) return { error: 'inactive' as const }
    const matches = snapshot.docs.filter((item) => {
      const candidate = item.data() as SchoolClassOccurrence
      return (
        ['scheduled', 'pending'].includes(candidate.status) &&
        (item.id === occurrenceId ||
          (occurrence.type === 'group' &&
            candidate.type === 'group' &&
            candidate.date === occurrence.date &&
            candidate.startTime === occurrence.startTime &&
            candidate.endTime === occurrence.endTime &&
            candidate.title.trim().toLocaleLowerCase('es') ===
              occurrence.title.trim().toLocaleLowerCase('es') &&
            [...candidate.teacherIds].sort().join('|') ===
              [...occurrence.teacherIds].sort().join('|')))
      )
    })
    const currentIds = new Set(
      matches.flatMap((item) => (item.data() as SchoolClassOccurrence).studentIds)
    )
    if (
      (currentIds.size > 0 && selected.size === 0) ||
      [...selected].some((id) => !currentIds.has(id))
    )
      return { error: 'changed' as const }
    const cancelled = [...currentIds].every((id) => selected.has(id))
    const apply = await preparePaymentEvents(
      transaction,
      matches.flatMap((item) => {
        const current = item.data() as SchoolClassOccurrence
        return current.studentIds
          .filter((id) => selected.has(id))
          .map((studentId) => ({
            scope: `school:${schoolId}`,
            studentId,
            sourceId: item.id,
            date: current.date,
            startTime: current.startTime,
            actorId: access.caller.uid,
            action: 'release' as const,
            organizerCancelled: true,
          }))
      })
    )
    apply()
    for (const item of matches) {
      const current = item.data() as SchoolClassOccurrence
      transaction.update(item.ref, {
        studentIds: current.studentIds.filter((id) => !selected.has(id)),
        ...(cancelled ? { status: 'cancelled', cancelledStudentIds: current.studentIds } : {}),
        updatedAt: Date.now(),
      })
    }
    return { occurrence, cancelled, removedCount: selected.size }
  })
  if ('error' in result)
    return NextResponse.json(
      {
        error:
          result.error === 'unauthorized'
            ? 'No autorizado.'
            : 'La clase cambió. Actualiza la agenda e inténtalo de nuevo.',
      },
      { status: result.error === 'unauthorized' ? 403 : 409 }
    )
  for (const teacherId of new Set([
    ...result.occurrence.teacherIds,
    ...(result.cancelled ? [access.caller.uid] : []),
  ])) {
    await createNotification({
      recipientId: teacherId,
      actorId: access.caller.uid,
      type: result.cancelled ? 'school_class_cancelled' : 'school_class_assigned',
      title: result.cancelled ? 'Clase cancelada' : 'Clase actualizada',
      body: result.cancelled
        ? 'Se canceló la clase y se retiró a sus participantes.'
        : 'Se actualizaron los participantes de la clase.',
      link: '/coach/agenda',
      data: { date: result.occurrence.date, startTime: result.occurrence.startTime },
      classEvent: {
        schoolId,
        date: result.occurrence.date,
        startTime: result.occurrence.startTime,
        endTime: result.occurrence.endTime,
        groupType: result.occurrence.type === 'group' ? 'grupal' : 'particular',
      },
    }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
  }
  return NextResponse.json({
    ok: true,
    cancelled: result.cancelled,
    removedCount: result.removedCount,
  })
})
