import { NextResponse } from 'next/server'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { createSchoolStudent } from '@/lib/server/school-students'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
  if (name.length < 2)
    return NextResponse.json({ error: 'Escribe el nombre del alumno.' }, { status: 400 })
  try {
    const student = await createSchoolStudent({
      schoolId,
      name,
      birthDate: '',
      gender: 'otro',
      guardianEmail: '',
      guardianName: '',
      guardianRelationship: '',
      guardianPhone: '',
    })
    return NextResponse.json({ student }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'No pudimos crear el alumno.' }, { status: 500 })
  }
}
