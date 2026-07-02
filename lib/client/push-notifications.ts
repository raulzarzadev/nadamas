import { deleteAuthed, postAuthed } from '@/lib/client/authed-api'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function canUsePushNotifications() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  )
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function getPushSubscription() {
  if (!canUsePushNotifications()) return null
  const registration = await navigator.serviceWorker.register('/sw.js')
  return registration.pushManager.getSubscription()
}

export async function subscribeToPushNotifications() {
  if (!canUsePushNotifications() || !VAPID_PUBLIC_KEY) {
    throw new Error('push_not_supported')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('push_permission_denied')

  const registration = await navigator.serviceWorker.register('/sw.js')
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  await postAuthed('/api/push-subscriptions', subscription.toJSON())
  return subscription
}

export async function unsubscribeFromPushNotifications() {
  const subscription = await getPushSubscription()
  if (!subscription) return
  await deleteAuthed(
    `/api/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`
  )
  await subscription.unsubscribe()
}
