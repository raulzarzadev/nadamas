import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/server/firebase-admin'
import {
  createSchool,
  getOwnedSchool,
  getSchoolsForUser,
  validateSchoolInput,
} from '@/lib/server/schools'
import { tenantSlugFromHost } from '@/lib/tenant-host'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

async function getCaller(request: Request) {
  const token = getBearerToken(request)
  if (!token) return null
  try {
    return await adminAuth.verifyIdToken(token)
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const caller = await getCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  try {
    const [schools, ownedSchool] = await Promise.all([
      getSchoolsForUser(caller.uid),
      getOwnedSchool(caller.uid),
    ])
    const slug = tenantSlugFromHost(request.headers.get('host'))
    return NextResponse.json({
      schools: slug ? schools.filter((item) => item.school.slug === slug) : schools,
      ownedSchool: slug && ownedSchool?.slug !== slug ? null : ownedSchool,
    })
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar tus escuelas.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const caller = await getCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const validation = validateSchoolInput({
      name: typeof body.name === 'string' ? body.name : '',
      slug: typeof body.slug === 'string' ? body.slug : '',
      description: typeof body.description === 'string' ? body.description : '',
      timezone: typeof body.timezone === 'string' ? body.timezone : '',
      logoUrl: typeof body.logoUrl === 'string' ? body.logoUrl : null,
      palette: body.palette,
      showCoaches: typeof body.showCoaches === 'boolean' ? body.showCoaches : undefined,
      showCoachesSchedules:
        typeof body.showCoachesSchedules === 'boolean' ? body.showCoachesSchedules : undefined,
      showStudents: typeof body.showStudents === 'boolean' ? body.showStudents : undefined,
      terminology: body.terminology,
    })

    if (!validation.ok) {
      const messages = {
        contacts: 'Revisa los enlaces y contactos de la escuela.',
        name: 'Escribe un nombre de escuela válido.',
        slug: 'Elige un slug válido para tu escuela.',
        description: 'La descripción es demasiado larga.',
        timezone: 'Selecciona una zona horaria válida.',
        logo: 'El logo no es válido.',
        palette: 'Selecciona una paleta válida.',
        terminology: 'Completa los términos personalizados en singular y plural.',
      } as const
      return NextResponse.json({ error: messages[validation.reason] }, { status: 400 })
    }

    const school = await createSchool(caller.uid, validation.value)
    if (!school)
      return NextResponse.json({ error: 'No se pudo crear la escuela.' }, { status: 500 })
    return NextResponse.json({ school }, { status: 201 })
  } catch (error) {
    console.error('[SCHOOL_CREATE_API]', error)
    const code = error instanceof Error ? error.message : ''
    if (code === 'USER_ALREADY_OWNS_SCHOOL') {
      return NextResponse.json({ error: 'Ya tienes una escuela creada.' }, { status: 409 })
    }
    if (code === 'SCHOOL_SLUG_TAKEN') {
      return NextResponse.json({ error: 'Ese slug ya está en uso.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No se pudo crear la escuela.' }, { status: 500 })
  }
}
