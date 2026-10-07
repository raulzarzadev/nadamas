import 'server-only'

import type { QuerySnapshot } from 'firebase-admin/firestore'
import { isSafeSchoolUrl, type SchoolClassOccurrence, type SchoolClassRequest } from '@/lib/school'
import { adminDb } from './firebase-admin'

export interface CreateSchoolClassInput {
  schoolId: string
  title: string
  type: 'individual' | 'group'
  teacherIds: string[]
  studentIds: string[]
  startDate: string
  endDate: string
  daysOfWeek: number[]
  startTime: string
  endTime: string
  timezone: string
  location: string
  locationUrl: string
  visibility: 'public' | 'private'
  recurring: boolean
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function datesForInput(input: CreateSchoolClassInput) {
  const start = parseDate(input.startDate)
  const end = parseDate(input.recurring ? input.endDate || input.startDate : input.startDate)
  if (!start || !end || end < start) return []
  const selectedDays = new Set(input.daysOfWeek.length ? input.daysOfWeek : [start.getUTCDay()])
  const result: string[] = []
  for (
    const cursor = new Date(start);
    cursor <= end && result.length < 370;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    if (selectedDays.has(cursor.getUTCDay())) result.push(dateKey(cursor))
  }
  return result
}

export function validateClassInput(input: Partial<CreateSchoolClassInput>) {
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const type: CreateSchoolClassInput['type'] | null =
    input.type === 'group' ? 'group' : input.type === 'individual' ? 'individual' : null
  const teacherIds = Array.isArray(input.teacherIds)
    ? [...new Set(input.teacherIds.filter((id): id is string => typeof id === 'string'))].slice(
        0,
        20
      )
    : []
  const studentIds = Array.isArray(input.studentIds)
    ? [...new Set(input.studentIds.filter((id): id is string => typeof id === 'string'))].slice(
        0,
        100
      )
    : []
  const startDate = typeof input.startDate === 'string' ? input.startDate : ''
  const endDate = typeof input.endDate === 'string' ? input.endDate : startDate
  const startTime = typeof input.startTime === 'string' ? input.startTime : ''
  const endTime = typeof input.endTime === 'string' ? input.endTime : ''
  const timezone = typeof input.timezone === 'string' ? input.timezone : 'America/Mexico_City'
  const location = typeof input.location === 'string' ? input.location.trim().slice(0, 200) : ''
  const locationUrl =
    typeof input.locationUrl === 'string' ? input.locationUrl.trim().slice(0, 500) : ''
  const visibility: CreateSchoolClassInput['visibility'] =
    input.visibility === 'public' ? 'public' : 'private'
  const recurring = input.recurring === true
  const daysOfWeek = Array.isArray(input.daysOfWeek)
    ? [
        ...new Set(
          input.daysOfWeek.filter(
            (day): day is number => Number.isInteger(day) && day >= 0 && day <= 6
          )
        ),
      ]
    : []
  if (title.length > 120) return { ok: false as const, reason: 'title' as const }
  if (!type) return { ok: false as const, reason: 'type' as const }
  const parsedStartDate = parseDate(startDate)
  const parsedEndDate = parseDate(endDate)
  if (!parsedStartDate || !parsedEndDate || parsedEndDate < parsedStartDate)
    return { ok: false as const, reason: 'date' as const }
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime)
    return { ok: false as const, reason: 'time' as const }
  if (recurring && !daysOfWeek.length) return { ok: false as const, reason: 'days' as const }
  if (!isSafeSchoolUrl(locationUrl)) return { ok: false as const, reason: 'location' as const }
  if (typeof input.schoolId !== 'string' || !input.schoolId)
    return { ok: false as const, reason: 'title' as const }
  return {
    ok: true as const,
    value: {
      schoolId: input.schoolId,
      title,
      type,
      teacherIds,
      studentIds,
      startDate,
      endDate,
      daysOfWeek,
      startTime,
      endTime,
      timezone,
      location,
      locationUrl,
      visibility,
      recurring,
    },
  }
}

export async function createSchoolClass(input: CreateSchoolClassInput) {
  const now = Date.now()
  const seriesRef = adminDb.collection('schoolClassSeries').doc()
  const dates = datesForInput(input)
  if (input.type === 'group') {
    return adminDb.runTransaction(async (transaction) => {
      const existingSnapshot = await transaction.get(
        adminDb.collection('schoolClassOccurrences').where('schoolId', '==', input.schoolId)
      )
      const existing = existingSnapshot.docs.map((doc) => ({
        ref: doc.ref,
        occurrence: doc.data() as SchoolClassOccurrence,
      }))
      const teacherKey = [...input.teacherIds].sort().join('|')
      const occurrences: SchoolClassOccurrence[] = []
      let created = false
      for (const date of dates) {
        const matches = existing.filter(
          ({ occurrence }) =>
            occurrence.type === 'group' &&
            (occurrence.status === 'scheduled' || occurrence.status === 'pending') &&
            occurrence.date === date &&
            occurrence.startTime === input.startTime &&
            occurrence.endTime === input.endTime &&
            occurrence.title.trim().toLocaleLowerCase('es') ===
              input.title.trim().toLocaleLowerCase('es') &&
            [...occurrence.teacherIds].sort().join('|') === teacherKey
        )
        if (matches.length) {
          if (matches.some(({ occurrence }) => occurrence.classFull === true))
            throw new Error('GROUP_CLASS_FULL')
          const match = matches.reduce((primary, candidate) =>
            candidate.occurrence.studentIds.length > primary.occurrence.studentIds.length
              ? candidate
              : primary
          )
          const studentIds = [
            ...new Set([
              ...matches.flatMap(({ occurrence }) => occurrence.studentIds),
              ...input.studentIds,
            ]),
          ]
          if (studentIds.length > 100) throw new Error('GROUP_CLASS_FULL')
          if (studentIds.length !== match.occurrence.studentIds.length)
            transaction.update(match.ref, { studentIds, updatedAt: now })
          occurrences.push({ ...match.occurrence, studentIds })
          continue
        }
        const ref = adminDb.collection('schoolClassOccurrences').doc()
        const occurrence: SchoolClassOccurrence = {
          id: ref.id,
          seriesId: seriesRef.id,
          schoolId: input.schoolId,
          title: input.title,
          type: input.type,
          date,
          startTime: input.startTime,
          endTime: input.endTime,
          timezone: input.timezone,
          teacherIds: input.teacherIds,
          studentIds: input.studentIds,
          location: input.location,
          locationUrl: input.locationUrl,
          visibility: input.visibility,
          status: 'scheduled',
          createdAt: now,
          updatedAt: now,
        }
        transaction.set(ref, occurrence)
        occurrences.push(occurrence)
        created = true
      }
      if (created)
        transaction.set(seriesRef, { ...input, id: seriesRef.id, createdAt: now, updatedAt: now })
      return { seriesId: created ? seriesRef.id : occurrences[0]?.seriesId || '', occurrences }
    })
  }
  const batch = adminDb.batch()
  batch.set(seriesRef, { ...input, id: seriesRef.id, createdAt: now, updatedAt: now })
  const occurrences: SchoolClassOccurrence[] = []
  for (const date of dates) {
    const ref = adminDb.collection('schoolClassOccurrences').doc()
    const occurrence: SchoolClassOccurrence = {
      id: ref.id,
      seriesId: seriesRef.id,
      schoolId: input.schoolId,
      title: input.title,
      type: input.type,
      date,
      startTime: input.startTime,
      endTime: input.endTime,
      timezone: input.timezone,
      teacherIds: input.teacherIds,
      studentIds: input.studentIds,
      location: input.location,
      locationUrl: input.locationUrl,
      visibility: input.visibility,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    }
    batch.set(ref, occurrence)
    occurrences.push(occurrence)
  }
  await batch.commit()
  return { seriesId: seriesRef.id, occurrences }
}

export async function listSchoolClasses(args: {
  schoolId: string
  teacherId?: string
  studentIds?: string[]
}) {
  if (args.studentIds && args.studentIds.length === 0) return []
  let snapshots: QuerySnapshot
  if (args.teacherId) {
    snapshots = await adminDb
      .collection('schoolClassOccurrences')
      .where('schoolId', '==', args.schoolId)
      .get()
    return snapshots.docs
      .map((doc) => doc.data() as SchoolClassOccurrence)
      .filter((occurrence) => occurrence.teacherIds.includes(args.teacherId as string))
      .sort(sortOccurrences)
  } else if (args.studentIds?.length) {
    snapshots = await adminDb
      .collection('schoolClassOccurrences')
      .where('schoolId', '==', args.schoolId)
      .get()
    const studentIds = new Set(args.studentIds)
    return snapshots.docs
      .map((doc) => doc.data() as SchoolClassOccurrence)
      .filter((occurrence) => occurrence.studentIds.some((studentId) => studentIds.has(studentId)))
      .sort(sortOccurrences)
  } else {
    snapshots = await adminDb
      .collection('schoolClassOccurrences')
      .where('schoolId', '==', args.schoolId)
      .get()
  }
  return snapshots.docs.map((doc) => doc.data() as SchoolClassOccurrence).sort(sortOccurrences)
}

export async function listPublicSchoolClasses(schoolId: string) {
  const snapshot = await adminDb
    .collection('schoolClassOccurrences')
    .where('schoolId', '==', schoolId)
    .get()
  const today = new Date().toISOString().slice(0, 10)
  return snapshot.docs
    .map((doc) => doc.data() as SchoolClassOccurrence)
    .filter(
      (occurrence) =>
        occurrence.visibility === 'public' &&
        occurrence.status === 'scheduled' &&
        occurrence.date >= today
    )
    .sort(sortOccurrences)
}

function sortOccurrences(a: SchoolClassOccurrence, b: SchoolClassOccurrence) {
  return `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
}

export async function getSchoolClassOccurrence(schoolId: string, occurrenceId: string) {
  const snapshot = await adminDb.collection('schoolClassOccurrences').doc(occurrenceId).get()
  const value = snapshot.exists ? (snapshot.data() as SchoolClassOccurrence) : null
  return value?.schoolId === schoolId ? value : null
}

export async function listClassRequests(schoolId: string, requestedBy?: string) {
  const snapshot = await adminDb
    .collection('schoolClassRequests')
    .where('schoolId', '==', schoolId)
    .get()
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<SchoolClassRequest, 'id'>) }))
    .filter((request) => !requestedBy || request.requestedBy === requestedBy)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function createClassRequest(
  input: Omit<SchoolClassRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>
) {
  const now = Date.now()
  const ref = adminDb.collection('schoolClassRequests').doc()
  const request: SchoolClassRequest = {
    id: ref.id,
    ...input,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(request)
  return request
}
