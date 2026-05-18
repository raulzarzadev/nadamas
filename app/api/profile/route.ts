import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

export async function PATCH(request: Request) {
  const token = getBearerToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }

  const caller = await adminAuth.verifyIdToken(token)
  const body = (await request.json()) as {
    nickname?: string
    firstName?: string
    lastName?: string
  }

  const nickname = body.nickname?.trim()
  const firstName = body.firstName?.trim()
  const lastName = body.lastName?.trim()

  if (!nickname) {
    return NextResponse.json(
      { error: 'El nombre visible (nickname) es obligatorio.' },
      { status: 400 }
    )
  }

  await adminDb
    .collection('users')
    .doc(caller.uid)
    .set(
      {
        nickname,
        firstName: firstName || null,
        lastName: lastName || null,
        updatedAt: Date.now(),
      },
      { merge: true }
    )

  return NextResponse.json({ ok: true })
}
