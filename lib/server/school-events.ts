import 'server-only'

import type { School } from '@/lib/school'
import { type SchoolEvent, type SchoolEventInput, splitSchoolEvents } from '@/lib/school-events'
import { adminDb } from './firebase-admin'

const COLLECTION = 'schoolEvents'

export async function listSchoolEvents(
  schoolId: string,
  { includePrivate }: { includePrivate: boolean }
): Promise<SchoolEvent[]> {
  const snapshot = await adminDb.collection(COLLECTION).where('schoolId', '==', schoolId).get()
  return snapshot.docs
    .map((doc) => {
      // Never leak the coordinator's uid to visitors, members or SSR props.
      const { createdBy: _createdBy, ...event } = doc.data() as Omit<SchoolEvent, 'id'>
      return { ...event, id: doc.id }
    })
    .filter((event) => includePrivate || event.visibility === 'public')
}

export async function createSchoolEvent(
  schoolId: string,
  userId: string,
  value: SchoolEventInput
): Promise<SchoolEvent> {
  const ref = adminDb.collection(COLLECTION).doc()
  const now = Date.now()
  const event: SchoolEvent = {
    ...value,
    id: ref.id,
    schoolId,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(event)
  return event
}

export async function updateSchoolEvent(
  schoolId: string,
  eventId: string,
  value: SchoolEventInput
): Promise<SchoolEvent | null> {
  const ref = adminDb.collection(COLLECTION).doc(eventId)
  const snapshot = await ref.get()
  if (!snapshot.exists || snapshot.data()?.schoolId !== schoolId) return null
  const updatedAt = Date.now()
  await ref.update({ ...value, updatedAt })
  return { ...(snapshot.data() as Omit<SchoolEvent, 'id'>), ...value, id: eventId, updatedAt }
}

export async function deleteSchoolEvent(schoolId: string, eventId: string): Promise<boolean> {
  const ref = adminDb.collection(COLLECTION).doc(eventId)
  const snapshot = await ref.get()
  if (!snapshot.exists || snapshot.data()?.schoolId !== schoolId) return false
  await ref.delete()
  return true
}

/** Upcoming PUBLIC events for visitor HTML. Never includes private events; [] on failure. */
export async function upcomingPublicSchoolEvents(
  school: Pick<School, 'id' | 'timezone'>,
  limit = 3
): Promise<SchoolEvent[]> {
  try {
    const events = await listSchoolEvents(school.id, { includePrivate: false })
    return splitSchoolEvents(events, school.timezone || 'America/Mexico_City').upcoming.slice(
      0,
      limit
    )
  } catch {
    return []
  }
}
