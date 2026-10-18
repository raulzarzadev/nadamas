import type { NotificationType } from './notification'

export type NotificationCategory = 'payments' | 'invitations' | 'requests' | 'classes' | 'other'

export const NOTIFICATION_CATEGORIES: Array<{ id: NotificationCategory; label: string }> = [
  { id: 'payments', label: 'Cobros' },
  { id: 'invitations', label: 'Invitaciones' },
  { id: 'requests', label: 'Solicitudes' },
  { id: 'classes', label: 'Clases' },
  { id: 'other', label: 'Otros' },
]

const BY_TYPE: Record<NotificationType, NotificationCategory> = {
  payment_pending: 'payments',
  payment_reviewed: 'payments',
  athlete_profile_invitation: 'invitations',
  school_invitation_sent: 'invitations',
  school_invitation_accepted: 'invitations',
  athlete_invite_accepted: 'invitations',
  athlete_invite_rejected: 'invitations',
  student_added_by_coach: 'invitations',
  school_class_requested: 'requests',
  school_access_requested: 'requests',
  school_access_reviewed: 'requests',
  booking_confirmed: 'classes',
  booking_cancelled: 'classes',
  booking_created_by_coach: 'classes',
  booking_cancelled_by_coach: 'classes',
  school_class_assigned: 'classes',
  school_class_cancelled: 'classes',
  verification_requested: 'other',
  verification_reviewed: 'other',
  push_test: 'other',
}

/** Filter chip a notification belongs to on /notifications. */
export function notificationCategory(type: NotificationType): NotificationCategory {
  return BY_TYPE[type] || 'other'
}
