import { NextResponse } from 'next/server'
import { isSafeSchoolUrl } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'
interface RouteProps {
  params: Promise<{ schoolId: string; locationId: string }>
}

async function handlePATCH(request: Request, { params }: RouteProps) {
  const { schoolId, locationId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const ref = adminDb.collection('schoolLocations').doc(locationId)
  const current = await ref.get()
  if (!current.exists || current.data()?.schoolId !== schoolId)
    return NextResponse.json({ error: 'Instalación no encontrada.' }, { status: 404 })
  const mapUrl = typeof body.mapUrl === 'string' ? body.mapUrl.trim().slice(0, 500) : null
  if (mapUrl !== null && !isSafeSchoolUrl(mapUrl))
    return NextResponse.json({ error: 'El enlace de ubicación no es válido.' }, { status: 400 })
  const update = {
    ...(typeof body.name === 'string' ? { name: body.name.trim().slice(0, 120) } : {}),
    ...(typeof body.address === 'string' ? { address: body.address.trim().slice(0, 240) } : {}),
    ...(mapUrl !== null ? { mapUrl } : {}),
    updatedAt: Date.now(),
  }
  await ref.update(update)
  return NextResponse.json({ location: { id: locationId, ...current.data(), ...update } })
}

async function handleDELETE(request: Request, { params }: RouteProps) {
  const { schoolId, locationId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const ref = adminDb.collection('schoolLocations').doc(locationId)
  const current = await ref.get()
  if (!current.exists || current.data()?.schoolId !== schoolId)
    return NextResponse.json({ error: 'Instalación no encontrada.' }, { status: 404 })
  await ref.delete()
  return NextResponse.json({ ok: true })
}

export const PATCH = withSchoolAgendaUpdate(handlePATCH)
export const DELETE = withSchoolAgendaUpdate(handleDELETE)
