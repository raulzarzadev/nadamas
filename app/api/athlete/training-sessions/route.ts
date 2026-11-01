import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { normalizeClassTraining } from '@/lib/class-training'
import { publicNameFromUser } from '@/lib/public-name'
import { requireAthleteTrainingAccess } from '@/lib/server/athlete-training-access'
import { adminDb } from '@/lib/server/firebase-admin'

export async function GET(request: Request) {
  const access = await requireAthleteTrainingAccess(request)
  if (access.response) return access.response
  try {
    const snapshot = await adminDb
      .collection('athleteTrainingSessions')
      .where('athleteId', '==', access.uid)
      .get()
    const items = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title,
          description: typeof data.description === 'string' ? data.description : '',
          training: normalizeClassTraining(data.training || []) || [],
          visibility: 'public',
          updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
        }
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (cause) {
    reportServerError('ATHLETE_TRAINING_SESSIONS_LOAD', cause, request)
    return NextResponse.json({ error: 'No pudimos cargar tus sesiones.' }, { status: 500 })
  }
}

async function save(request: Request, editing: boolean) {
  const access = await requireAthleteTrainingAccess(request)
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const training = normalizeClassTraining(body?.training)
  const requestedVisibility = body?.visibility
  const visibility = 'public'
  if (
    !title ||
    title.length > 100 ||
    description.length > 2000 ||
    (body?.description !== undefined && typeof body.description !== 'string') ||
    (requestedVisibility !== undefined &&
      requestedVisibility !== 'public' &&
      requestedVisibility !== 'private') ||
    !training ||
    (editing && (typeof body?.id !== 'string' || !/^[\w-]{1,128}$/.test(body.id)))
  )
    return NextResponse.json(
      { error: 'Revisa el nombre y el entreno de la sesión.' },
      { status: 400 }
    )
  try {
    const collection = adminDb.collection('athleteTrainingSessions')
    const ref = editing ? collection.doc(body.id) : collection.doc()
    if (editing) {
      const existing = await ref.get()
      const existingData = existing.data()
      if (!existing.exists || existingData?.athleteId !== access.uid)
        return NextResponse.json({ error: 'No encontramos esta sesión.' }, { status: 404 })
    }
    const updatedAt = Date.now()
    await ref.set(
      {
        athleteId: access.uid,
        title,
        description,
        training,
        visibility,
        authorName: publicNameFromUser(access.user, 'Atleta'),
        updatedAt,
        ...(!editing ? { createdAt: updatedAt } : {}),
      },
      { merge: true }
    )
    return NextResponse.json({
      item: {
        id: ref.id,
        title,
        description,
        training,
        visibility,
        updatedAt,
      },
    })
  } catch (cause) {
    reportServerError('ATHLETE_TRAINING_SESSION_SAVE', cause, request)
    return NextResponse.json({ error: 'No pudimos guardar la sesión.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return save(request, false)
}

export async function PATCH(request: Request) {
  return save(request, true)
}
