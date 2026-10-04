import 'server-only'

import { randomBytes } from 'node:crypto'
import { schoolClassDisplayTitle, type SchoolClassOccurrence } from '@/lib/school'
import { adminDb } from './firebase-admin'
import { listSchoolClasses } from './school-classes'
import { listSchoolStudents } from './school-students'

export type SchoolCalendarRole = 'director' | 'teacher' | 'student'

export interface SchoolCalendarFeed {
  id: string
  schoolId: string
  userId: string
  role: SchoolCalendarRole
  token: string
  active: boolean
  createdAt: number
  updatedAt: number
}

function feedId(schoolId: string, userId: string) {
  return `${schoolId}_${userId}`
}

export async function upsertSchoolCalendarFeed(
  schoolId: string,
  userId: string,
  role: SchoolCalendarRole
) {
  const ref = adminDb.collection('schoolCalendarFeeds').doc(feedId(schoolId, userId))
  const current = await ref.get()
  const now = Date.now()
  const previous = current.exists ? (current.data() as Partial<SchoolCalendarFeed>) : null
  const feed: SchoolCalendarFeed = {
    id: ref.id,
    schoolId,
    userId,
    role,
    token: previous?.token || randomBytes(32).toString('base64url'),
    active: true,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  }
  await ref.set(feed, { merge: true })
  return feed
}

export async function getSchoolCalendarFeed(schoolId: string, userId: string) {
  const snapshot = await adminDb
    .collection('schoolCalendarFeeds')
    .doc(feedId(schoolId, userId))
    .get()
  return snapshot.exists ? (snapshot.data() as SchoolCalendarFeed) : null
}

export async function revokeSchoolCalendarFeed(schoolId: string, userId: string) {
  await adminDb
    .collection('schoolCalendarFeeds')
    .doc(feedId(schoolId, userId))
    .set(
      { active: false, token: randomBytes(32).toString('base64url'), updatedAt: Date.now() },
      { merge: true }
    )
}

export async function getSchoolCalendarFeedByToken(tokenWithExtension: string) {
  const token = tokenWithExtension.replace(/\.ics$/i, '')
  const snapshot = await adminDb
    .collection('schoolCalendarFeeds')
    .where('token', '==', token)
    .limit(1)
    .get()
  if (snapshot.empty) return null
  const feed = snapshot.docs[0].data() as SchoolCalendarFeed
  return feed.active ? feed : null
}

export async function getOccurrencesForSchoolFeed(feed: SchoolCalendarFeed) {
  if (feed.role === 'director') return listSchoolClasses({ schoolId: feed.schoolId })
  if (feed.role === 'teacher')
    return listSchoolClasses({ schoolId: feed.schoolId, teacherId: feed.userId })
  if (feed.role === 'student') {
    const students = await listSchoolStudents(feed.schoolId, undefined, feed.userId)
    return listSchoolClasses({
      schoolId: feed.schoolId,
      studentIds: students.map((student) => student.id),
    })
  }
  const students = await listSchoolStudents(feed.schoolId, feed.userId)
  return listSchoolClasses({
    schoolId: feed.schoolId,
    studentIds: students.map((student) => student.id),
  })
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

function foldLine(line: string) {
  const chunks: string[] = []
  let remaining = line
  while (remaining.length > 74) {
    chunks.push(remaining.slice(0, 74))
    remaining = ` ${remaining.slice(74)}`
  }
  chunks.push(remaining)
  return chunks.join('\r\n')
}

function utcStamp(value = new Date()) {
  return value
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

export function buildSchoolCalendarIcs(
  _feed: SchoolCalendarFeed,
  occurrences: SchoolClassOccurrence[]
) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nadamas//School Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Nadamas - Escuela',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]
  for (const occurrence of occurrences) {
    const status =
      occurrence.status === 'cancelled'
        ? 'CANCELLED'
        : occurrence.status === 'pending'
          ? 'TENTATIVE'
          : 'CONFIRMED'
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(`${occurrence.id}@nadamas.app`)}`,
      `DTSTAMP:${utcStamp()}`,
      `DTSTART;TZID=${occurrence.timezone || 'UTC'}:${icsDateTime(occurrence.date, occurrence.startTime)}`,
      `DTEND;TZID=${occurrence.timezone || 'UTC'}:${icsDateTime(occurrence.date, occurrence.endTime)}`,
      `LOCATION:${escapeIcsText(occurrence.location || 'Por confirmar')}`,
      `STATUS:${status}`,
      `LAST-MODIFIED:${utcStamp(new Date(occurrence.updatedAt || occurrence.createdAt))}`,
      'END:VEVENT'
    )
    const title = schoolClassDisplayTitle(occurrence.title)
    if (title) lines.splice(lines.length - 6, 0, `SUMMARY:${escapeIcsText(title)}`)
  }
  lines.push('END:VCALENDAR')
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}
