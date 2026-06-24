'use client'

import Link from 'next/link'
import { type AppNotification, notificationTimeAgo } from '@/lib/notification'

export default function NotificationItem({
  notification,
  onNavigate,
  showActor = false,
}: {
  notification: AppNotification
  onNavigate?: () => void
  /** Show "Para: …" instead of the unread dot (used in the "Enviadas" tab). */
  showActor?: boolean
}) {
  const unread = !showActor && !notification.readAt
  return (
    <Link
      href={notification.link}
      onClick={onNavigate}
      className={`flex gap-3 px-3 py-3 transition-colors hover:bg-[var(--c-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--c-aqua-strong)] ${
        unread ? 'bg-[var(--c-aqua-light)]/25' : ''
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          unread ? 'bg-[var(--c-aqua)]' : 'bg-transparent'
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-bold text-[var(--c-ocean)]">
            {notification.title}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-[var(--c-text-2)]">
            {notificationTimeAgo(notification.createdAt)}
          </span>
        </span>
        <span className="mt-0.5 block text-sm text-[var(--c-text-2)]">{notification.body}</span>
      </span>
    </Link>
  )
}
