import { createHash, randomInt } from 'node:crypto'
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebase-admin'
import { sendOtpEmail } from '@/lib/server/emails'

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
  const body = (await request.json()) as { email?: string }
  const email = normalizeEmail(body.email || '')

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 })
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await adminDb.collection('otpLoginCodes').doc(email).set({
    email,
    codeHash: hashOtp(email, code),
    attempts: 0,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  })

  await sendOtpEmail(email, code)
  return NextResponse.json({ ok: true })
}
