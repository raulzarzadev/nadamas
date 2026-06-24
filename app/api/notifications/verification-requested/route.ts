import { NextResponse } from 'next/server'
import { publicNameFromUser } from '@/lib/public-name'
import { sendVerificationRequestedEmails } from '@/lib/server/emails'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { notifyVerificationRequested } from '@/lib/server/notifications'

export const runtime = 'nodejs'

async function getCaller(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return null
  return adminAuth.verifyIdToken(token)
}

export async function POST(request: Request) {
  const caller = await getCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const admins = await adminDb.collection('users').where('roles.admin', '==', true).get()
  const adminEmails = admins.docs
    .map((doc) => doc.data().email)
    .filter((email): email is string => typeof email === 'string')

  await sendVerificationRequestedEmails({
    adminEmails,
    coachEmail: caller.email,
  })

  try {
    const coachDoc = await adminDb.collection('users').doc(caller.uid).get()
    const coachName = publicNameFromUser(coachDoc.data())
    await Promise.all(
      admins.docs.map((doc) =>
        notifyVerificationRequested({ adminId: doc.id, coachId: caller.uid, coachName })
      )
    )
  } catch (error) {
    console.error('[VERIFICATION_REQUESTED_NOTIFY_INAPP]', error)
  }

  return NextResponse.json({ ok: true })
}
