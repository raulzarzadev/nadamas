import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

/**
 * Mark notifications read. Body: `{ all: true }` clears every unread for the
 * caller, or `{ ids: string[] }` for specific ones. Only the recipient can mark
 * their own notifications.
 */
export async function POST(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const caller = await adminAuth.verifyIdToken(token)
  const body = (await request.json().catch(() => ({}))) as { all?: boolean; ids?: string[] }
  const now = Date.now()
  const collection = adminDb.collection('notifications')

  if (body.all) {
    const snapshot = await collection
      .where('recipientId', '==', caller.uid)
      .where('readAt', '==', null)
      .get()
    if (snapshot.empty) return NextResponse.json({ ok: true, updated: 0 })
    const batch = adminDb.batch()
    for (const doc of snapshot.docs) batch.set(doc.ref, { readAt: now }, { merge: true })
    await batch.commit()
    return NextResponse.json({ ok: true, updated: snapshot.size })
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string') : []
  if (!ids.length) return NextResponse.json({ ok: true, updated: 0 })

  const docs = await Promise.all(ids.map((id) => collection.doc(id).get()))
  const batch = adminDb.batch()
  let updated = 0
  for (const doc of docs) {
    if (doc.exists && doc.data()?.recipientId === caller.uid) {
      batch.set(doc.ref, { readAt: now }, { merge: true })
      updated += 1
    }
  }
  if (updated) await batch.commit()
  return NextResponse.json({ ok: true, updated })
}
