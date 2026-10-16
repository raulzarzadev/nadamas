import { randomBytes, randomInt } from 'node:crypto'
import { NextResponse } from 'next/server'
import { authLinkOrigin } from '@/lib/firebase-auth-domain'
import { type BookingInput, validateSelections } from '@/lib/server/bookings'
import { sendOtpEmail } from '@/lib/server/emails'
import { adminDb } from '@/lib/server/firebase-admin'
import { hashOtp, normalizeEmail } from '@/lib/server/otp-login'

export const runtime = 'nodejs'

const MAX_PENDING_SELECTIONS = 10

function siteUrl(request: Request) {
  return authLinkOrigin(
    request.url,
    process.env.NEXT_PUBLIC_SITE_URL || 'https://nadamas.app',
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAINS
  )
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
  const body = (await request.json()) as {
    email?: string
    pendingBooking?: PendingBooking
    redirectTo?: string
  }
  const email = normalizeEmail(body.email || '')

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 })
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const linkToken = randomBytes(32).toString('hex')
  const now = Date.now()
  const isEmulator =
    process.env.NODE_ENV !== 'production' &&
    Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST)
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

  const link = `${siteUrl(request)}/auth/link?email=${encodeURIComponent(email)}&token=${linkToken}`
  const redirectTo = body.redirectTo
  const invitationPath =
    typeof redirectTo === 'string' &&
    /^\/athlete\/profile-invitations\/(?:[A-Za-z0-9_-]{43}|[a-f0-9]{64})$/.test(redirectTo)
      ? redirectTo
      : null
  await sendOtpEmail(
    email,
    code,
    invitationPath ? `${link}&redirectTo=${encodeURIComponent(invitationPath)}` : link
  )
  return NextResponse.json({ ok: true, ...(isEmulator ? { devCode: code } : {}) })
}
