import 'server-only'
import type { Booking } from '@/lib/coach-booking'
import type { SchoolClassOccurrence, SchoolStudent } from '@/lib/school'
import { schoolStudentSummaries } from '@/lib/school-student-summary'
import { adminDb } from './firebase-admin'
import { listSchoolClasses } from './school-classes'
import { getSchoolById } from './schools'

export async function getSchoolStudentSummaries(
  schoolId: string,
  students: SchoolStudent[],
  teacherId?: string
) {
  const [classes, bookings, records, school] = await Promise.all([
    listSchoolClasses({ schoolId, teacherId }),
    adminDb.collection('bookings').where('schoolId', '==', schoolId).get(),
    adminDb.collection('agendaStudentRecords').where('schoolId', '==', schoolId).get(),
    getSchoolById(schoolId),
  ])
  return schoolStudentSummaries(
    students,
    classes as SchoolClassOccurrence[],
    bookings.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Booking),
    records.docs.map(
      (doc) =>
        doc.data() as {
          sourceId: string
          studentId: string
          coachId: string
          attended?: boolean
          updatedAt?: number
        }
    ),
    school?.timezone || 'America/Mexico_City',
    teacherId
  )
}
