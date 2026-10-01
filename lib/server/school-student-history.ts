import 'server-only'

import type { Booking } from '@/lib/coach-booking'
import {
  bookingProgressEntryId,
  formatStudentLevel,
  type StudentProgressEntry,
} from '@/lib/coach-student-progress'
import { publicNameFromUser } from '@/lib/public-name'
import type { SchoolClassOccurrence, SchoolStudent } from '@/lib/school'
import {
  type SchoolHistoryClass,
  type SchoolHistoryEvaluation,
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

export async function getSchoolStudentHistory(
  student: SchoolStudent,
  timezone: string,
  teacherId?: string
): Promise<SchoolStudentHistory> {
  const [bookingSnapshot, classSnapshot, reviewSnapshot] = await Promise.all([
    adminDb.collection('bookings').where('schoolId', '==', student.schoolId).get(),
    adminDb.collection('schoolClassOccurrences').where('schoolId', '==', student.schoolId).get(),
    adminDb.collection('schoolReviews').where('schoolId', '==', student.schoolId).get(),
  ])
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
        evaluations,
      } satisfies SchoolHistoryClass
    })
  )
  const classes: SchoolHistoryClass[] = [
    ...occurrences.map((item) => ({
      id: `class:${item.id}`,
      title: item.title || 'Clase escolar',
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location || '',
      coachIds: teacherId ? [teacherId] : item.teacherIds,
      status:
        item.status === 'completed'
          ? ('taken' as const)
          : item.status === 'cancelled'
            ? ('cancelled' as const)
            : ('scheduled' as const),
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
      existing.evaluations.push(...detail.evaluations)
    } else classes.push(detail)
  }
  const coachIds = [...new Set(classes.flatMap((item) => item.coachIds))]
  const names = await Promise.all(
    coachIds.map(async (id) => {
      const [user, profile] = await Promise.all([
        adminDb.collection('users').doc(id).get(),
        adminDb.collection('schoolProfiles').doc(`${student.schoolId}_${id}`).get(),
      ])
      return [id, profile.data()?.name || publicNameFromUser(user.data())] as const
    })
  )
  return {
    classes: classes.sort((a, b) =>
      `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)
    ),
    coachNames: Object.fromEntries(names),
  }
}
