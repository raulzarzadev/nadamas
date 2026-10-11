import { NextResponse } from 'next/server'
import { normalizeClassTraining } from '@/lib/class-training'
import { adminDb } from '@/lib/server/firebase-admin'
import { requirePersonalCoach } from '@/lib/server/personal-class-access'

async function authorize(request: Request) {
  const access = await requirePersonalCoach(request)
  if (access.response) return { response: access.response }
  const query = new URL(request.url).searchParams
  const date = query.get('date') || '',
    time = query.get('time') || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    return {
      response: NextResponse.json({ error: 'Revisa los datos de la clase.' }, { status: 400 }),
    }
  return {
    ref: adminDb
      .collection('coachClassNotes')
      .doc(encodeURIComponent(`${access.uid}|${date}|${time}`)),
    coachId: access.uid,
    date,
    startTime: time,
    userId: access.uid,
  }
}

export async function GET(request: Request) {
  const access = await authorize(request)
  if (access.response) return access.response
  try {
    const snapshot = await access.ref.get()
    return NextResponse.json(
      {
        note: snapshot.data()?.note || '',
        training: normalizeClassTraining(snapshot.data()?.training || []) || [],
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json({ error: 'No pudimos cargar las notas de la clase.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const access = await authorize(request)
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
  if (typeof body?.note !== 'string' || body.note.length > 4000)
    return NextResponse.json(
      { error: 'La nota puede tener hasta 4000 caracteres.' },
      { status: 400 }
    )
  const training = body.training === undefined ? undefined : normalizeClassTraining(body.training)
  if (training === null)
    return NextResponse.json(
      { error: 'Revisa las series y las repeticiones del entrenamiento.' },
      { status: 400 }
    )
  try {
    await access.ref.set(
      {
        coachId: access.coachId,
        date: access.date,
        startTime: access.startTime,
        note: body.note.trim(),
        ...(training !== undefined ? { training } : {}),
        updatedAt: Date.now(),
        updatedBy: access.userId,
      },
      { merge: true }
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'No pudimos guardar las notas de la clase.' },
      { status: 500 }
    )
  }
}
