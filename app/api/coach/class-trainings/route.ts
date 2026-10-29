import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { normalizeClassTraining } from '@/lib/class-training'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requirePersonalCoach } from '@/lib/server/personal-class-access'
import { getSchoolMembership } from '@/lib/server/school-access'
import { STUDENT_LABEL_COLORS } from '@/lib/student-label-colors'

export async function GET(request: Request) {
  const access = await requirePersonalCoach(request)
  if (access.response) return access.response

  try {
    const [personal, school] = await Promise.all([
      adminDb.collection('coachClassNotes').where('coachId', '==', access.uid).get(),
      adminDb.collection('schoolClassNotes').where('coachId', '==', access.uid).get(),
    ])
    const schoolIds = [
      ...new Set(
        school.docs
          .map((doc) => doc.data().schoolId)
          .filter((id): id is string => typeof id === 'string' && Boolean(id))
      ),
    ]
    const memberships = await Promise.all(
      schoolIds.map((id) => getSchoolMembership(id, access.uid))
    )
    const allowedSchools = new Set(
      schoolIds.filter((_, index) => {
        const membership = memberships[index]
        return (
          membership?.status === 'active' &&
          (schoolMembershipHasRole(membership, 'teacher') ||
            schoolMembershipHasRole(membership, 'director'))
        )
      })
    )
    const items = [...personal.docs, ...school.docs]
      .flatMap((doc) => {
        const data = doc.data()
        if (data.schoolId && !allowedSchools.has(data.schoolId)) return []
        const training = normalizeClassTraining(data.training || []) || []
        if (
          (!training.length && !data.title) ||
          typeof data.date !== 'string' ||
          typeof data.startTime !== 'string'
        )
          return []
        return [
          {
            id: doc.id,
            schoolId: data.schoolId || null,
            date: data.date,
            startTime: data.startTime,
            title: typeof data.title === 'string' ? data.title : '',
            description: typeof data.description === 'string' ? data.description : '',
            tags: Array.isArray(data.tags)
              ? data.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
              : [],
            training,
          },
        ]
      })
      .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json(
      { error: 'No pudimos cargar los entrenos de tus clases.' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const access = await requirePersonalCoach(request)
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
  const schoolId = typeof body?.schoolId === 'string' ? body.schoolId : ''
  const date = typeof body?.date === 'string' ? body.date : ''
  const startTime = typeof body?.startTime === 'string' ? body.startTime : ''
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const tags: string[] = Array.isArray(body?.tags) ? body.tags : []
  const training = normalizeClassTraining(body?.training)
  const tagColors: Record<string, unknown> =
    body?.tagColors && typeof body.tagColors === 'object' && !Array.isArray(body.tagColors)
      ? body.tagColors
      : {}
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    schoolId.includes('/') ||
    schoolId.length > 128 ||
    !title ||
    title.length > 100 ||
    description.length > 2000 ||
    (body?.description !== undefined && typeof body.description !== 'string') ||
    !Array.isArray(body?.tags) ||
    tags.length > 20 ||
    tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 40) ||
    Object.values(tagColors).some(
      (color) => !STUDENT_LABEL_COLORS.some((item) => item.id === color)
    ) ||
    !training
  )
    return NextResponse.json({ error: 'Revisa los datos del entreno.' }, { status: 400 })
  try {
    if (schoolId) {
      const membership = await getSchoolMembership(schoolId, access.uid)
      if (
        !membership ||
        membership.status !== 'active' ||
        (!schoolMembershipHasRole(membership, 'teacher') &&
          !schoolMembershipHasRole(membership, 'director'))
      )
        return NextResponse.json({ error: 'No tienes acceso a este entreno.' }, { status: 403 })
    }
    const ref = adminDb
      .collection(schoolId ? 'schoolClassNotes' : 'coachClassNotes')
      .doc(
        encodeURIComponent(
          schoolId
            ? `${schoolId}|${access.uid}|${date}|${startTime}`
            : `${access.uid}|${date}|${startTime}`
        )
      )
    const existing = await ref.get()
    if (!existing.exists || existing.data()?.coachId !== access.uid)
      return NextResponse.json({ error: 'No encontramos este entreno.' }, { status: 404 })
    const cleanTags = [
      ...new Map(tags.map((tag) => [tag.trim().toLocaleLowerCase('es-MX'), tag.trim()])).values(),
    ]
    const scope = `coach:${access.uid}:sessions`
    const labels = await adminDb.collection('studentLabels').where('scope', '==', scope).get()
    const batch = adminDb.batch()
    for (const name of cleanTags) {
      const normalizedName = name.normalize('NFKC').toLocaleLowerCase('es')
      if (
        labels.docs.some(
          (doc) =>
            String(doc.data().name).normalize('NFKC').toLocaleLowerCase('es') === normalizedName
        )
      )
        continue
      const id = createHash('sha256').update(`${scope}|${normalizedName}`).digest('hex')
      batch.set(
        adminDb.collection('studentLabels').doc(id),
        { scope, name, color: tagColors[name] || 'blue', createdAt: Date.now() },
        { merge: true }
      )
    }
    batch.update(ref, {
      title,
      description,
      tags: cleanTags,
      training,
      updatedAt: Date.now(),
      updatedBy: access.uid,
    })
    await batch.commit()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No pudimos guardar el entreno.' }, { status: 500 })
  }
}
