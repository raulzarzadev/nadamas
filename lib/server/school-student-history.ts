import 'server-only'

import type { Booking } from '@/lib/coach-booking'
import {
  bookingProgressEntryId,
  formatStudentLevel,
  type StudentProgressEntry,
} from '@/lib/coach-student-progress'
import { publicNameFromUser } from '@/lib/public-name'
import {
  type SchoolClassOccurrence,
  type SchoolStudent,
  schoolClassDisplayTitle,
} from '@/lib/school'
import {
  type SchoolHistoryClass,
  type SchoolHistoryEvaluation,
  type SchoolHistorySharedComment,
  type SchoolStudentHistory,
  schoolBookingHistoryStatus,
  studentSchoolBookings,
} from '@/lib/school-student-history'
import { adminDb } from './firebase-admin'

interface SchoolHistoryReview {
  id: string
  studentId: string
  teacherId: string
  occurrenceId: string
  reviewerRole: string
  rating: number
  comment: string
}

interface SchoolStudentRecord {
  sourceId: string
  studentId: string
  coachId: string
  attended?: boolean
  note?: string
  updatedAt?: number
}

export async function getSchoolStudentHistory(
  student: SchoolStudent,
  timezone: string,
  teacherId?: string,
  includeNotes = false
): Promise<SchoolStudentHistory> {
  const [bookingSnapshot, classSnapshot, reviewSnapshot, recordSnapshot, commentSnapshot] =
    await Promise.all([
      adminDb.collection('bookings').where('schoolId', '==', student.schoolId).get(),
      adminDb.collection('schoolClassOccurrences').where('schoolId', '==', student.schoolId).get(),
      adminDb.collection('schoolReviews').where('schoolId', '==', student.schoolId).get(),
      adminDb.collection('agendaStudentRecords').where('schoolId', '==', student.schoolId).get(),
      adminDb.collection('schoolClassComments').where('schoolId', '==', student.schoolId).get(),
    ])
  const studentIds = new Set(
    [student.id, student.studentUserId, student.additionalProfileId].filter(Boolean)
  )
  const notes = new Map<string, SchoolStudentRecord>()
  for (const doc of recordSnapshot.docs) {
    const record = doc.data() as SchoolStudentRecord
    if (!studentIds.has(record.studentId) || (teacherId && record.coachId !== teacherId)) continue
    const key = `${record.sourceId}|${record.studentId}`
    if ((record.updatedAt || 0) >= (notes.get(key)?.updatedAt || 0)) notes.set(key, record)
  }
  const sharedCommentsBySource = new Map<string, SchoolHistorySharedComment[]>()
  for (const doc of commentSnapshot.docs) {
    const comment = doc.data()
    if (!studentIds.has(comment.studentId)) continue
    const sourceKey = `${comment.sourceType}:${comment.sourceId}`
    const comments = sharedCommentsBySource.get(sourceKey) || []
    comments.push({
      id: doc.id,
      authorId: String(comment.authorId || ''),
      authorName: '',
      text: String(comment.text || ''),
      createdAt: Number(comment.createdAt || 0),
    })
    sharedCommentsBySource.set(sourceKey, comments)
  }
  const bookings = studentSchoolBookings(
    bookingSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Booking),
    student,
    teacherId
  )
  const occurrences = classSnapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as SchoolClassOccurrence)
    .filter(
      (item) =>
        item.studentIds?.includes(student.id) &&
        (!teacherId || item.teacherIds?.includes(teacherId))
    )
  const reviews = reviewSnapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as SchoolHistoryReview)
    .filter(
      (review) => review.studentId === student.id && (!teacherId || review.teacherId === teacherId)
    )
  const details = await Promise.all(
    bookings.map(async (booking) => {
      const [evaluation, progress] = await Promise.all([
        adminDb.collection('classEvaluations').doc(booking.id).get(),
        adminDb
          .collection('coachStudentProgressEntries')
          .doc(bookingProgressEntryId(booking.id))
          .get(),
      ])
      const evaluations: SchoolHistoryEvaluation[] = []
      const review = evaluation.data()
      if (review && review.coachId === booking.coachId)
        evaluations.push({
          id: `evaluation:${booking.id}`,
          direction: 'to-coach',
          coachId: booking.coachId,
          rating: review.rating,
          comment: review.publicComment || '',
        })
      const entry = progress.data() as StudentProgressEntry | undefined
      if (
        entry &&
        entry.coachId === booking.coachId &&
        entry.athleteId === booking.athleteId &&
        entry.bookingId === booking.id
      )
        evaluations.push({
          id: `progress:${progress.id}`,
          direction: 'from-coach',
          coachId: booking.coachId,
          comment: entry.note || '',
          level: formatStudentLevel(entry),
          ...(entry.result ? { result: entry.result } : {}),
        })
      return {
        id: booking.schoolClassId ? `class:${booking.schoolClassId}` : `booking:${booking.id}`,
        title:
          booking.schoolClassTitle ||
          (booking.groupType === 'grupal' ? 'Clase grupal' : 'Clase particular'),
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        location: booking.locationName || '',
        coachIds: [booking.coachId],
        status: schoolBookingHistoryStatus(booking, timezone),
        note: includeNotes ? notes.get(`${booking.id}|${booking.athleteId}`)?.note || '' : '',
        sharedComments:
          sharedCommentsBySource.get(
            `${booking.schoolClassId ? 'class' : 'booking'}:${booking.schoolClassId || booking.id}`
          ) || [],
        evaluations,
      } satisfies SchoolHistoryClass
    })
  )
  const classes: SchoolHistoryClass[] = [
    ...occurrences.map((item) => ({
      id: `class:${item.id}`,
      title: schoolClassDisplayTitle(item.title, item.type),
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location || '',
      coachIds: teacherId ? [teacherId] : item.teacherIds,
      status: schoolBookingHistoryStatus(
        {
          date: item.date,
          endTime: item.endTime,
          status: item.status === 'cancelled' ? 'cancelled' : 'confirmed',
          attended: notes.get(`${item.id}|${student.id}`)?.attended,
        },
        timezone
      ),
      note: includeNotes ? notes.get(`${item.id}|${student.id}`)?.note || '' : '',
      sharedComments: sharedCommentsBySource.get(`class:${item.id}`) || [],
      evaluations: reviews
        .filter((review) => review.occurrenceId === item.id)
        .map((review) => ({
          id: `review:${review.id}`,
          direction:
            review.reviewerRole === 'teacher' ? ('from-coach' as const) : ('to-coach' as const),
          coachId: String(review.teacherId),
          rating: Number(review.rating),
          comment: String(review.comment || ''),
        })),
    })),
  ]
  for (const detail of details) {
    const existing = classes.find((item) => item.id === detail.id)
    if (existing) {
      existing.coachIds = [...new Set([...existing.coachIds, ...detail.coachIds])]
      if (!existing.note) existing.note = detail.note
      existing.sharedComments.push(...detail.sharedComments)
      existing.evaluations.push(...detail.evaluations)
    } else classes.push(detail)
  }
  const coachIds = [...new Set(classes.flatMap((item) => item.coachIds))]
  const authorIds = [
    ...new Set(
      classes
        .flatMap((item) => item.sharedComments.map((comment) => comment.authorId))
        .filter(Boolean)
    ),
  ]
  const names = await Promise.all(
    [...new Set([...coachIds, ...authorIds])].map(async (id) => {
      const [user, profile] = await Promise.all([
        adminDb.collection('users').doc(id).get(),
        adminDb.collection('schoolProfiles').doc(`${student.schoolId}_${id}`).get(),
      ])
      return [id, profile.data()?.name || publicNameFromUser(user.data())] as const
    })
  )
  const coachNames = Object.fromEntries(names)
  for (const item of classes)
    item.sharedComments
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((comment) => {
        comment.authorName = coachNames[comment.authorId] || 'Profesor'
      })
  return {
    classes: classes.sort((a, b) =>
      `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)
    ),
    coachNames,
  }
}
