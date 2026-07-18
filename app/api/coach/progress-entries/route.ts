import { NextResponse } from 'next/server'
import { bookingProgressEntryId, type StudentProgressEntry } from '@/lib/coach-student-progress'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

/** Progress entry anchored to a booking, if any: GET ?bookingId=… → { entry: … | null } */
export async function GET(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const caller = await adminAuth.verifyIdToken(token)

  const bookingId = new URL(request.url).searchParams.get('bookingId') || ''
  if (!bookingId) {
    return NextResponse.json({ error: 'Clase inválida.' }, { status: 400 })
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
