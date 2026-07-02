import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

interface PushSubscriptionPayload {
  endpoint?: string
  expirationTime?: number | null
  keys?: {
    p256dh?: string
    auth?: string
  }
}

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

function subscriptionId(uid: string, endpoint: string) {
  const hash = crypto.createHash('sha256').update(endpoint).digest('hex')
  return `${uid}_${hash}`
}

function validateSubscription(body: PushSubscriptionPayload) {
  return Boolean(body.endpoint && body.keys?.p256dh && body.keys?.auth)
}

export async function POST(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const caller = await adminAuth.verifyIdToken(token)
  const body = (await request.json().catch(() => ({}))) as PushSubscriptionPayload

  if (!validateSubscription(body)) {
    return NextResponse.json({ error: 'Suscripción inválida.' }, { status: 400 })
  }

  const now = Date.now()
  const ref = adminDb
    .collection('pushSubscriptions')
    .doc(subscriptionId(caller.uid, body.endpoint as string))
  await ref.set(
    {
      id: ref.id,
      uid: caller.uid,
      endpoint: body.endpoint,
      expirationTime: body.expirationTime ?? null,
      keys: body.keys,
      userAgent: request.headers.get('user-agent') || null,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true }
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const caller = await adminAuth.verifyIdToken(token)
  const endpoint = new URL(request.url).searchParams.get('endpoint')
  if (!endpoint) return NextResponse.json({ ok: true })

  await adminDb.collection('pushSubscriptions').doc(subscriptionId(caller.uid, endpoint)).delete()
  return NextResponse.json({ ok: true })
}
