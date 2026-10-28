import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { handleStripeEvent } from '@/lib/server/subscriptions/card'
import { verifyStripeEvent } from '@/lib/server/subscriptions/stripe-client'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    return NextResponse.json({ error: 'No disponible.' }, { status: 503 })
  const body = await request.text()
  let event: ReturnType<typeof verifyStripeEvent>
  try {
    event = verifyStripeEvent(
      body,
      request.headers.get('stripe-signature') || '',
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 })
  }
  try {
    await handleStripeEvent(event)
    return NextResponse.json({ received: true })
  } catch (error) {
    reportServerError('SUBSCRIPTION_WEBHOOK', error, request)
    return NextResponse.json({ error: 'No pudimos procesar el pago.' }, { status: 500 })
  }
}
