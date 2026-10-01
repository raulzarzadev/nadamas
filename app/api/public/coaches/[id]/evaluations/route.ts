import { NextResponse } from 'next/server'
import { getPublicClassEvaluations } from '@/lib/server/class-evaluations'
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    return NextResponse.json({ evaluations: await getPublicClassEvaluations(id) })
  } catch (error) {
    console.error('[PUBLIC_EVALUATIONS]', error)
    return NextResponse.json({ error: 'No pudimos cargar las evaluaciones.' }, { status: 500 })
  }
}
