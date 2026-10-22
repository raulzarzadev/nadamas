import { NextResponse } from 'next/server'
import { getSchoolCaller } from '@/lib/server/school-access'
import { removeSubscriber } from '@/lib/server/training-plan-sharing'
export const runtime = 'nodejs'
type Props = { params: Promise<{ id: string; uid: string }> }
export async function DELETE(request: Request, { params }: Props) {
  try {
    const caller = await getSchoolCaller(request)
    if (!caller)
      return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 })
    const { id, uid } = await params
    await removeSubscriber(id, caller.uid, uid)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const forbidden = error instanceof Error && error.message === 'FORBIDDEN'
    if (!forbidden) console.error('[TRAINING_PLAN_REMOVE_SUBSCRIBER]', error)
    return NextResponse.json(
      { error: 'No pudimos quitar a este suscriptor. Inténtalo de nuevo más tarde.' },
      { status: forbidden ? 403 : 500 }
    )
  }
}
