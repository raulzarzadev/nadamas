import { NextResponse } from 'next/server'
import type { CoachClassOffering, CoachPublic } from '@/firebase/coaches/coach.model'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

export async function POST(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const caller = await adminAuth.verifyIdToken(token)
  const userDoc = await adminDb.collection('users').doc(caller.uid).get()
  if (userDoc.data()?.roles?.coach !== true && userDoc.data()?.roles?.admin !== true) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const body = (await request.json()) as { classOfferings?: CoachClassOffering[] }
  if (!Array.isArray(body.classOfferings)) {
    return NextResponse.json({ error: 'La configuración de clases es inválida.' }, { status: 400 })
  }

  const coachRef = adminDb.collection('coaches').doc(caller.uid)
  const coachDoc = await coachRef.get()
  const now = Date.now()
  const data: Partial<CoachPublic> = {
    classOfferings: body.classOfferings,
    userId: caller.uid,
    updatedAt: now,
  }
  if (!coachDoc.exists) data.createdAt = now

  await coachRef.set(data, { merge: true })
  return NextResponse.json({ ok: true })
}
