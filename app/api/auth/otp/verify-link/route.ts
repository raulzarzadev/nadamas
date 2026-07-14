import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import {
  completePendingBooking,
  hashOtp,
  normalizeEmail,
  signInOrCreateUser,
} from '@/lib/server/otp-login'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; token?: string }
  const email = normalizeEmail(body.email || '')
  const token = (body.token || '').trim()

  if (!email || !token) {
    return NextResponse.json({ error: 'Enlace inválido o vencido.' }, { status: 400 })
  }

  const ref = adminDb.collection('otpLoginCodes').doc(email)
  const snap = await ref.get()
  const otp = snap.data()

  if (
    !otp ||
    !otp.linkTokenHash ||
    otp.linkExpiresAt < Date.now() ||
    otp.linkAttempts >= 5 ||
    otp.linkTokenHash !== hashOtp(email, token)
  ) {
    if (otp) await ref.update({ linkAttempts: (otp.linkAttempts || 0) + 1 })
    return NextResponse.json({ error: 'Enlace inválido o vencido.' }, { status: 400 })
  }

  const { uid } = await signInOrCreateUser(email)
  const bookingCompleted = await completePendingBooking(uid, email, otp.pendingBooking)
  await ref.delete()

  const customToken = await adminAuth.createCustomToken(uid)
  return NextResponse.json({ ok: true, customToken, bookingCompleted })
}
