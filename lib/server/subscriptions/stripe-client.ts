import { createHmac, timingSafeEqual } from 'node:crypto'

export interface StripeObject {
  id: string
  [key: string]: unknown
}
export function stripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.SUBSCRIPTION_APP_URL
  )
}
export async function stripeRequest<T>(
  path: string,
  params?: URLSearchParams,
  key?: string
): Promise<T> {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_UNCONFIGURED')
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': '2025-03-31.basil',
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    body: params?.toString(),
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`STRIPE_HTTP_${response.status}`)
  return response.json() as Promise<T>
}
export function verifyStripeEvent(
  body: string,
  signature: string,
  secret: string,
  now = Date.now()
): StripeObject {
  const parts = signature.split(',').map((part) => part.split('='))
  const timestamp = parts.find(([key]) => key === 't')?.[1] || ''
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300)
    throw new Error('STRIPE_SIGNATURE')
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest()
  const valid = parts.some(([key, value]) => {
    if (key !== 'v1' || !/^[a-f0-9]{64}$/i.test(value || '')) return false
    return timingSafeEqual(expected, Buffer.from(value, 'hex'))
  })
  if (!valid) throw new Error('STRIPE_SIGNATURE')
  const event = JSON.parse(body)
  if (!event.id || typeof event.type !== 'string' || !event.data?.object)
    throw new Error('STRIPE_EVENT')
  return event
}
