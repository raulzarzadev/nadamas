import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { normalizeMarketingEmail, validMarketingEmail } from '@/lib/marketing'
import { adminDb } from '@/lib/server/firebase-admin'
import { emailKey, marketingCaller, recipient } from '@/lib/server/marketing/store'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  const caller = await marketingCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  try {
    return NextResponse.json(await recipient(caller.uid), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    reportServerError('MARKETING_PREFERENCES', error, request)
    return NextResponse.json({ error: 'No pudimos cargar tu preferencia.' }, { status: 500 })
  }
}
export async function PATCH(request: Request) {
  const caller = await marketingCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (typeof body?.subscribed !== 'boolean')
    return NextResponse.json({ error: 'Selecciona una preferencia.' }, { status: 400 })
  const email = normalizeMarketingEmail(caller.email)
  if (!validMarketingEmail(email) || (body.subscribed && !caller.email_verified))
    return NextResponse.json({ error: 'Verifica tu correo antes de suscribirte.' }, { status: 400 })
  try {
    const user = (await adminDb.collection('users').doc(caller.uid).get()).data()
    if (normalizeMarketingEmail(user?.email) !== email)
      return NextResponse.json(
        { error: 'Actualiza tu correo de perfil antes de continuar.' },
        { status: 400 }
      )
    const batch = adminDb.batch()
    batch.set(adminDb.collection('marketingPreferences').doc(caller.uid), {
      email,
      status: body.subscribed ? 'subscribed' : 'unsubscribed',
      source: 'profile',
      updatedAt: Date.now(),
      consentVersion: '2026-10-16',
    })
    batch.set(adminDb.collection('marketingSuppressions').doc(emailKey(email)), {
      unsubscribed: !body.subscribed,
      source: 'profile',
      updatedAt: Date.now(),
    })
    await batch.commit()
    return NextResponse.json({ ok: true })
  } catch (error) {
    reportServerError('MARKETING_PREFERENCES_SAVE', error, request)
    return NextResponse.json({ error: 'No pudimos guardar tu preferencia.' }, { status: 500 })
  }
}
