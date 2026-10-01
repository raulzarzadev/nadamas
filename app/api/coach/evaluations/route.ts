import { NextResponse } from 'next/server'
import { getClassEvaluations } from '@/lib/server/class-evaluations'
import { adminAuth } from '@/lib/server/firebase-admin'
export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  let uid: string
  try {
    uid = (await adminAuth.verifyIdToken(token)).uid
  } catch {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }
  try {
    return NextResponse.json({ evaluations: await getClassEvaluations('coachId', uid) })
  } catch (error) {
    console.error('[COACH_EVALUATIONS]', error)
    return NextResponse.json({ error: 'No pudimos cargar las evaluaciones.' }, { status: 500 })
  }
}
