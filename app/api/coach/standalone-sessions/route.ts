import { NextResponse } from 'next/server'
import { normalizeClassTraining } from '@/lib/class-training'
import { adminDb } from '@/lib/server/firebase-admin'
import { requirePersonalCoach } from '@/lib/server/personal-class-access'

export async function GET(request: Request) {
  const access = await requirePersonalCoach(request)
  if (access.response) return access.response
  try {
    const snapshot = await adminDb
      .collection('coachStandaloneSessions')
      .where('coachId', '==', access.uid)
      .get()
    const items = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        training: normalizeClassTraining(doc.data().training || []) || [],
        updatedAt: doc.data().updatedAt || 0,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'No pudimos cargar tus sesiones.' }, { status: 500 })
  }
}

async function save(request: Request, editing: boolean) {
  const access = await requirePersonalCoach(request)
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const training = normalizeClassTraining(body?.training)
  if (
    !title ||
    title.length > 100 ||
    !training ||
    (editing && (typeof body?.id !== 'string' || !/^[\w-]{1,128}$/.test(body.id)))
  )
    return NextResponse.json(
      { error: 'Revisa el nombre y el entreno de la sesión.' },
      { status: 400 }
    )
  try {
    const collection = adminDb.collection('coachStandaloneSessions')
    const ref = editing ? collection.doc(body.id) : collection.doc()
    if (editing) {
      const existing = await ref.get()
      if (!existing.exists || existing.data()?.coachId !== access.uid)
        return NextResponse.json({ error: 'No encontramos esta sesión.' }, { status: 404 })
    }
    const updatedAt = Date.now()
    await ref.set(
      {
        coachId: access.uid,
        title,
        training,
        updatedAt,
        ...(!editing ? { createdAt: updatedAt } : {}),
      },
      { merge: true }
    )
    return NextResponse.json({ item: { id: ref.id, title, training, updatedAt } })
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
