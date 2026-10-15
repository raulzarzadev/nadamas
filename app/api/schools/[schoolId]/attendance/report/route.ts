import { fromZonedTime } from 'date-fns-tz'
import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import type { Booking } from '@/lib/coach-booking'
import { localPaymentDate, paymentAvailable, paymentWeek } from '@/lib/payments/engine'
import type { PaymentAccount } from '@/lib/payments/model'
import { type SchoolClassOccurrence, schoolMembershipHasRole } from '@/lib/school'
import {
  attendanceReportClasses,
  type SchoolAttendanceReport,
} from '@/lib/school-attendance-report'
import { studentSchoolBookings } from '@/lib/school-student-history'
import { adminDb } from '@/lib/server/firebase-admin'
import { accountRef } from '@/lib/server/payments/store'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { coalesceGroupClassOccurrences } from '@/lib/server/school-agenda'
import { listSchoolStudents } from '@/lib/server/school-students'

export const runtime = 'nodejs'
export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  try {
    const director = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
    const [school, occurrences, attendance, roster, bookingSnapshot] = await Promise.all([
      adminDb.collection('schools').doc(schoolId).get(),
      adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId).get(),
      adminDb.collection('agendaStudentRecords').where('schoolId', '==', schoolId).get(),
      listSchoolStudents(schoolId),
      adminDb.collection('bookings').where('schoolId', '==', schoolId).get(),
    ])
    const timezone = school.data()?.timezone || 'America/Mexico_City'
    const today = localPaymentDate(Date.now(), timezone)
    const visibleClasses = occurrences.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as SchoolClassOccurrence)
      .filter((item) => director || item.teacherIds.includes(access.caller.uid))
    const bookings = bookingSnapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as Booking)
      .filter((item) => director || item.coachId === access.caller.uid)
    const relatedIds = new Set(visibleClasses.flatMap((item) => item.studentIds))
    const students = roster.filter(
      (item) =>
        item.status === 'active' &&
        (director || relatedIds.has(item.id) || studentSchoolBookings(bookings, item).length > 0)
    )
    const classes = attendanceReportClasses(
      coalesceGroupClassOccurrences(visibleClasses),
      attendance.docs.map(
        (doc) =>
          doc.data() as {
            sourceId: string
            studentId: string
            attended?: boolean
            updatedAt?: number
          }
      ),
      timezone
    )
    const actualIds = new Set(visibleClasses.map((item) => item.id))
    const bookingGroups = new Map<string, (typeof classes)[number]>()
    for (const booking of bookings) {
      if (
        booking.status === 'cancelled' ||
        (booking.schoolClassId && actualIds.has(booking.schoolClassId)) ||
        fromZonedTime(`${booking.date}T${booking.endTime}`, timezone).getTime() > Date.now()
      )
        continue
      const key = `${booking.coachId}|${booking.date}|${booking.startTime}|${booking.endTime}`
      let group = bookingGroups.get(key)
      if (!group) {
        group = {
          id: `booking:${booking.id}`,
          bookingCoachId: booking.coachId,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          title: booking.schoolClassTitle || 'Clase',
          studentIds: [],
          attendedStudentIds: [],
          enrolled: 0,
          attended: 0,
        }
        bookingGroups.set(key, group)
      }
      for (const student of students) {
        if (!studentSchoolBookings([booking], student).length) continue
        if (!group.studentIds.includes(student.id)) group.studentIds.push(student.id)
        if (booking.attended === true && !group.attendedStudentIds.includes(student.id))
          group.attendedStudentIds.push(student.id)
      }
      group.enrolled = group.studentIds.length
      group.attended = group.attendedStudentIds.length
    }
    classes.push(...bookingGroups.values())
    classes.sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
    const accounts = students.length
      ? await adminDb.getAll(
          ...students.map((student) => accountRef(`school:${schoolId}`, student.id))
        )
      : []
    const payload: SchoolAttendanceReport = {
      today,
      classes,
      students: students
        .map((student, index) => {
          const attended = classes.filter((item) => item.attendedStudentIds.includes(student.id))
          const account = (accounts[index]?.data() as PaymentAccount | undefined) || { grants: [] }
          const active = account.grants.filter(
            (grant) => grant.startsOn <= today && (!grant.endsBefore || today < grant.endsBefore)
          )
          const expirations = active
            .flatMap((grant) => (grant.endsBefore ? [grant.endsBefore] : []))
            .sort()
          return {
            id: student.id,
            name: student.name,
            month: attended.filter((item) => item.date.slice(0, 7) === today.slice(0, 7)).length,
            week: attended.filter((item) => paymentWeek(item.date) === paymentWeek(today)).length,
            today: attended.filter((item) => item.date === today).length,
            expiresOn:
              expirations[0] ||
              account.grants
                .filter(
                  (grant) =>
                    grant.startsOn <= today && grant.endsBefore && grant.endsBefore <= today
                )
                .map((grant) => grant.endsBefore as string)
                .sort()
                .at(-1) ||
              null,
            remaining: account.grants.some((grant) => grant.product.mode === 'classes')
              ? paymentAvailable(account, today)
              : null,
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    reportServerError('ATTENDANCE_REPORT_READ', error, request)
    return NextResponse.json(
      { error: 'No pudimos cargar los pases de lista. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
