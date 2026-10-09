import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { schoolLabelList } from '@/lib/server/school-labels'
import { STUDENT_LABEL_COLORS, studentLabelColor } from '@/lib/student-label-colors'

export const runtime = 'nodejs'

async function authorize(request: Request) {
  const params = new URL(request.url).searchParams
  const studentId = params.get('studentId') || ''
  const schoolId = params.get('schoolId') || ''
  const entity = params.get('entity') || 'students'
  if (!['students', 'teachers'].includes(entity)) return null
  if (!studentId || studentId.includes('/') || studentId.length > 128 || schoolId.includes('/'))
    return null
  if (schoolId) {
    if (entity === 'teachers') {
      const access = await requireSchoolAccess(request, schoolId, ['director'])
      if (access.response) return null
      const membership = await adminDb
        .collection('schoolMemberships')
        .doc(`${schoolId}_${studentId}`)
        .get()
      const data = membership.data()
      if (
        !data ||
        data.status !== 'active' ||
        (!schoolMembershipHasRole(data as import('@/lib/school').SchoolMembership, 'teacher') &&
          !schoolMembershipHasRole(data as import('@/lib/school').SchoolMembership, 'director'))
      )
        return null
      return { scope: `school:${schoolId}:teachers`, studentId }
    }
    const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
    if (access.response) return null
    const student = await adminDb.collection('schoolStudents').doc(studentId).get()
    if (!student.exists || student.data()?.schoolId !== schoolId) return null
    if (!access.globalAdmin && !schoolMembershipHasRole(access.membership, 'director')) {
      const classes = await adminDb
        .collection('schoolClassOccurrences')
        .where('schoolId', '==', schoolId)
        .get()
      if (
        !classes.docs.some(
          (doc) =>
            doc.data().teacherIds?.includes(access.caller.uid) &&
            doc.data().studentIds?.includes(studentId)
        )
      )
        return null
    }
    return { scope: `school:${schoolId}`, studentId }
  }
  if (entity !== 'students') return null
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return null
  const caller = await adminAuth.verifyIdToken(token)
  const bookings = await adminDb.collection('bookings').where('coachId', '==', caller.uid).get()
  if (
    !bookings.docs.some(
      (doc) => doc.data().athleteId === studentId && doc.data().status !== 'cancelled'
    )
  )
    return null
  return { scope: `coach:${caller.uid}`, studentId }
}

const key = (value: string) => createHash('sha256').update(value).digest('hex')

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    if (params.get('view') === 'list') {
      const schoolId = params.get('schoolId') || ''
      const entity = params.get('entity') || 'students'
      if (
        !schoolId ||
        schoolId.includes('/') ||
        schoolId.length > 128 ||
        !['students', 'teachers'].includes(entity)
      )
        return NextResponse.json({ error: 'Consulta no válida.' }, { status: 400 })
      const result = await schoolLabelList(request, schoolId, entity)
      if (result.response) return result.response
      return NextResponse.json(result.data, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    const access = await authorize(request)
    if (!access) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    const [labels, assignment] = await Promise.all([
      adminDb.collection('studentLabels').where('scope', '==', access.scope).get(),
      adminDb
        .collection('studentLabelAssignments')
        .doc(key(`${access.scope}|${access.studentId}`))
        .get(),
    ])
    return NextResponse.json(
      {
        labels: labels.docs.map((doc) => ({
          id: doc.id,
          name: String(doc.data().name),
          color: studentLabelColor(doc.data().color).id,
        })),
        selected: assignment.data()?.labelIds || [],
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json({ error: 'No pudimos cargar las etiquetas.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const access = await authorize(request)
    if (!access) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    if (body.color !== undefined && !STUDENT_LABEL_COLORS.some((color) => color.id === body.color))
      return NextResponse.json({ error: 'Elige uno de los colores disponibles.' }, { status: 400 })
    const color = studentLabelColor(body.color).id
    const remove = body.remove === true
    const createOnly = body.createOnly === true
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (!name || name.length > 40)
      return NextResponse.json(
        { error: 'Escribe una etiqueta de hasta 40 caracteres.' },
        { status: 400 }
      )
    const normalizedName = name.normalize('NFKC').toLocaleLowerCase('es')
    const existingLabels = await adminDb
      .collection('studentLabels')
      .where('scope', '==', access.scope)
      .get()
    const matchingLabel = existingLabels.docs.find(
      (doc) => String(doc.data().name).normalize('NFKC').toLocaleLowerCase('es') === normalizedName
    )
    if (body.editId !== undefined) {
      if (typeof body.editId !== 'string' || !/^[a-f0-9]{64}$/.test(body.editId))
        return NextResponse.json({ error: 'Etiqueta no válida.' }, { status: 400 })
      const editingLabel = existingLabels.docs.find((doc) => doc.id === body.editId)
      if (!editingLabel)
        return NextResponse.json({ error: 'Etiqueta no encontrada.' }, { status: 404 })
      if (matchingLabel && matchingLabel.id !== editingLabel.id)
        return NextResponse.json(
          { error: 'Ya existe una etiqueta con ese nombre.' },
          { status: 409 }
        )
      await editingLabel.ref.update({ name, color, updatedAt: Date.now() })
      return NextResponse.json({ ok: true })
    }
    const labelId = matchingLabel?.id || key(`${access.scope}|${normalizedName}`)
    const labelRef = adminDb.collection('studentLabels').doc(labelId)
    const assignmentRef = adminDb
      .collection('studentLabelAssignments')
      .doc(key(`${access.scope}|${access.studentId}`))
    await adminDb.runTransaction(async (transaction) => {
      const [label, assignment] = await Promise.all([
        transaction.get(labelRef),
        transaction.get(assignmentRef),
      ])
      const ids: string[] = assignment.data()?.labelIds || []
      if (!createOnly && !remove && !ids.includes(labelId) && ids.length >= 30)
        throw new Error('label_limit')
      if (!remove && !label.exists)
        transaction.set(labelRef, { scope: access.scope, name, color, createdAt: Date.now() })
      if (!createOnly)
        transaction.set(assignmentRef, {
          scope: access.scope,
          studentId: access.studentId,
          labelIds: remove ? ids.filter((id) => id !== labelId) : [...new Set([...ids, labelId])],
          updatedAt: Date.now(),
        })
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No pudimos guardar la etiqueta.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await authorize(request)
    if (!access) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    const labelId = new URL(request.url).searchParams.get('labelId') || ''
    if (!/^[a-f0-9]{64}$/.test(labelId))
      return NextResponse.json({ error: 'Etiqueta no válida.' }, { status: 400 })
    const labelRef = adminDb.collection('studentLabels').doc(labelId)
    const label = await labelRef.get()
    if (!label.exists || label.data()?.scope !== access.scope)
      return NextResponse.json({ error: 'Etiqueta no encontrada.' }, { status: 404 })
    const assignments = await adminDb
      .collection('studentLabelAssignments')
      .where('scope', '==', access.scope)
      .get()
    const writer = adminDb.bulkWriter()
    const writes = []
    for (const assignment of assignments.docs) {
      const ids: string[] = assignment.data().labelIds || []
      if (ids.includes(labelId))
        writes.push(
          writer.update(assignment.ref, {
            labelIds: ids.filter((id) => id !== labelId),
            updatedAt: Date.now(),
          })
        )
    }
    const results = await Promise.allSettled([...writes, writer.close()])
    if (results.some((result) => result.status === 'rejected'))
      throw new Error('label_delete_failed')
    await labelRef.delete()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No pudimos eliminar la etiqueta.' }, { status: 500 })
  }
}
