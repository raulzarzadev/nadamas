import { randomBytes, randomInt } from 'node:crypto'
import { NextResponse } from 'next/server'
import { type BookingInput, validateSelections } from '@/lib/server/bookings'
import { sendOtpEmail } from '@/lib/server/emails'
import { adminDb } from '@/lib/server/firebase-admin'
import { hashOtp, normalizeEmail } from '@/lib/server/otp-login'

export const runtime = 'nodejs'

const MAX_PENDING_SELECTIONS = 10

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://nadamas.app'
}

type PendingBooking = {
  selections?: BookingInput[]
  athleteName?: string
}

function sanitizePendingBooking(pendingBooking?: PendingBooking) {
  const selections = pendingBooking?.selections
  const athleteName = pendingBooking?.athleteName?.trim()
  if (
    !selections ||
    !Array.isArray(selections) ||
    selections.length === 0 ||
    selections.length > MAX_PENDING_SELECTIONS ||
    !validateSelections(selections) ||
    !athleteName
  ) {
    return null
  }
  return { selections, athleteName }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; pendingBooking?: PendingBooking }
  const email = normalizeEmail(body.email || '')

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 })
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const linkToken = randomBytes(32).toString('hex')
  const now = Date.now()
  const isEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)
  await adminDb
    .collection('otpLoginCodes')
    .doc(email)
    .set({
      email,
      codeHash: hashOtp(email, code),
      attempts: 0,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000,
      linkTokenHash: hashOtp(email, linkToken),
      linkAttempts: 0,
      linkExpiresAt: now + 15 * 60 * 1000,
      pendingBooking: sanitizePendingBooking(body.pendingBooking),
      ...(isEmulator ? { devCode: code, devLinkToken: linkToken } : {}),
    })

  const link = `${siteUrl()}/auth/link?email=${encodeURIComponent(email)}&token=${linkToken}`
  await sendOtpEmail(email, code, link)
  return NextResponse.json({ ok: true })
}
