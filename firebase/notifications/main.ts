import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { FirebaseCRUD } from '@/firebase/FirebaseCRUD'
import { db } from '@/firebase/index'
import type { AppNotification } from '@/lib/notification'

type NotificationsCallback = (notifications: AppNotification[]) => void

// Single-field equality queries (no orderBy) so no composite index is needed;
// sorting happens client-side. Returns the Firestore unsubscribe.
function listenBy(field: 'recipientId' | 'actorId', uid: string, cb: NotificationsCallback) {
  const q = query(collection(db, 'notifications'), where(field, '==', uid))
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs
      .map((doc) => FirebaseCRUD.normalizeDoc(doc) as AppNotification)
      .sort((a, b) => b.createdAt - a.createdAt)
    cb(items)
  })
}

export const NotificationCRUD = {
  /** Notifications addressed to the user (drives the bell + unread count). */
  listenReceived: (uid: string, cb: NotificationsCallback) => listenBy('recipientId', uid, cb),
  /** Notifications the user caused (the "Enviadas" tab). */
  listenSent: (uid: string, cb: NotificationsCallback) => listenBy('actorId', uid, cb),
}
