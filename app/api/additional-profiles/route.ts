import { NextResponse } from 'next/server'
import { validProfileBirthDate } from '@/lib/additional-profile'
import { createAdditionalProfile, listAdditionalProfiles } from '@/lib/server/additional-profiles'
import { getSchoolCaller } from '@/lib/server/school-access'

export async function GET(request: Request) {
  const caller = await getSchoolCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  try {
    return NextResponse.json({ profiles: await listAdditionalProfiles(caller.uid) })
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar tus Adicionales.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const caller = await getSchoolCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const birthDate = typeof body.birthDate === 'string' ? body.birthDate : ''
  const gender = body.gender
  if (
    name.length < 2 ||
    !validProfileBirthDate(birthDate) ||
    !['varonil', 'femenil', 'otro'].includes(gender)
  )
    return NextResponse.json(
      { error: 'Completa el nombre, una fecha de nacimiento válida y el género.' },
      { status: 400 }
    )
  try {
    return NextResponse.json(
      { profile: await createAdditionalProfile(caller.uid, { name, birthDate, gender }) },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'No se pudo crear el Adicional. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
