import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import {
  subscriptionErrorResponse,
  subscriptionSchoolAccess,
} from '@/lib/server/subscriptions/access'
import {
  changeCardRenewal,
  createCardCheckout,
  createCardPortal,
} from '@/lib/server/subscriptions/card'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (typeof body.schoolId !== 'string' || !body.schoolId || body.schoolId.includes('/'))
      return NextResponse.json({ error: 'Selecciona una escuela válida.' }, { status: 400 })
    const caller = await subscriptionSchoolAccess(request, body.schoolId, true)
    if (body.action === 'portal')
      return NextResponse.json({ url: await createCardPortal(body.schoolId) })
    if (body.action === 'checkout')
      return NextResponse.json({ url: await createCardCheckout(body.schoolId, caller.uid) })
    if (body.action === 'cancel' || body.action === 'resume') {
      await changeCardRenewal(body.schoolId, body.action === 'cancel', caller.uid)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Selecciona una acción válida.' }, { status: 400 })
  } catch (error) {
    const known = subscriptionErrorResponse(error)
    if (known) return known
    reportServerError('SUBSCRIPTION_CARD', error, request)
    return NextResponse.json(
      { error: 'No pudimos preparar el pago. Inténtalo de nuevo más tarde.' },
      { status: 500 }
    )
  }
}
