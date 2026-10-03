import { NextResponse } from 'next/server'
import { type SchoolStudent, schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { getSchoolStudentHistory } from '@/lib/server/school-student-history'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> }
) {
  const { schoolId, studentId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response
  try {
    const snapshot = await adminDb.collection('schoolStudents').doc(studentId).get()
    const student = snapshot.exists
      ? ({ ...snapshot.data(), id: snapshot.id } as SchoolStudent)
      : null
    if (!student || student.schoolId !== schoolId)
      return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 })
    const director = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
    const teacher = schoolMembershipHasRole(access.membership, 'teacher')
    const managesStudent =
      student.studentUserId === access.caller.uid ||
      [...(student.managerIds || []), ...(student.guardianIds || [])].includes(access.caller.uid)
    if (!director && !teacher && !managesStudent)
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    const school = await getSchoolById(schoolId)
    const history = await getSchoolStudentHistory(
      student,
      school?.timezone || 'America/Mexico_City',
      !director && teacher && !managesStudent ? access.caller.uid : undefined,
      director || teacher
    )
    return NextResponse.json(history)
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cargar el historial del alumno.' },
      { status: 500 }
    )
  }
}
