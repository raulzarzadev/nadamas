import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'
import { listSchoolStudents } from '@/lib/server/school-students'

async function handlePOST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const token = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const caller = await adminAuth.verifyIdToken(token)
  const { schoolId } = await params
  const body = (await request.json()) as { schoolRequestId?: string; schoolClassId?: string }
  const requestId = body.schoolRequestId
  const classId = body.schoolClassId
  if (
    [requestId, classId].some(
      (id) => id !== undefined && (typeof id !== 'string' || !id || id.includes('/'))
    )
  )
    return NextResponse.json({ error: 'Selecciona una clase.' }, { status: 400 })
  if ((!requestId && !classId) || (requestId && classId))
    return NextResponse.json({ error: 'Selecciona una clase.' }, { status: 400 })
  const ownedIds = new Set(
    (await listSchoolStudents(schoolId, caller.uid)).map((student) => student.id)
  )
  ownedIds.add(caller.uid)
  const ref = adminDb
    .collection(requestId ? 'schoolClassRequests' : 'schoolClassOccurrences')
    .doc((requestId || classId) as string)
  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const record = snapshot.data()
    if (!record || record.schoolId !== schoolId) return 404
    const ownsRequest =
      requestId && (record.requestedBy === caller.uid || ownedIds.has(record.studentId))
    const ids: string[] = Array.isArray(record.studentIds) ? record.studentIds : []
    if (!ownsRequest && (requestId || !ids.some((id) => ownedIds.has(id)))) return 403
    if (record.status === 'cancelled') return 200
    const now = Date.now()
    if (requestId) {
      if (record.status !== 'pending') return 409
      transaction.update(ref, { status: 'cancelled', updatedAt: now })
    } else {
      const remaining = ids.filter((id) => !ownedIds.has(id))
      transaction.update(ref, {
        studentIds: remaining,
        ...(remaining.length ? {} : { status: 'cancelled' }),
        updatedAt: now,
      })
    }
    return 200
  })
  return NextResponse.json(
    result === 200 ? { ok: true } : { error: 'No pudimos cancelar esta inscripción.' },
    { status: result }
  )
}

export const POST = withSchoolAgendaUpdate(handlePOST)
