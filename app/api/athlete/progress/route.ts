import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/coach-booking'
import { studentProgressId } from '@/lib/coach-student-progress'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const caller = await adminAuth.verifyIdToken(token)
  const bookingsSnapshot = await adminDb
    .collection('bookings')
    .where('athleteId', '==', caller.uid)
    .get()

  const bookings = bookingsSnapshot.docs
    .map((doc) => doc.data() as Booking)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  const coachIds = [...new Set(bookings.map((booking) => booking.coachId))]
  const progressDocs = await Promise.all(
    coachIds.map((coachId) =>
      adminDb.collection('coachStudentProgress').doc(studentProgressId(coachId, caller.uid)).get()
    )
  )
  const progress = progressDocs
    .filter((doc) => doc.exists && doc.data()?.athleteId === caller.uid)
    .map((doc) => doc.data())
    .sort((a, b) => (b?.updatedAt || 0) - (a?.updatedAt || 0))

  return NextResponse.json({ bookings, progress })
}
