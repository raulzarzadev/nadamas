'use client'

import NotificationItem from '@comps/notifications/NotificationItem'
import PushNotificationsControl from '@comps/notifications/PushNotificationsControl'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { FiBell } from 'react-icons/fi'
import { useUser } from '@/context/UserContext'
import { NotificationCRUD } from '@/firebase/notifications/main'
import { postAuthed } from '@/lib/client/authed-api'
import type { AppNotification } from '@/lib/notification'

const PREVIEW_COUNT = 8

export default function NotificationsBell() {
  const { user } = useUser() as { user: { uid?: string; id?: string } | null | undefined }
  const uid = user?.uid || user?.id
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!uid) {
      setItems([])
      return
    }
    const unsubscribe = NotificationCRUD.listenReceived(uid, setItems)
    return () => unsubscribe()
  }, [uid])

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    return () => document.removeEventListener('pointerdown', closeOnOutside)
  }, [open])

  if (!uid) return null

  const unreadCount = items.reduce((count, item) => count + (item.readAt ? 0 : 1), 0)

  const toggle = () => {
    setOpen((wasOpen) => {
      const next = !wasOpen
      // Mark everything read when the panel opens.
      if (next && unreadCount > 0) {
        postAuthed('/api/notifications/read', { all: true }).catch(() => {})
      }
      return next
    })
  }

  const preview = items.slice(0, PREVIEW_COUNT)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : 'Notificaciones'}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--c-border)] bg-white text-[var(--c-ocean)] transition-shadow hover:shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-aqua-strong)]"
      >
        <FiBell aria-hidden="true" className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between px-3 py-2.5">
            <p className="text-sm font-bold text-[var(--c-ocean)]">Notificaciones</p>
          </div>
          <div className="border-t border-[var(--c-border)] p-1">
            <PushNotificationsControl />
          </div>
          <div className="max-h-[60vh] overflow-y-auto border-t border-[var(--c-border)]">
            {preview.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-[var(--c-text-2)]">
                No tienes notificaciones.
              </p>
            ) : (
              preview.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onNavigate={() => setOpen(false)}
                />
              ))
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-[var(--c-border)] px-3 py-2.5 text-center text-sm font-bold text-[var(--c-aqua-strong)] hover:bg-[var(--c-surface)]"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  )
}
