import 'server-only'
import { adminDb } from '@/lib/server/firebase-admin'
import type { SchoolSubscription } from '@/lib/subscriptions/model'
import { subscriptionReminder } from '@/lib/subscriptions/reminders'

export async function sendSubscriptionReminders() {
  const now = Date.now()
  const snapshot = await adminDb.collection('schoolSubscriptions').get()
  let created = 0
  for (const doc of snapshot.docs) {
    const sub = doc.data() as SchoolSubscription
    const reminder = subscriptionReminder(sub, now)
    if (!reminder || !sub.ownerId) continue
    const school = await adminDb.collection('schools').doc(sub.schoolId).get()
    if (!school.exists) continue
    const ref = adminDb.collection('notifications').doc(`subscription-${reminder.id}`)
    const inserted = await adminDb.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return false
      const title =
        reminder.milestone === 0
          ? reminder.kind === 'trial'
            ? 'Terminó tu prueba de Nadamas'
            : 'Renueva tu suscripción de Nadamas'
          : reminder.kind === 'trial'
            ? 'Tu prueba de Nadamas está por terminar'
            : 'Tu suscripción de Nadamas está por vencer'
      tx.create(ref, {
        id: ref.id,
        recipientId: sub.ownerId,
        actorId: null,
        actorName: null,
        type: 'subscription_reminder',
        title,
        body: `${String(school.data()?.name || 'Tu escuela')}: ${reminder.milestone === 0 ? 'revisa tu suscripción para mantener todas las funciones.' : `quedan ${reminder.milestone} días o menos. Revisa la fecha exacta en Suscripción.`}`,
        link: `/school/subscription?schoolId=${encodeURIComponent(sub.schoolId)}`,
        createdAt: now,
        readAt: null,
      })
      return true
    })
    if (inserted) created++
  }
  return created
}
