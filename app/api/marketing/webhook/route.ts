import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { normalizeMarketingEmail, validMarketingEmail } from '@/lib/marketing'
import { suppressEmail } from '@/lib/server/marketing/store'
export async function POST(request: Request) {
  const secret = process.env.BREVO_MARKETING_WEBHOOK_SECRET
  const received = request.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`
  if (
    !secret ||
    Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  )
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const email = normalizeMarketingEmail(body?.email)
  if (!validMarketingEmail(email))
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  try {
    if (
      ['unsubscribed', 'unsubscribe', 'spam', 'hard_bounce', 'hardBounce', 'blocked'].includes(
        body?.event
      )
    )
      await suppressEmail(email, 'brevo_webhook')
    return NextResponse.json({ ok: true })
  } catch (error) {
    reportServerError('MARKETING_WEBHOOK', error, request)
    return NextResponse.json({ error: 'No pudimos procesar el evento.' }, { status: 500 })
  }
}
