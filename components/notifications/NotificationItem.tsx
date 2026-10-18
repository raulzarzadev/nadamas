'use client'

import Link from 'next/link'
import { FiArrowDownLeft, FiArrowUpRight } from 'react-icons/fi'
import { useRole } from '@/context/RoleContext'
import {
  type AppNotification,
  notificationDestination,
  notificationTimeAgo,
} from '@/lib/notification'

export default function NotificationItem({
  notification,
  onNavigate,
  showActor = false,
  direction,
}: {
  notification: AppNotification
  onNavigate?: () => void
  /** Show "Para: …" instead of the unread dot (used in the "Enviadas" tab). */
  showActor?: boolean
  /** In a mixed list: received (↙) or sent (↗). Sent ones never show as unread. */
  direction?: 'in' | 'out'
}) {
  const { activeRole } = useRole()
  const unread = !showActor && direction !== 'out' && !notification.readAt
  return (
    <Link
      href={notificationDestination(notification, activeRole)}
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
          <span className="flex min-w-0 items-center gap-1 text-sm font-bold text-[var(--c-ocean)]">
            {direction && (
              <span
                title={direction === 'out' ? 'Enviada' : 'Recibida'}
                className={`shrink-0 ${direction === 'out' ? 'text-[var(--c-aqua-strong)]' : 'text-[var(--c-text-2)]'}`}
              >
                {direction === 'out' ? (
                  <FiArrowUpRight aria-hidden="true" className="size-3.5" />
                ) : (
                  <FiArrowDownLeft aria-hidden="true" className="size-3.5" />
                )}
                <span className="sr-only">{direction === 'out' ? 'Enviada: ' : 'Recibida: '}</span>
              </span>
            )}
            <span className="truncate">{notification.title}</span>
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-[var(--c-text-2)]">
            {notificationTimeAgo(notification.createdAt)}
          </span>
        </span>
        <span className="mt-0.5 block whitespace-pre-line text-sm text-[var(--c-text-2)]">
          {notification.body}
        </span>
      </span>
    </Link>
  )
}
