'use client'

import NotificationItem from '@comps/notifications/NotificationItem'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { NotificationCRUD } from '@/firebase/notifications/main'
import { postAuthed } from '@/lib/client/authed-api'
import type { AppNotification } from '@/lib/notification'

type Tab = 'received' | 'sent'

export default function NotificationsList() {
  const { user } = useUser() as { user: { uid?: string; id?: string } | null | undefined }
  const uid = user?.uid || user?.id
  const [tab, setTab] = useState<Tab>('received')
  const [received, setReceived] = useState<AppNotification[]>([])
  const [sent, setSent] = useState<AppNotification[]>([])

  useEffect(() => {
    if (!uid) return
    const unsubReceived = NotificationCRUD.listenReceived(uid, setReceived)
    const unsubSent = NotificationCRUD.listenSent(uid, setSent)
    return () => {
      unsubReceived()
      unsubSent()
    }
  }, [uid])

  const unreadCount = received.reduce((count, item) => count + (item.readAt ? 0 : 1), 0)
  const markAllRead = () => {
    postAuthed('/api/notifications/read', { all: true }).catch(() => {})
  }

  const items = tab === 'received' ? received : sent

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-[var(--c-border)] bg-white p-1">
          {(['received', 'sent'] as Tab[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                tab === value
                  ? 'bg-[var(--c-ocean)] text-white'
                  : 'text-[var(--c-text-2)] hover:text-[var(--c-ocean)]'
              }`}
            >
              {value === 'received' ? 'Recibidas' : 'Enviadas'}
            </button>
          ))}
        </div>
        {tab === 'received' && unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="shrink-0 text-sm font-semibold text-[var(--c-aqua-strong)] hover:underline"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white">
        {items.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-[var(--c-text-2)]">
            {tab === 'received'
              ? 'No tienes notificaciones recibidas.'
              : 'No has generado notificaciones.'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--c-border)]">
            {items.map((notification) => (
              <li key={notification.id}>
                <NotificationItem notification={notification} showActor={tab === 'sent'} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
