export type NotificationType =
  | 'booking_confirmed' // athlete booked -> coach
  | 'booking_cancelled' // athlete cancelled -> coach
  | 'booking_created_by_coach' // coach added student -> athlete
  | 'booking_cancelled_by_coach' // coach cancelled -> athlete
  | 'verification_requested' // coach requested -> admins
  | 'verification_reviewed' // admin reviewed -> coach
  | 'push_test' // user requested a push delivery test
  | 'athlete_invite_accepted' // athlete accepted -> coach (future)
  | 'athlete_invite_rejected' // athlete rejected -> coach (future)

export interface AppNotification {
  id: string
  recipientId: string
  actorId: string | null
  actorName: string | null
  type: NotificationType
  /** Render-ready Spanish copy, precomputed server-side. */
  title: string
  body: string
  /** Where clicking the notification navigates. */
  link: string
  data?: {
    bookingId?: string
    date?: string
    startTime?: string
    locationName?: string
    status?: string
  }
  createdAt: number
  readAt: number | null
}

/** Short Spanish relative time for notification timestamps. */
export function notificationTimeAgo(createdAt: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - createdAt) / 1000))
  if (seconds < 60) return 'ahora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} d`
  return new Date(createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
