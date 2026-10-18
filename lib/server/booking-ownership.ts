import type { Booking } from '@/lib/coach-booking'
import { schoolMembershipHasRole } from '@/lib/school'
import { getSchoolMembership } from './school-access'
import { listSchoolStudents } from './school-students'

export async function bookingBelongsToAccount(
  booking: Pick<Booking, 'athleteId' | 'schoolId'>,
  uid: string
) {
  if (booking.athleteId === uid) return true
  if (!booking.schoolId) return false
  const membership = await getSchoolMembership(booking.schoolId, uid)
  if (
    !membership ||
    membership.status !== 'active' ||
    !schoolMembershipHasRole(membership, 'student')
  )
    return false
  const students = await listSchoolStudents(booking.schoolId, uid)
  return students.some((student) =>
    [student.id, student.additionalProfileId, student.studentUserId].some(
      (id) => Boolean(id) && id === booking.athleteId
    )
  )
}
