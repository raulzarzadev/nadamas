import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'
import { getOrRestoreSchoolAgendaStudent } from '@/lib/server/school-students'

export const runtime = 'nodejs'
async function updateStudent(
  request: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> }
) {
  const { schoolId, studentId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  try {
    const body = await request.json()
    const fields = {
      name: 120,
      studentEmail: 160,
      phone: 40,
      birthDate: 10,
      gender: 20,
      guardianName: 120,
      guardianRelationship: 80,
      guardianPhone: 40,
      guardianEmail: 160,
    }
    const changes: Record<string, string> = {}
    for (const [field, limit] of Object.entries(fields)) {
      if (typeof body[field] === 'string') changes[field] = body[field].trim().slice(0, limit)
    }
    if (
      !changes.name ||
      changes.name.length < 2 ||
      (changes.phone && !/^\+\d{8,15}$/.test(changes.phone)) ||
      (changes.gender && !['varonil', 'femenil', 'otro'].includes(changes.gender)) ||
      (changes.birthDate &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(changes.birthDate) ||
          Number.isNaN(Date.parse(changes.birthDate)) ||
          new Date(changes.birthDate).toISOString().slice(0, 10) !== changes.birthDate ||
          changes.birthDate > new Date().toISOString().slice(0, 10))) ||
      [changes.studentEmail, changes.guardianEmail].some(
        (value) => value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      )
    ) {
      return NextResponse.json({ error: 'Revisa los datos del alumno.' }, { status: 400 })
    }
    const ref = adminDb.collection('schoolStudents').doc(studentId)
    await getOrRestoreSchoolAgendaStudent(schoolId, studentId)
    const snapshot = await ref.get()
    if (!snapshot.exists || snapshot.data()?.schoolId !== schoolId)
      return NextResponse.json({ error: 'No encontramos al alumno.' }, { status: 404 })
    const current = snapshot.data() || {}
    const bookings = await adminDb.collection('bookings').where('schoolId', '==', schoolId).get()
    const ids = new Set(
      [studentId, current.additionalProfileId || current.studentUserId].filter(Boolean)
    )
    const matching = bookings.docs.filter((doc) => ids.has(doc.data().athleteId))
    const now = Date.now()
    await ref.update({ ...changes, updatedAt: now })
    for (let start = 0; start < matching.length; start += 400) {
      const batch = adminDb.batch()
      for (const doc of matching.slice(start, start + 400))
        batch.update(doc.ref, {
          athleteName: changes.name,
          ...(changes.phone !== undefined ? { athletePhone: changes.phone } : {}),
          athleteEmail: changes.studentEmail ?? current.studentEmail ?? null,
          updatedAt: now,
        })
      await batch.commit()
    }
    return NextResponse.json({
      student: { ...current, ...changes, id: snapshot.id, updatedAt: now },
    })
  } catch {
    return NextResponse.json(
      { error: 'No pudimos guardar los datos. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
export const PATCH = withSchoolAgendaUpdate(updateStudent)
