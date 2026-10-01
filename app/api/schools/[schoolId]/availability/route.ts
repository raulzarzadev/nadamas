import { NextResponse } from 'next/server'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  const url = new URL(request.url)
  const teacherId = url.searchParams.get('teacherId') || access.caller.uid
  if (schoolMembershipHasRole(access.membership, 'teacher') && teacherId !== access.caller.uid) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }
  const snapshot = await adminDb
    .collection('schoolAvailability')
    .doc(`${schoolId}_${teacherId}`)
    .get()
  return NextResponse.json({
    availability: snapshot.exists ? snapshot.data() : { teacherId, weeklySlots: [] },
  })
}

export async function PUT(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  const body = (await request.json().catch(() => ({}))) as {
    teacherId?: unknown
    weeklySlots?: unknown
  }
  const teacherId = typeof body.teacherId === 'string' ? body.teacherId : access.caller.uid
  if (schoolMembershipHasRole(access.membership, 'teacher') && teacherId !== access.caller.uid) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }
  if (!Array.isArray(body.weeklySlots))
    return NextResponse.json({ error: 'Horarios inválidos.' }, { status: 400 })
  const weeklySlots = body.weeklySlots
    .filter((slot): slot is { day: number; start: string; end: string } => {
      if (!slot || typeof slot !== 'object') return false
      const item = slot as Record<string, unknown>
      return (
        Number.isInteger(item.day) &&
        Number(item.day) >= 0 &&
        Number(item.day) <= 6 &&
        typeof item.start === 'string' &&
        typeof item.end === 'string' &&
        /^\d{2}:\d{2}$/.test(item.start) &&
        /^\d{2}:\d{2}$/.test(item.end) &&
        item.start < item.end
      )
    })
    .slice(0, 50)
  const payload = { schoolId, teacherId, weeklySlots, updatedAt: Date.now() }
  await adminDb
    .collection('schoolAvailability')
    .doc(`${schoolId}_${teacherId}`)
    .set(payload, { merge: true })
  return NextResponse.json({ availability: payload })
}
