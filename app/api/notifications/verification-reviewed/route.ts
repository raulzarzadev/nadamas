import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { sendVerificationReviewedEmail } from '@/lib/server/emails'

export const runtime = 'nodejs'

async function getCaller(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!token) return null
  return adminAuth.verifyIdToken(token)
}

export async function POST(request: Request) {
  const caller = await getCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const callerDoc = await adminDb.collection('users').doc(caller.uid).get()
  if (callerDoc.data()?.roles?.admin !== true) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const body = (await request.json()) as {
    coachId?: string
    status?: 'verified' | 'rejected'
  }
  if (!body.coachId || !body.status) {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 })
  }

  const coachUser = await adminDb.collection('users').doc(body.coachId).get()
  const email = coachUser.data()?.email
  if (typeof email === 'string') {
    await sendVerificationReviewedEmail({ email, status: body.status })
  }

  return NextResponse.json({ ok: true })
}
