import { NextResponse } from 'next/server'
import { isSafeSchoolUrl, type SchoolLocation } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'

export const runtime = 'nodejs'
interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, [
    'director',
    'teacher',
    'guardian',
    'student',
  ])
  if (access.response) return access.response
  const snapshot = await adminDb
    .collection('schoolLocations')
    .where('schoolId', '==', schoolId)
    .get()
  const locations = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<SchoolLocation, 'id'>) }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return NextResponse.json({ locations })
}

export async function POST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const mapUrl = typeof body.mapUrl === 'string' ? body.mapUrl.trim().slice(0, 500) : ''
  if (name.length < 2)
    return NextResponse.json({ error: 'Escribe un nombre para la instalación.' }, { status: 400 })
  if (!isSafeSchoolUrl(mapUrl))
    return NextResponse.json({ error: 'El enlace de ubicación no es válido.' }, { status: 400 })
  const ref = adminDb.collection('schoolLocations').doc()
  const location: SchoolLocation = {
    id: ref.id,
    schoolId,
    name,
    address: typeof body.address === 'string' ? body.address.trim().slice(0, 240) : '',
    mapUrl,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await ref.set(location)
  return NextResponse.json({ location }, { status: 201 })
}
