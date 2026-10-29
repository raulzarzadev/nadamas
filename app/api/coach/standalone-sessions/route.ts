import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { normalizeClassTraining } from '@/lib/class-training'
import { adminDb } from '@/lib/server/firebase-admin'
import { requirePersonalCoach } from '@/lib/server/personal-class-access'
import { STUDENT_LABEL_COLORS } from '@/lib/student-label-colors'

export async function GET(request: Request) {
  const access = await requirePersonalCoach(request)
  if (access.response) return access.response
  try {
    const scope = `coach:${access.uid}:sessions`
    const [snapshot, labelSnapshot, personalLabels] = await Promise.all([
      adminDb.collection('coachStandaloneSessions').where('coachId', '==', access.uid).get(),
      adminDb.collection('studentLabels').where('scope', '==', scope).get(),
      adminDb.collection('studentLabels').where('scope', '==', `coach:${access.uid}`).get(),
    ])
    const items = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        description: typeof doc.data().description === 'string' ? doc.data().description : '',
        tags: Array.isArray(doc.data().tags)
          ? doc.data().tags.filter((tag: unknown): tag is string => typeof tag === 'string')
          : [],
        training: normalizeClassTraining(doc.data().training || []) || [],
        updatedAt: doc.data().updatedAt || 0,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
    const labels = labelSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: String(doc.data().name || ''),
      color: doc.data().color || 'blue',
    }))
    for (const doc of personalLabels.docs) {
      const name = String(doc.data().name || '')
      if (
        name &&
        !labels.some(
          (label) => label.name.toLocaleLowerCase('es-MX') === name.toLocaleLowerCase('es-MX')
        )
      )
        labels.push({ id: doc.id, name, color: doc.data().color || 'blue' })
    }
    for (const tag of items.flatMap((item) => item.tags)) {
      if (
        !labels.some(
          (label) => label.name.toLocaleLowerCase('es-MX') === tag.toLocaleLowerCase('es-MX')
        )
      )
        labels.push({ id: `legacy:${tag}`, name: tag, color: 'blue' })
    }
    return NextResponse.json(
      { items, labels },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json({ error: 'No pudimos cargar tus sesiones.' }, { status: 500 })
  }
}

async function save(request: Request, editing: boolean) {
  const access = await requirePersonalCoach(request)
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const tags: string[] = Array.isArray(body?.tags) ? body.tags : []
  const training = normalizeClassTraining(body?.training)
  const tagColors: Record<string, unknown> =
    body?.tagColors && typeof body.tagColors === 'object' && !Array.isArray(body.tagColors)
      ? body.tagColors
      : {}
  if (
    !title ||
    title.length > 100 ||
    description.length > 2000 ||
    (body?.description !== undefined && typeof body.description !== 'string') ||
    (body?.tags !== undefined && !Array.isArray(body.tags)) ||
    tags.length > 20 ||
    tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 40) ||
    Object.values(tagColors).some(
      (color) => !STUDENT_LABEL_COLORS.some((item) => item.id === color)
    ) ||
    !training ||
    (editing && (typeof body?.id !== 'string' || !/^[\w-]{1,128}$/.test(body.id)))
  )
    return NextResponse.json(
      { error: 'Revisa el nombre y el entreno de la sesión.' },
      { status: 400 }
    )
  try {
    const cleanTags = [
      ...new Map(tags.map((tag) => [tag.trim().toLocaleLowerCase('es-MX'), tag.trim()])).values(),
    ]
    const collection = adminDb.collection('coachStandaloneSessions')
    const ref = editing ? collection.doc(body.id) : collection.doc()
    if (editing) {
      const existing = await ref.get()
      if (!existing.exists || existing.data()?.coachId !== access.uid)
        return NextResponse.json({ error: 'No encontramos esta sesión.' }, { status: 404 })
    }
    const updatedAt = Date.now()
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
        { scope, name, color: tagColors[name] || 'blue', createdAt: updatedAt },
        { merge: true }
      )
    }
    batch.set(
      ref,
      {
        coachId: access.uid,
        title,
        description,
        tags: cleanTags,
        training,
        updatedAt,
        ...(!editing ? { createdAt: updatedAt } : {}),
      },
      { merge: true }
    )
    await batch.commit()
    return NextResponse.json({
      item: { id: ref.id, title, description, tags: cleanTags, training, updatedAt },
    })
  } catch {
    return NextResponse.json({ error: 'No pudimos guardar la sesión.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return save(request, false)
}
export async function PATCH(request: Request) {
  return save(request, true)
}
