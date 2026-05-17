import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { sendVerificationRequestedEmails } from '@/lib/server/emails'

export const runtime = 'nodejs'

async function getCaller(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return null
  return adminAuth.verifyIdToken(token)
}

export async function POST(request: Request) {
  const caller = await getCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const admins = await adminDb
    .collection('users')
    .where('roles.admin', '==', true)
    .get()
  const adminEmails = admins.docs
    .map((doc) => doc.data().email)
    .filter((email): email is string => typeof email === 'string')

  await sendVerificationRequestedEmails({
    adminEmails,
    coachEmail: caller.email,
  })

  return NextResponse.json({ ok: true })
}
