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

export interface PushSendResult {
  status: 'sent' | 'skipped' | 'failed'
  reason?:
    | 'missing_recipient'
    | 'manual_recipient'
    | 'missing_config'
    | 'missing_library'
    | 'no_subscriptions'
  sent: number
  failed: number
  removed: number
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
): Promise<PushSendResult> {
  if (!uid)
    return { status: 'skipped', reason: 'missing_recipient', sent: 0, failed: 0, removed: 0 }
  if (uid.startsWith('manual')) {
    return { status: 'skipped', reason: 'manual_recipient', sent: 0, failed: 0, removed: 0 }
  }

  const config = getPushConfig()
  if (!config)
    return { status: 'skipped', reason: 'missing_config', sent: 0, failed: 0, removed: 0 }

  const webPush = await loadWebPush()
  if (!webPush) {
    return { status: 'skipped', reason: 'missing_library', sent: 0, failed: 0, removed: 0 }
  }

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

  const snapshot = await adminDb.collection('pushSubscriptions').where('uid', '==', uid).get()
  if (snapshot.empty) {
    return { status: 'skipped', reason: 'no_subscriptions', sent: 0, failed: 0, removed: 0 }
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    link: notification.link,
    type: notification.type,
    data: notification.data || {},
    icon: '/icons/icon_x192.png',
    badge: '/icons/icon_x72.png',
  })

  const results = await Promise.all(
    snapshot.docs.map(async (doc): Promise<'sent' | 'failed' | 'removed'> => {
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
        return 'sent'
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error && 'statusCode' in error
            ? Number((error as { statusCode?: unknown }).statusCode)
            : 0
        if (statusCode === 404 || statusCode === 410) {
          await doc.ref.delete()
          return 'removed'
        }
        console.error('[WEB_PUSH_SEND_DEVICE]', error)
        return 'failed'
      }
    })
  )

  const sent = results.filter((result) => result === 'sent').length
  const failed = results.filter((result) => result === 'failed').length
  const removed = results.filter((result) => result === 'removed').length
  return { status: sent > 0 ? 'sent' : 'failed', sent, failed, removed }
}
