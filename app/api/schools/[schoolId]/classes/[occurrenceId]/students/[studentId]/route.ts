import { NextResponse } from 'next/server'
import { type SchoolClassOccurrence, schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

type RouteProps = {
  params: Promise<{ schoolId: string; occurrenceId: string; studentId: string }>
}

function sameClass(a: SchoolClassOccurrence, b: SchoolClassOccurrence) {
  return (
    a.id === b.id ||
    (a.type === 'group' &&
      b.type === 'group' &&
      a.schoolId === b.schoolId &&
      a.date === b.date &&
      a.startTime === b.startTime &&
      a.endTime === b.endTime &&
      a.title.trim().toLocaleLowerCase('es') === b.title.trim().toLocaleLowerCase('es') &&
      [...a.teacherIds].sort().join('|') === [...b.teacherIds].sort().join('|'))
  )
}

async function mutate(request: Request, { params }: RouteProps, remove: boolean) {
  const { schoolId, occurrenceId, studentId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const input = remove ? {} : await request.json().catch(() => ({}))
  const body = input && typeof input === 'object' ? input : {}
  const attended = (body as { attended?: unknown }).attended
  const note = (body as { note?: unknown }).note
  if (!remove && typeof attended !== 'boolean' && typeof note !== 'string')
    return NextResponse.json({ error: 'Selecciona un cambio para este alumno.' }, { status: 400 })
  if (typeof note === 'string' && note.length > 1000)
    return NextResponse.json(
      { error: 'La nota no puede superar 1000 caracteres.' },
      { status: 400 }
    )

  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(
      adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId)
    )
    const selected = snapshot.docs.find((doc) => doc.id === occurrenceId)
    if (!selected) return 'missing' as const
    const occurrence = selected.data() as SchoolClassOccurrence
    if (
      !isDirector &&
      (!schoolMembershipHasRole(access.membership, 'teacher') ||
        !occurrence.teacherIds.includes(access.caller.uid))
    )
      return 'unauthorized' as const
    if (occurrence.status !== 'scheduled' && occurrence.status !== 'pending')
      return 'inactive' as const
    const matches = snapshot.docs.filter((doc) => {
      const item = doc.data() as SchoolClassOccurrence
      return (
        (item.status === 'scheduled' || item.status === 'pending') &&
        sameClass(occurrence, item) &&
        item.studentIds.includes(studentId)
      )
    })
    if (!matches.length) return 'missing' as const
    const now = Date.now()
    if (remove) {
      for (const doc of matches) {
        const item = doc.data() as SchoolClassOccurrence
        transaction.update(doc.ref, {
          studentIds: item.studentIds.filter((id) => id !== studentId),
          updatedAt: now,
        })
      }
      for (const sourceId of new Set([occurrenceId, ...matches.map((doc) => doc.id)]))
        transaction.delete(
          adminDb.collection('agendaStudentRecords').doc(`class-${sourceId}-${studentId}`)
        )
    } else {
      transaction.set(
        adminDb.collection('agendaStudentRecords').doc(`class-${occurrenceId}-${studentId}`),
        {
          sourceId: occurrenceId,
          studentId,
          schoolId,
          coachId: occurrence.teacherIds[0] || '',
          ...(typeof attended === 'boolean' ? { attended } : {}),
          ...(typeof note === 'string' ? { note: note.trim() } : {}),
          updatedAt: now,
        },
        { merge: true }
      )
    }
    return 'ok' as const
  })
  if (result === 'ok') {
    if (remove && isDirector) {
      const occurrence = (
        await adminDb.collection('schoolClassOccurrences').doc(occurrenceId).get()
      ).data() as SchoolClassOccurrence
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
            groupType: occurrence.type === 'group' ? 'grupal' : 'particular',
          },
        }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
      }
    }
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json(
    {
      error:
        result === 'unauthorized'
          ? 'No tienes permiso para editar esta clase.'
          : 'No encontramos al alumno en esta clase.',
    },
    { status: result === 'unauthorized' ? 403 : result === 'inactive' ? 409 : 404 }
  )
}

export const PATCH = withSchoolAgendaUpdate((request: Request, props: RouteProps) =>
  mutate(request, props, false)
)
export const DELETE = withSchoolAgendaUpdate((request: Request, props: RouteProps) =>
  mutate(request, props, true)
)
