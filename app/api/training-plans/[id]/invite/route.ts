import { NextResponse } from 'next/server'
import { getSchoolCaller } from '@/lib/server/school-access'
import { createInvite } from '@/lib/server/training-plan-sharing'
export const runtime = 'nodejs'
type Props = { params: Promise<{ id: string }> }
export async function POST(request: Request, { params }: Props) {
  try {
    const caller = await getSchoolCaller(request)
    if (!caller)
      return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 })
    const body = (await request.json().catch(() => null)) as { regenerate?: unknown } | null
    const token = await createInvite((await params).id, caller.uid, body?.regenerate === true)
    return NextResponse.json({ token }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const forbidden = error instanceof Error && error.message === 'FORBIDDEN'
    if (!forbidden) console.error('[TRAINING_PLAN_INVITE]', error)
    return NextResponse.json(
      { error: 'No pudimos generar el enlace. Inténtalo de nuevo más tarde.' },
      { status: forbidden ? 403 : 500 }
    )
  }
}
