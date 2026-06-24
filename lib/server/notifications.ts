import 'server-only'

import type { AppNotification, NotificationType } from '@/lib/notification'
import { adminDb } from './firebase-admin'

interface CreateNotificationInput {
  recipientId: string
  actorId?: string | null
  actorName?: string | null
  type: NotificationType
  title: string
  body: string
  link: string
  data?: AppNotification['data']
}

/**
 * Write one in-app notification. Best-effort: callers fire-and-forget alongside
 * the existing email so a failed notification never breaks the main action.
 * Skips recipients that are not real accounts (manual_* / manual:* placeholder
 * student ids have no uid and nobody to read them).
 */
export async function createNotification(input: CreateNotificationInput) {
  if (!input.recipientId || input.recipientId.startsWith('manual')) return null
  const ref = adminDb.collection('notifications').doc()
  const notification: AppNotification = {
    id: ref.id,
    recipientId: input.recipientId,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    ...(input.data ? { data: input.data } : {}),
    createdAt: Date.now(),
    readAt: null,
  }
  await ref.set(notification)
  return notification
}

function slotLabel(date?: string, startTime?: string) {
  return [date, startTime].filter(Boolean).join(' · ')
}

export function notifyBookingConfirmed(args: {
  coachId: string
  athleteId: string
  athleteName: string
  date: string
  startTime: string
  locationName: string
  bookingId: string
  count?: number
}) {
  const many = (args.count ?? 1) > 1
  return createNotification({
    recipientId: args.coachId,
    actorId: args.athleteId,
    actorName: args.athleteName,
    type: 'booking_confirmed',
    title: many ? 'Nuevas clases agendadas' : 'Nueva clase agendada',
    body: many
      ? `${args.athleteName} agendó ${args.count} clases contigo.`
      : `${args.athleteName} agendó una clase (${slotLabel(args.date, args.startTime)}).`,
    link: '/coach/agenda',
    data: {
      bookingId: args.bookingId,
      date: args.date,
      startTime: args.startTime,
      locationName: args.locationName,
    },
  })
}

export function notifyBookingCancelled(args: {
  coachId: string
  athleteId: string
  athleteName: string
  locationName: string
  date?: string
  startTime?: string
  bookingId: string
}) {
  return createNotification({
    recipientId: args.coachId,
    actorId: args.athleteId,
    actorName: args.athleteName,
    type: 'booking_cancelled',
    title: 'Clase cancelada',
    body: `${args.athleteName} canceló su clase en ${args.locationName}.`,
    link: '/coach/agenda',
    data: {
      bookingId: args.bookingId,
      date: args.date,
      startTime: args.startTime,
      status: 'cancelled',
    },
  })
}

export function notifyBookingByCoach(args: {
  athleteId: string
  coachId: string
  coachName: string | null
  date: string
  startTime: string
  locationName: string
  bookingId: string
  cancelled?: boolean
}) {
  return createNotification({
    recipientId: args.athleteId,
    actorId: args.coachId,
    actorName: args.coachName,
    type: args.cancelled ? 'booking_cancelled_by_coach' : 'booking_created_by_coach',
    title: args.cancelled ? 'Tu coach canceló una clase' : 'Tu coach agendó una clase',
    body: args.cancelled
      ? `${args.coachName || 'Tu coach'} canceló tu clase (${slotLabel(args.date, args.startTime)}).`
      : `${args.coachName || 'Tu coach'} te agendó una clase (${slotLabel(args.date, args.startTime)}).`,
    link: '/athlete/bookings',
    data: {
      bookingId: args.bookingId,
      date: args.date,
      startTime: args.startTime,
      locationName: args.locationName,
      ...(args.cancelled ? { status: 'cancelled' } : {}),
    },
  })
}

export function notifyVerificationRequested(args: {
  adminId: string
  coachId: string
  coachName: string | null
}) {
  return createNotification({
    recipientId: args.adminId,
    actorId: args.coachId,
    actorName: args.coachName,
    type: 'verification_requested',
    title: 'Nueva solicitud de verificación',
    body: `${args.coachName || 'Un coach'} solicitó verificación de identidad.`,
    link: '/admin/verify-queue',
  })
}

export function notifyVerificationReviewed(args: {
  coachId: string
  adminId: string
  status: 'verified' | 'rejected'
}) {
  const verified = args.status === 'verified'
  return createNotification({
    recipientId: args.coachId,
    actorId: args.adminId,
    actorName: null,
    type: 'verification_reviewed',
    title: verified ? 'Tu perfil fue verificado' : 'Tu verificación necesita cambios',
    body: verified
      ? 'Tu identidad fue verificada por el equipo de Nadamas.'
      : 'Tu solicitud de verificación fue rechazada. Sube una imagen más clara para reintentar.',
    link: '/coach/coach-profile',
    data: { status: args.status },
  })
}
