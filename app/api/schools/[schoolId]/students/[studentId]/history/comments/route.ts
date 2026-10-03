import { NextResponse } from 'next/server'
import { type SchoolClassOccurrence, schoolMembershipHasRole } from '@/lib/school'
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
  const classKey = typeof body.classKey === 'string' ? body.classKey : ''
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text || text.length > 1000 || !/^(class|booking):.+/.test(classKey))
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
  if (!studentSnapshot?.exists)
    return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 })
  const student = studentSnapshot.data()
  if (student?.schoolId !== schoolId)
    return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 })

  const [sourceType, sourceId] = [
    classKey.slice(0, classKey.indexOf(':')),
    classKey.slice(classKey.indexOf(':') + 1),
  ]
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const isTeacher = schoolMembershipHasRole(access.membership, 'teacher')
  const isStudent = student.studentUserId === access.caller.uid
  let teacherIds: string[] = []
  let belongsToStudent = false
  if (sourceType === 'class') {
    const source = await adminDb.collection('schoolClassOccurrences').doc(sourceId).get()
    const occurrence = source.data() as SchoolClassOccurrence | undefined
    if (occurrence?.schoolId === schoolId) {
      teacherIds = occurrence.teacherIds || []
      belongsToStudent = (occurrence.studentIds || []).includes(studentSnapshot.id)
    }
  } else {
    const source = await adminDb.collection('bookings').doc(sourceId).get()
    const booking = source.data()
    const studentIds = [
      studentSnapshot.id,
      studentId,
      student.studentUserId,
      student.additionalProfileId,
    ].filter((id): id is string => typeof id === 'string' && !!id)
    if (booking?.schoolId === schoolId) {
      teacherIds = [String(booking.coachId || '')]
      belongsToStudent = studentIds.includes(String(booking.athleteId || ''))
    }
  }
  if (!belongsToStudent)
    return NextResponse.json({ error: 'No encontramos al alumno en esta clase.' }, { status: 404 })
  if (!isDirector && !isStudent && (!isTeacher || !teacherIds.includes(access.caller.uid)))
    return NextResponse.json(
      { error: 'No tienes permiso para comentar esta clase.' },
      { status: 403 }
    )

  const comment = {
    schoolId,
    studentId: studentSnapshot.id,
    sourceType,
    sourceId,
    authorId: access.caller.uid,
    text,
    createdAt: Date.now(),
  }
  const saved = await adminDb.collection('schoolClassComments').add(comment)
  return NextResponse.json({ ok: true, id: saved.id })
})
