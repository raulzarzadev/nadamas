import { NextResponse } from 'next/server'
import { DEFAULT_SCHOOL_TIMEZONE } from '@/lib/school'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { getSchoolById, updateSchoolProfile, validateSchoolInput } from '@/lib/server/schools'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response

  const current = await getSchoolById(schoolId)
  if (!current) return NextResponse.json({ error: 'Escuela no encontrada.' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const slug = access.globalAdmin
    ? typeof body.slug === 'string'
      ? body.slug
      : current.slug
    : current.slug
  const logoUrl = Object.hasOwn(body, 'logoUrl')
    ? typeof body.logoUrl === 'string'
      ? body.logoUrl
      : body.logoUrl === null
        ? null
        : current.logoUrl
    : current.logoUrl
  const validation = validateSchoolInput({
    name: typeof body.name === 'string' ? body.name : current.name,
    slug,
    description:
      typeof body.description === 'string' ? body.description : current.description || '',
    timezone:
      typeof body.timezone === 'string'
        ? body.timezone
        : current.timezone || DEFAULT_SCHOOL_TIMEZONE,
    logoUrl,
    palette: body.palette ?? current.palette,
    showCoaches:
      typeof body.showCoaches === 'boolean' ? body.showCoaches : current.showCoaches === true,
    showCoachesSchedules:
      typeof body.showCoachesSchedules === 'boolean'
        ? body.showCoachesSchedules
        : current.showCoachesSchedules === true,
    showStudents:
      typeof body.showStudents === 'boolean' ? body.showStudents : current.showStudents === true,
  })
  if (!validation.ok) {
    const messages = {
      name: 'Escribe un nombre de escuela válido.',
      slug: 'El slug actual de la escuela no es válido.',
      description: 'La descripción es demasiado larga.',
      timezone: 'Selecciona una zona horaria válida.',
      logo: 'El logo actual no es válido.',
      palette: 'Selecciona una paleta válida.',
    } as const
    return NextResponse.json({ error: messages[validation.reason] }, { status: 400 })
  }

  try {
    const school = await updateSchoolProfile(schoolId, validation.value)
    return NextResponse.json({ school })
  } catch (error) {
    if (error instanceof Error && error.message === 'SCHOOL_SLUG_TAKEN') {
      return NextResponse.json({ error: 'Ese slug ya está en uso.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No se pudo actualizar la escuela.' }, { status: 500 })
  }
}
