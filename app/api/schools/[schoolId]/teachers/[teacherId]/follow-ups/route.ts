import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/coach-booking'
import { type SchoolClassOccurrence, schoolMembershipHasRole } from '@/lib/school'
import { teacherClassFollowUps } from '@/lib/school-teacher-follow-ups'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'

export const runtime = 'nodejs'
export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolId: string; teacherId: string }> }
) {
  const { schoolId, teacherId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  if (
    !access.globalAdmin &&
    !schoolMembershipHasRole(access.membership, 'director') &&
    teacherId !== access.caller.uid
  )
    return NextResponse.json(
      { error: 'No tienes permiso para ver estos seguimientos.' },
      { status: 403 }
    )
  try {
    const [bookings, classes, notes] = await Promise.all([
      adminDb.collection('bookings').where('schoolId', '==', schoolId).get(),
      adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId).get(),
      adminDb.collection('schoolClassNotes').where('schoolId', '==', schoolId).get(),
    ])
    const rows = teacherClassFollowUps({
      coachId: teacherId,
      bookings: bookings.docs.map((doc) => doc.data() as Booking),
      classes: classes.docs.map((doc) => doc.data() as SchoolClassOccurrence),
      notes: notes.docs.map(
        (doc) => doc.data() as { coachId: string; date: string; startTime: string; note?: string }
      ),
    })
    return NextResponse.json(
      { classes: rows },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json(
      { error: 'No pudimos cargar los seguimientos. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
