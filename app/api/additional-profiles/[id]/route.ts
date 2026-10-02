import { NextResponse } from 'next/server'
import { validProfileBirthDate } from '@/lib/additional-profile'
import { updateAdditionalProfile } from '@/lib/server/additional-profiles'
import { getSchoolCaller } from '@/lib/server/school-access'

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const caller = await getSchoolCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const birthDate = typeof body.birthDate === 'string' ? body.birthDate.trim() : ''
  const gender = body.gender
  if (
    name.length < 2 ||
    (birthDate !== '' && !validProfileBirthDate(birthDate)) ||
    !['varonil', 'femenil', 'otro'].includes(gender)
  ) {
    return NextResponse.json(
      { error: 'Revisa el nombre, la fecha de nacimiento y el género.' },
      { status: 400 }
    )
  }

  try {
    const profile = await updateAdditionalProfile(caller.uid, id, {
      name,
      birthDate,
      gender,
    })
    if (!profile) return NextResponse.json({ error: 'Adicional no encontrado.' }, { status: 404 })
    return NextResponse.json({ profile })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo actualizar el Adicional. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
