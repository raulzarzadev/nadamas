export type NotificationType =
  | 'payment_reviewed'
  | 'payment_pending'
  | 'booking_confirmed' // athlete booked -> coach
  | 'booking_cancelled' // athlete cancelled -> coach
  | 'booking_created_by_coach' // coach added student -> athlete
  | 'booking_cancelled_by_coach' // coach cancelled -> athlete
  | 'student_added_by_coach' // coach added a student profile -> athlete
  | 'verification_requested' // coach requested -> admins
  | 'verification_reviewed' // admin reviewed -> coach
  | 'push_test' // user requested a push delivery test
  | 'athlete_invite_accepted' // athlete accepted -> coach (future)
  | 'athlete_invite_rejected' // athlete rejected -> coach (future)
  | 'school_access_requested'
  | 'school_access_reviewed'
  | 'school_invitation_sent'
  | 'school_invitation_accepted'
  | 'school_class_requested'
  | 'school_class_assigned'
  | 'school_class_cancelled'

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

/** Repair legacy class links without routing coaches into the director workspace. */
export function notificationDestination(notification: AppNotification, role: string) {
  const classUpdate =
    notification.type === 'school_class_assigned' || notification.type === 'school_class_cancelled'
  if (classUpdate && notification.link.startsWith('/school/classes')) {
    if (role === 'coach') return notification.link.replace('/school/classes', '/coach/agenda')
    if (role === 'athlete')
      return notification.link.replace('/school/classes', '/athlete/find-coach')
  }
  return notification.link
}
