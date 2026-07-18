import { NextResponse } from 'next/server'
import { bookingProgressEntryId, type StudentProgressEntry } from '@/lib/coach-student-progress'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

/**
 * GET ?bookingId=… → { entry: … | null } (progress entry anchored to that class).
 * GET without params → { bookingIds: string[] } (classes of this coach that
 * already have progress, so the agenda can label its buttons).
 */
export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const caller = await adminAuth.verifyIdToken(token)

  const bookingId = new URL(request.url).searchParams.get('bookingId') || ''
  if (!bookingId) {
    const snapshot = await adminDb
      .collection('coachStudentProgressEntries')
      .where('coachId', '==', caller.uid)
      .get()
    const bookingIds = snapshot.docs
      .map((doc) => (doc.data() as StudentProgressEntry).bookingId)
      .filter((value): value is string => Boolean(value))
    return NextResponse.json({ bookingIds })
  }

  const snapshot = await adminDb
    .collection('coachStudentProgressEntries')
    .doc(bookingProgressEntryId(bookingId))
    .get()
  const entry = snapshot.data() as StudentProgressEntry | undefined

  if (entry && entry.coachId !== caller.uid) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  return NextResponse.json({ entry: entry || null })
}
