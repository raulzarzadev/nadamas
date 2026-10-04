import { NextResponse } from 'next/server'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

type RouteProps = { params: Promise<{ schoolId: string; studentId: string }> }

export const POST = withSchoolAgendaUpdate(async (request: Request, { params }: RouteProps) => {
  const { schoolId, studentId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response

  const input = await request.json().catch(() => ({}))
  const body = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text || text.length > 1000)
    return NextResponse.json(
      { error: 'Escribe un comentario de hasta 1000 caracteres.' },
      { status: 400 }
    )

  const directSnapshot = await adminDb.collection('schoolStudents').doc(studentId).get()
  const linkedSnapshots = directSnapshot.exists
    ? []
    : (await adminDb.collection('schoolStudents').where('studentUserId', '==', studentId).get())
        .docs
  const studentSnapshot = directSnapshot.exists
    ? directSnapshot
    : linkedSnapshots.find((doc) => doc.data().schoolId === schoolId)
  if (!studentSnapshot?.exists || studentSnapshot.data()?.schoolId !== schoolId)
    return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 })

  const student = studentSnapshot.data()
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const isTeacher = schoolMembershipHasRole(access.membership, 'teacher')
  const isStudent =
    schoolMembershipHasRole(access.membership, 'student') &&
    student?.studentUserId === access.caller.uid
  if (!isDirector && !isTeacher && !isStudent)
    return NextResponse.json({ error: 'No tienes permiso para comentar.' }, { status: 403 })

  const saved = await adminDb.collection('schoolStudentComments').add({
    schoolId,
    studentId: studentSnapshot.id,
    authorId: access.caller.uid,
    text,
    createdAt: Date.now(),
  })
  return NextResponse.json({ ok: true, id: saved.id })
})
