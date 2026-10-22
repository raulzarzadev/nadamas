import { NextResponse } from 'next/server'
import { getSchoolCaller } from '@/lib/server/school-access'
import { subscribe, subscriberProfile, unsubscribe } from '@/lib/server/training-plan-sharing'
export const runtime = 'nodejs'
type Props = { params: Promise<{ id: string }> }
const unauthorized = () =>
  NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 })
export async function POST(request: Request, { params }: Props) {
  try {
    const caller = await getSchoolCaller(request)
    if (!caller) return unauthorized()
    const body = (await request.json().catch(() => ({}))) as { invite?: unknown }
    const invite = typeof body.invite === 'string' ? body.invite : undefined
    await subscribe((await params).id, caller.uid, await subscriberProfile(caller.uid), invite)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const status = code === 'SELF_SUBSCRIBE' ? 400 : code === 'FORBIDDEN' ? 403 : 500
    if (status === 500) console.error('[TRAINING_PLAN_SUBSCRIBE]', error)
    return NextResponse.json({ error: 'No pudimos suscribirte a este entreno.' }, { status })
  }
}
export async function DELETE(request: Request, { params }: Props) {
  try {
    const caller = await getSchoolCaller(request)
    if (!caller) return unauthorized()
    await unsubscribe((await params).id, caller.uid)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const forbidden = error instanceof Error && error.message === 'FORBIDDEN'
    if (!forbidden) console.error('[TRAINING_PLAN_UNSUBSCRIBE]', error)
    return NextResponse.json(
      { error: 'No pudimos cancelar tu suscripción. Inténtalo de nuevo más tarde.' },
      { status: forbidden ? 403 : 500 }
    )
  }
}
