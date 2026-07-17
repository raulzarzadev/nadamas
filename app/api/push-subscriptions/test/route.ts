import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

export async function POST(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const caller = await adminAuth.verifyIdToken(token)
  const subscriptions = await adminDb
    .collection('pushSubscriptions')
    .where('uid', '==', caller.uid)
    .limit(1)
    .get()

  if (subscriptions.empty) {
    return NextResponse.json(
      { error: 'No hay un dispositivo suscrito para recibir push.' },
      { status: 409 }
    )
  }

  const notification = await createNotification({
    recipientId: caller.uid,
    actorId: caller.uid,
    actorName: null,
    type: 'push_test',
    title: 'Prueba de notificación',
    body: 'Si esta alerta llegó fuera de Nadamas, tus avisos push están funcionando.',
    link: '/notifications',
  })

  const pushResult = notification?.pushResult
  if (!pushResult || pushResult.status !== 'sent') {
    return NextResponse.json(
      { error: 'No se pudo enviar la notificación push.', pushResult },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true, pushResult })
}
