import { NextResponse } from 'next/server'
import type { SchoolBookingMode } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response
  const snapshot = await adminDb.collection('schools').doc(schoolId).get()
  if (!snapshot.exists)
    return NextResponse.json({ error: 'Escuela no encontrada.' }, { status: 404 })
  return NextResponse.json({
    bookingMode: snapshot.data()?.bookingMode === 'direct' ? 'direct' : 'request',
  })
}

async function handlePATCH(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = (await request.json().catch(() => ({}))) as { bookingMode?: unknown }
  const bookingMode: SchoolBookingMode | null =
    body.bookingMode === 'direct' || body.bookingMode === 'request' ? body.bookingMode : null
  if (!bookingMode) return NextResponse.json({ error: 'Configuración inválida.' }, { status: 400 })
  await adminDb.collection('schools').doc(schoolId).update({ bookingMode, updatedAt: Date.now() })
  return NextResponse.json({ bookingMode })
}

export const PATCH = withSchoolAgendaUpdate(handlePATCH)
