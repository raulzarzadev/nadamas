import { createHash } from 'node:crypto'
import { type BookingInput, createConfirmedBookings } from '@/lib/server/bookings'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function hashOtp(email: string, code: string) {
  const secret = process.env.OTP_SECRET
  if (!secret) throw new Error('Missing OTP_SECRET')
  return createHash('sha256').update(`${email}:${code}:${secret}`).digest('hex')
}

export async function signInOrCreateUser(email: string) {
  let user: Awaited<ReturnType<typeof adminAuth.getUserByEmail>>
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

  return { uid: user.uid }
}

export type StoredPendingBooking = {
  selections: BookingInput[]
  athleteName: string
}

export async function completePendingBooking(
  uid: string,
  email: string,
  pendingBooking: StoredPendingBooking | null | undefined
) {
  if (!pendingBooking?.selections?.length || !pendingBooking.athleteName) return false
  try {
    await createConfirmedBookings({
      uid,
      selections: pendingBooking.selections,
      profileName: pendingBooking.athleteName,
      callerEmail: email,
    })
    return true
  } catch (error) {
    console.error('[OTP_PENDING_BOOKING]', error)
    return false
  }
}
