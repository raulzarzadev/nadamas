import 'server-only'

import type { AppNotification } from '@/lib/notification'
import { adminDb } from './firebase-admin'

interface StoredPushSubscription {
  uid: string
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

interface WebPushModule {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
  sendNotification: (
    subscription: {
      endpoint: string
      expirationTime?: number | null
      keys: { p256dh: string; auth: string }
    },
    payload: string
  ) => Promise<unknown>
}

function getPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:hola@nadamas.app'
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey, subject }
}

async function loadWebPush(): Promise<WebPushModule | null> {
  try {
    const load = new Function('specifier', 'return import(specifier)')
    const mod = (await load('web-push')) as { default?: WebPushModule } & WebPushModule
    return mod.default || mod
  } catch {
    return null
  }
}

export async function sendPushNotificationToUser(
  uid: string,
  notification: Pick<AppNotification, 'title' | 'body' | 'link' | 'type' | 'data'>
) {
  if (!uid || uid.startsWith('manual')) return

  const config = getPushConfig()
  if (!config) return

  const webPush = await loadWebPush()
  if (!webPush) return

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

  const snapshot = await adminDb.collection('pushSubscriptions').where('uid', '==', uid).get()
  if (snapshot.empty) return

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    link: notification.link,
    type: notification.type,
    data: notification.data || {},
    icon: '/icons/icon_x192.png',
    badge: '/icons/icon_x72.png',
  })

  await Promise.all(
    snapshot.docs.map(async (doc) => {
      const subscription = doc.data() as StoredPushSubscription
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? null,
            keys: subscription.keys,
          },
          payload
        )
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error && 'statusCode' in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : 0
        if (statusCode === 404 || statusCode === 410) await doc.ref.delete()
      }
    })
  )
}
