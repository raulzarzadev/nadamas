import 'server-only'

import { createHash } from 'node:crypto'
import { classSlotKey } from '@/lib/calendar-class-events'
import type { AppNotification, NotificationType } from '@/lib/notification'
import type { SchoolClassOccurrence } from '@/lib/school'
import { adminDb } from './firebase-admin'
import { listSchoolStudents } from './school-students'
import { type PushSendResult, sendPushNotificationToUser } from './web-push'

interface CreateNotificationInput {
  recipientId: string
  actorId?: string | null
  actorName?: string | null
  type: NotificationType
  title: string
  body: string
  link: string
  data?: AppNotification['data']
  classEvent?: {
    schoolId: string
    date: string
    startTime: string
    endTime: string
    groupType: 'particular' | 'grupal'
  }
}

export interface CreateNotificationResult extends AppNotification {
  pushResult: PushSendResult | null
}

/**
 * Write one in-app notification. Best-effort: callers fire-and-forget alongside
 * the existing email so a failed notification never breaks the main action.
 * Skips recipients that are not real accounts (manual_* / manual:* placeholder
 * student ids have no uid and nobody to read them).
 */
export async function createNotification(input: CreateNotificationInput) {
  if (!input.recipientId || input.recipientId.startsWith('manual')) return null
  let grouped = false
  let names: string[] = []
  if (input.classEvent?.groupType === 'grupal') {
    grouped = true
    const { schoolId, date, startTime, endTime } = input.classEvent
    const snapshot = await adminDb
      .collection('schoolClassOccurrences')
      .where('schoolId', '==', schoolId)
      .get()
    const occurrences = snapshot.docs
      .map((doc) => doc.data() as SchoolClassOccurrence)
      .filter(
        (occurrence) =>
          occurrence.type === 'group' &&
          occurrence.teacherIds.includes(input.recipientId) &&
          occurrence.date === date &&
          occurrence.startTime === startTime &&
          occurrence.endTime === endTime
      )
    const active = occurrences.filter((occurrence) => occurrence.status !== 'cancelled')
    const studentIds = new Set(
      (active.length ? active : occurrences).flatMap((occurrence) => occurrence.studentIds)
    )
    const students = await listSchoolStudents(schoolId)
    const studentNames = new Map(students.map((student) => [student.id, student.name]))
    names = [...studentIds]
      .map((id) => studentNames.get(id) || 'Alumno')
      .sort((a, b) => a.localeCompare(b, 'es'))
    if (active.length && input.type === 'school_class_cancelled')
      input = { ...input, type: 'school_class_assigned' }
  }
  const key =
    grouped && input.classEvent
      ? createHash('sha256')
          .update(classSlotKey({ ...input.classEvent, coachId: input.recipientId }))
          .digest('hex')
      : null
  const ref = key
    ? adminDb.collection('notifications').doc(`class-${key}`)
    : adminDb.collection('notifications').doc()
  const previous = grouped ? await ref.get() : null
  const cancelled = input.type === 'school_class_cancelled'
  const notification: AppNotification = {
    id: ref.id,
    recipientId: input.recipientId,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    type: input.type,
    title: grouped
      ? cancelled
        ? 'Clase grupal cancelada'
        : previous?.exists
          ? 'Se actualizó la clase grupal'
          : `Clase grupal (${names.length})`
      : input.title,
    body: grouped
      ? [
          `Clase grupal (${names.length}) · ${input.classEvent?.date} · ${input.classEvent?.startTime}`,
          ...names,
        ].join('\n')
      : input.body,
    link:
      input.classEvent && input.link.startsWith('/school/classes')
        ? input.link.replace('/school/classes', '/coach/agenda')
        : input.link,
    ...(input.data ? { data: input.data } : {}),
    createdAt: Date.now(),
    readAt: null,
  }
  await ref.set(notification)
  let pushResult: PushSendResult | null = null
  try {
    pushResult = await sendPushNotificationToUser(input.recipientId, notification)
  } catch (error) {
    console.error('[WEB_PUSH_SEND]', error)
  }
  return { ...notification, pushResult }
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

export function notifyStudentAddedByCoach(args: {
  athleteId: string
  coachId: string
  coachName: string | null
}) {
  return createNotification({
    recipientId: args.athleteId,
    actorId: args.coachId,
    actorName: args.coachName,
    type: 'student_added_by_coach',
    title: 'Tu coach te agregó como alumno',
    body: `${args.coachName || 'Tu coach'} te agregó a su lista de alumnos en Nadamas.`,
    link: '/athlete/home',
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
