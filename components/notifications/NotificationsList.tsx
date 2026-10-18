'use client'

import NotificationItem from '@comps/notifications/NotificationItem'
import { useEffect, useState } from 'react'
import { useUser } from '@/context/UserContext'
import { NotificationCRUD } from '@/firebase/notifications/main'
import { postAuthed } from '@/lib/client/authed-api'
import type { AppNotification } from '@/lib/notification'
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  notificationCategory,
} from '@/lib/notification-category'
import PendingSchoolRequests from './PendingSchoolRequests'
import SchoolInvitations from './SchoolInvitations'
import usePendingSchoolRequests from './usePendingSchoolRequests'
import useProfileInvitations from './useProfileInvitations'

const PAGE_SIZE = 10

export default function NotificationsList() {
  const { user } = useUser() as { user: { uid?: string; id?: string } | null | undefined }
  const uid = user?.uid || user?.id
  const profileInvitations = useProfileInvitations(uid)
  const pendingRequests = usePendingSchoolRequests(uid)
  const [received, setReceived] = useState<AppNotification[]>([])
  const [sent, setSent] = useState<AppNotification[]>([])
  // Newest 10 first; "Cargar más" reveals 10 more.
  const [shown, setShown] = useState(PAGE_SIZE)
  const [category, setCategory] = useState<NotificationCategory | 'all'>('all')

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

  // One list, newest first; sent ones are marked with an outgoing arrow.
  const receivedIds = new Set(received.map((item) => item.id))
  const merged = [
    ...received.map((item) => ({ item, direction: 'in' as const })),
    ...sent
      .filter((item) => !receivedIds.has(item.id))
      .map((item) => ({ item, direction: 'out' as const })),
  ].sort((a, b) => b.item.createdAt - a.item.createdAt)
  const showDirection = merged.some((entry) => entry.direction === 'out')
  const entries = [
    ...profileInvitations.map((item) => ({ item, direction: 'in' as const })),
    ...merged,
  ]
  const allItems = entries.map((entry) => entry.item)
  const items =
    category === 'all'
      ? entries
      : entries.filter((entry) => notificationCategory(entry.item.type) === category)
  const pendingCategory = (kind: (typeof pendingRequests)[number]['kind']): NotificationCategory =>
    kind === 'payments' || kind === 'coachPayments' ? 'payments' : 'requests'
  const visiblePending =
    category === 'all'
      ? pendingRequests
      : pendingRequests.filter((item) => pendingCategory(item.kind) === category)
  // Only chips that have something (received/sent list or pending items) are shown.
  const categories = NOTIFICATION_CATEGORIES.filter(
    (option) =>
      option.id === 'invitations' ||
      allItems.some((item) => notificationCategory(item.type) === option.id) ||
      pendingRequests.some((item) => pendingCategory(item.kind) === option.id)
  )
  const chooseCategory = (next: NotificationCategory | 'all') => {
    setCategory(next)
    setShown(PAGE_SIZE)
  }

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={markAllRead}
          className="self-end text-sm font-semibold text-[var(--c-aqua-strong)] hover:underline"
        >
          Marcar todas como leídas
        </button>
      )}

      <nav aria-label="Categorías de notificaciones" className="flex flex-wrap gap-1.5">
        {[{ id: 'all' as const, label: 'Todas' }, ...categories].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={category === option.id}
            onClick={() => chooseCategory(option.id)}
            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) ${category === option.id ? 'border-(--c-ocean) bg-(--c-ocean) text-white' : 'border-(--c-border) bg-white text-(--c-ocean) hover:bg-(--c-surface)'}`}
          >
            {option.label}
          </button>
        ))}
      </nav>
      {(category === 'all' || category === 'invitations') && <SchoolInvitations />}
      {visiblePending.length > 0 && (
        <div className="overflow-hidden rounded-[var(--r-md)] border border-(--c-border) bg-white [&>section]:border-b-0">
          <PendingSchoolRequests
            items={visiblePending}
            showSchool={new Set(visiblePending.map((item) => item.schoolId)).size > 1}
          />
        </div>
      )}
      <div className="overflow-hidden rounded-[var(--r-md)] border border-[var(--c-border)] bg-white">
        {items.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-[var(--c-text-2)]">
            {category !== 'all'
              ? 'No hay notificaciones en esta categoría.'
              : 'No tienes notificaciones.'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--c-border)]">
            {items.slice(0, shown).map(({ item, direction }) => (
              <li key={`${direction}:${item.id}`}>
                <NotificationItem
                  notification={item}
                  direction={showDirection ? direction : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {items.length > shown && (
        <button
          type="button"
          onClick={() => setShown((current) => current + PAGE_SIZE)}
          className="self-center rounded-full border border-(--c-border) bg-white px-4 py-2 text-sm font-semibold text-(--c-ocean) transition-colors hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
        >
          Cargar más ({items.length - shown})
        </button>
      )}
    </div>
  )
}
