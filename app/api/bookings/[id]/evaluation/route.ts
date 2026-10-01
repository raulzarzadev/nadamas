import { NextResponse } from 'next/server'
import { parseClassEvaluation } from '@/lib/class-evaluation'
import { saveClassEvaluation } from '@/lib/server/class-evaluations'
import { adminAuth } from '@/lib/server/firebase-admin'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  let uid: string
  try {
    uid = (await adminAuth.verifyIdToken(token)).uid
  } catch {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }
  let evaluation: ReturnType<typeof parseClassEvaluation>
  try {
    evaluation = parseClassEvaluation(await request.json())
  } catch {
    evaluation = null
  }
  if (!evaluation)
    return NextResponse.json(
      { error: 'Selecciona de 1 a 5 estrellas y al menos un tema.' },
      { status: 400 }
    )
  try {
    const { id } = await params
    const status = await saveClassEvaluation(id, uid, evaluation)
    if (status !== 200)
      return NextResponse.json({ error: 'Esta clase no está disponible para evaluar.' }, { status })
    return NextResponse.json({ ok: true, evaluation })
  } catch (error) {
    console.error('[CLASS_EVALUATION_SAVE]', error)
    return NextResponse.json(
      { error: 'No pudimos guardar la evaluación. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
