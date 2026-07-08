import 'server-only'

import { randomBytes } from 'node:crypto'
import type { Booking } from '@/lib/coach-booking'
import { adminDb } from '@/lib/server/firebase-admin'

export type CalendarRole = 'athlete' | 'coach'
export type ReminderOffset = 5 | 60 | 1440

export interface CalendarFeed {
  id: string
  uid: string
  role: CalendarRole
  token: string
  active: boolean
  reminderOffsets: ReminderOffset[]
  createdAt: number
  updatedAt: number
  revokedAt?: number | null
}

const VALID_REMINDERS = new Set<ReminderOffset>([5, 60, 1440])

export function calendarFeedId(uid: string, role: CalendarRole) {
  return `${uid}_${role}`
}

export function normalizeRole(value: string | null): CalendarRole | null {
  return value === 'coach' || value === 'athlete' ? value : null
}

export function normalizeReminderOffsets(value: unknown): ReminderOffset[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value)]
    .map((item) => Number(item))
    .filter((item): item is ReminderOffset => VALID_REMINDERS.has(item as ReminderOffset))
    .sort((a, b) => b - a)
}

export function calendarUrlFor(request: Request, token: string) {
  return new URL(`/api/calendar/feeds/${token}.ics`, request.url).toString()
}

export async function getCalendarFeed(uid: string, role: CalendarRole) {
  const doc = await adminDb.collection('calendarFeeds').doc(calendarFeedId(uid, role)).get()
  if (!doc.exists) return null
  return doc.data() as CalendarFeed
}

export async function upsertCalendarFeed(
  uid: string,
  role: CalendarRole,
  reminderOffsets: ReminderOffset[]
) {
  const ref = adminDb.collection('calendarFeeds').doc(calendarFeedId(uid, role))
  const current = await ref.get()
  const now = Date.now()
  const existing = current.exists ? (current.data() as Partial<CalendarFeed>) : null
  const feed: CalendarFeed = {
    id: ref.id,
    uid,
    role,
    token: existing?.token || randomBytes(24).toString('base64url'),
    active: true,
    reminderOffsets,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    revokedAt: null,
  }
  await ref.set(feed, { merge: true })
  return feed
}

export async function revokeCalendarFeed(uid: string, role: CalendarRole) {
  const ref = adminDb.collection('calendarFeeds').doc(calendarFeedId(uid, role))
  await ref.set(
    {
      active: false,
      token: randomBytes(24).toString('base64url'),
      updatedAt: Date.now(),
      revokedAt: Date.now(),
    },
    { merge: true }
  )
}

export async function getFeedByToken(tokenWithExtension: string) {
  const token = tokenWithExtension.replace(/\.ics$/i, '')
  const snapshot = await adminDb
    .collection('calendarFeeds')
    .where('token', '==', token)
    .limit(1)
    .get()
  if (snapshot.empty) return null
  const feed = snapshot.docs[0].data() as CalendarFeed
  return feed.active ? feed : null
}

export async function getBookingsForFeed(feed: CalendarFeed) {
  const field = feed.role === 'coach' ? 'coachId' : 'athleteId'
  const snapshot = await adminDb.collection('bookings').where(field, '==', feed.uid).get()
  return snapshot.docs
    .map((doc) => doc.data() as Booking)
    .filter((booking) => booking.status !== 'cancelled')
    .filter((booking) => Boolean(booking.athleteId && booking.coachId && booking.date))
    .sort((a, b) =>
      `${a.date || ''} ${a.startTime || ''}`.localeCompare(`${b.date || ''} ${b.startTime || ''}`)
    )
}

function escapeIcsText(value: string | null | undefined) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function icsDateTime(date: string, time: string) {
  return `${date.replace(/-/g, '')}T${time.replace(':', '').padEnd(6, '0')}`
}

function utcStamp(value = new Date()) {
  return value
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function foldLine(line: string) {
  const chunks: string[] = []
  let rest = line
  while (rest.length > 74) {
    chunks.push(rest.slice(0, 74))
    rest = ` ${rest.slice(74)}`
  }
  chunks.push(rest)
  return chunks.join('\r\n')
}

function eventSummary(feed: CalendarFeed, booking: Booking) {
  if (feed.role === 'coach') return `Clase con ${booking.athleteName || 'alumno'}`
  return `Clase con ${booking.coachName || 'coach'}`
}

function eventDescription(feed: CalendarFeed, booking: Booking) {
  const counterpart =
    feed.role === 'coach'
      ? `Alumno: ${booking.athleteName || 'Alumno'}`
      : `Coach: ${booking.coachName || 'Coach'}`
  const modality = booking.groupType === 'grupal' ? 'Clase grupal' : 'Clase individual'
  return [counterpart, modality, `Ubicación: ${booking.locationName || 'Por confirmar'}`].join('\n')
}

export function buildCalendarIcs(feed: CalendarFeed, bookings: Booking[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nadamas//Calendar Feeds//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(feed.role === 'coach' ? 'Nadamas - Clases con alumnos' : 'Nadamas - Mis clases')}`,
    'X-WR-TIMEZONE:America/Mazatlan',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]

  for (const booking of bookings) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(`${booking.id}@nadamas.app`)}`,
      `DTSTAMP:${utcStamp()}`,
      `DTSTART:${icsDateTime(booking.date, booking.startTime)}`,
      `DTEND:${icsDateTime(booking.date, booking.endTime || booking.startTime)}`,
      `SUMMARY:${escapeIcsText(eventSummary(feed, booking))}`,
      `DESCRIPTION:${escapeIcsText(eventDescription(feed, booking))}`,
      `LOCATION:${escapeIcsText(booking.locationName || 'Por confirmar')}`,
      `STATUS:CONFIRMED`,
      `LAST-MODIFIED:${utcStamp(new Date(booking.updatedAt || booking.createdAt || Date.now()))}`
    )
    for (const offset of feed.reminderOffsets) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcsText(eventSummary(feed, booking))}`,
        `TRIGGER:-PT${offset}M`,
        'END:VALARM'
      )
    }
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}
