import { NextResponse } from 'next/server'
import { normalizeClassTraining } from '@/lib/class-training'
import { type SchoolMembership, schoolMembershipHasRole } from '@/lib/school'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { getBearerToken, getSchoolMembership } from '@/lib/server/school-access'
import { getSchoolClassOccurrence } from '@/lib/server/school-classes'
import { listSchoolStudents } from '@/lib/server/school-students'

function notFound() {
  return NextResponse.json({ error: 'No encontramos el entreno de esta clase.' }, { status: 404 })
}

export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 })

  let caller: { uid: string }
  try {
    caller = await adminAuth.verifyIdToken(token, true)
  } catch {
    return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 })
  }

  const query = new URL(request.url).searchParams
  const bookingId = query.get('bookingId') || ''
  const schoolId = query.get('schoolId') || ''
  const schoolClassId = query.get('schoolClassId') || ''
  const requestedCoachId = query.get('coachId') || ''
  const requestedDate = query.get('date') || ''
  const requestedStartTime = query.get('startTime') || ''

  if (
    bookingId.length > 256 ||
    schoolId.length > 256 ||
    schoolClassId.length > 256 ||
    requestedCoachId.length > 128 ||
    [bookingId, schoolId, schoolClassId, requestedCoachId].some((value) => value.includes('/'))
  )
    return notFound()

  try {
    let noteRef: FirebaseFirestore.DocumentReference | null = null

    if (schoolId) {
      const membership = await getSchoolMembership(schoolId, caller.uid)
      if (
        !membership ||
        membership.status !== 'active' ||
        !schoolMembershipHasRole(membership as SchoolMembership, 'student')
      )
        return notFound()

      const students = await listSchoolStudents(schoolId, caller.uid)
      const participantIds = new Set(
        students.flatMap((student) =>
          [student.id, student.studentUserId, student.additionalProfileId].filter(
            (id): id is string => Boolean(id)
          )
        )
      )

      if (schoolClassId) {
        const occurrence = await getSchoolClassOccurrence(schoolId, schoolClassId)
        if (
          !occurrence ||
          occurrence.status !== 'scheduled' ||
          occurrence.date !== requestedDate ||
          occurrence.startTime !== requestedStartTime ||
          !occurrence.teacherIds.includes(requestedCoachId) ||
          !occurrence.studentIds.some((studentId) => participantIds.has(studentId))
        )
          return notFound()

        noteRef = adminDb
          .collection('schoolClassNotes')
          .doc(
            encodeURIComponent(
              `${schoolId}|${requestedCoachId}|${occurrence.date}|${occurrence.startTime}`
            )
          )
      } else {
        if (!bookingId || bookingId.includes('/')) return notFound()
        const bookingSnapshot = await adminDb.collection('bookings').doc(bookingId).get()
        const booking = bookingSnapshot.data()
        if (
          !bookingSnapshot.exists ||
          booking?.schoolId !== schoolId ||
          !participantIds.has(String(booking?.athleteId || '')) ||
          booking?.status !== 'confirmed' ||
          booking?.coachId !== requestedCoachId ||
          booking?.date !== requestedDate ||
          booking?.startTime !== requestedStartTime
        )
          return notFound()

        noteRef = adminDb
          .collection('schoolClassNotes')
          .doc(
            encodeURIComponent(
              `${schoolId}|${requestedCoachId}|${requestedDate}|${requestedStartTime}`
            )
          )
      }
    } else {
      if (!bookingId || bookingId.includes('/')) return notFound()
      const bookingSnapshot = await adminDb.collection('bookings').doc(bookingId).get()
      const booking = bookingSnapshot.data()
      if (
        !bookingSnapshot.exists ||
        booking?.athleteId !== caller.uid ||
        booking?.schoolId ||
        booking?.status !== 'confirmed'
      )
        return notFound()

      noteRef = adminDb
        .collection('coachClassNotes')
        .doc(encodeURIComponent(`${booking.coachId}|${booking.date}|${booking.startTime}`))
    }

    if (!noteRef) return notFound()
    const snapshot = await noteRef.get()
    return NextResponse.json(
      { training: normalizeClassTraining(snapshot.data()?.training || []) || [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json(
      { error: 'No pudimos cargar el entreno de esta clase.' },
      { status: 500 }
    )
  }
}
