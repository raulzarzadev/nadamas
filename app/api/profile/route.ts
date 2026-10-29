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
    athleteBio?: string
    birthDate?: string
  }

  const nickname = body.nickname?.trim()
  const firstName = body.firstName?.trim()
  const lastName = body.lastName?.trim()

  // YYYY-MM-DD, a real calendar day, not in the future; '' clears it.
  const birthDate = body.birthDate?.trim()
  if (
    birthDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
      new Date(`${birthDate}T12:00:00Z`).toISOString().slice(0, 10) !== birthDate ||
      birthDate > new Date().toISOString().slice(0, 10) ||
      birthDate < '1900-01-01')
  ) {
    return NextResponse.json({ error: 'Elige una fecha de nacimiento válida.' }, { status: 400 })
  }

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
        ...(body.birthDate !== undefined ? { birthDate: birthDate || null } : {}),
        ...(body.athleteBio !== undefined
          ? { athleteBio: body.athleteBio.trim().slice(0, 280) }
          : {}),
        updatedAt: Date.now(),
      },
      { merge: true }
    )

  return NextResponse.json({ ok: true })
}
