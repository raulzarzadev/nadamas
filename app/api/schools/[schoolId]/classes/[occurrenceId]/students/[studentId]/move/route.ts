import { NextResponse } from 'next/server'
import { type SchoolClassOccurrence, schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

type RouteProps = {
  params: Promise<{ schoolId: string; occurrenceId: string; studentId: string }>
}

async function handlePOST(request: Request, { params }: RouteProps) {
  const { schoolId, occurrenceId, studentId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const body = (await request.json().catch(() => ({}))) as {
    destinationSchoolClassId?: unknown
  }
  if (typeof body.destinationSchoolClassId !== 'string' || !body.destinationSchoolClassId)
    return NextResponse.json({ error: 'Selecciona una clase de destino.' }, { status: 400 })
  if (body.destinationSchoolClassId === occurrenceId)
    return NextResponse.json({ error: 'Selecciona otra clase.' }, { status: 409 })

  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(
      adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId)
    )
    const sourceDoc = snapshot.docs.find((doc) => doc.id === occurrenceId)
    const destinationDoc = snapshot.docs.find((doc) => doc.id === body.destinationSchoolClassId)
    if (!sourceDoc || !destinationDoc) return 'missing' as const
    const source = sourceDoc.data() as SchoolClassOccurrence
    const destination = destinationDoc.data() as SchoolClassOccurrence
    if (
      !isDirector &&
      (!schoolMembershipHasRole(access.membership, 'teacher') ||
        !source.teacherIds.includes(access.caller.uid) ||
        !destination.teacherIds.includes(access.caller.uid))
    )
      return 'unauthorized' as const
    if (
      (source.status !== 'scheduled' && source.status !== 'pending') ||
      destination.status !== 'scheduled' ||
      destination.type !== 'group' ||
      destination.classFull === true
    )
      return 'unavailable' as const
    const sourceMatches = snapshot.docs.filter((doc) => {
      const item = doc.data() as SchoolClassOccurrence
      return (
        (item.status === 'scheduled' || item.status === 'pending') &&
        item.schoolId === source.schoolId &&
        item.type === source.type &&
        item.date === source.date &&
        item.startTime === source.startTime &&
        item.endTime === source.endTime &&
        item.title.trim().toLocaleLowerCase('es') ===
          source.title.trim().toLocaleLowerCase('es') &&
        [...item.teacherIds].sort().join('|') === [...source.teacherIds].sort().join('|') &&
        item.studentIds.includes(studentId)
      )
    })
    if (!sourceMatches.length) return 'missing' as const
    if (destination.studentIds.includes(studentId)) return 'duplicate' as const
    if (destination.studentIds.length >= 100) return 'unavailable' as const
    const now = Date.now()
    for (const doc of sourceMatches) {
      const item = doc.data() as SchoolClassOccurrence
      transaction.update(doc.ref, {
        studentIds: item.studentIds.filter((id) => id !== studentId),
        updatedAt: now,
      })
    }
    transaction.update(destinationDoc.ref, {
      studentIds: [...destination.studentIds, studentId],
      updatedAt: now,
    })
    return 'ok' as const
  })
  if (result === 'ok') return NextResponse.json({ ok: true })
  const errors = {
    missing: ['No encontramos al alumno o la clase.', 404],
    unauthorized: ['No tienes permiso para cambiar esta clase.', 403],
    unavailable: ['La clase de destino ya no admite alumnos.', 409],
    duplicate: ['El alumno ya está en esa clase.', 409],
  } as const
  const [error, status] = errors[result]
  return NextResponse.json({ error }, { status })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
