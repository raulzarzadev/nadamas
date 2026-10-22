import { NextResponse } from 'next/server'
import { getSchoolCaller } from '@/lib/server/school-access'
import { listSubscribers } from '@/lib/server/training-plan-sharing'
export const runtime = 'nodejs'
type Props = { params: Promise<{ id: string }> }
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: Request, { params }: Props) {
  try {
    const caller = await getSchoolCaller(request)
    if (!caller)
      return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401, headers })
    const subscribers = await listSubscribers((await params).id, caller.uid)
    return NextResponse.json({ subscribers }, { headers })
  } catch (error) {
    const forbidden = error instanceof Error && error.message === 'FORBIDDEN'
    if (!forbidden) console.error('[TRAINING_PLAN_SUBSCRIBERS]', error)
    return NextResponse.json(
      { error: 'No pudimos cargar los suscriptores. Inténtalo de nuevo más tarde.' },
      { status: forbidden ? 403 : 500, headers }
    )
  }
}
