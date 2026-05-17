import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashOtp(email: string, code: string) {
  const secret = process.env.OTP_SECRET
  if (!secret) throw new Error('Missing OTP_SECRET')
  return createHash('sha256').update(`${email}:${code}:${secret}`).digest('hex')
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; code?: string }
  const email = normalizeEmail(body.email || '')
  const code = (body.code || '').trim()
  const ref = adminDb.collection('otpLoginCodes').doc(email)
  const snap = await ref.get()
  const otp = snap.data()

  if (
    !otp ||
    otp.expiresAt < Date.now() ||
    otp.attempts >= 5 ||
    otp.codeHash !== hashOtp(email, code)
  ) {
    if (otp) await ref.update({ attempts: (otp.attempts || 0) + 1 })
    return NextResponse.json(
      { error: 'Código inválido o vencido.' },
      { status: 400 }
    )
  }

  let user
  try {
    user = await adminAuth.getUserByEmail(email)
  } catch {
    user = await adminAuth.createUser({ email, emailVerified: true })
  }

  const userRef = adminDb.collection('users').doc(user.uid)
  const userDoc = await userRef.get()
  await userRef.set(
    userDoc.exists
      ? {
          id: user.uid,
          email,
          updatedAt: Date.now(),
        }
      : {
          id: user.uid,
          email,
          roles: { athlete: true, coach: false, admin: false },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
    { merge: true }
  )
  await ref.delete()

  const customToken = await adminAuth.createCustomToken(user.uid)
  return NextResponse.json({ ok: true, customToken })
}
