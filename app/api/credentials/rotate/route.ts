import { NextResponse } from 'next/server'
import { getIdentityProfile, rotateAthleteCredential } from '@/lib/server/athlete-identities'
import { getSchoolCaller } from '@/lib/server/school-access'

export async function POST(request: Request) {
  const caller = await getSchoolCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (
    !body ||
    (body.profileId !== undefined &&
      (typeof body.profileId !== 'string' || !body.profileId || body.profileId.includes('/')))
  )
    return NextResponse.json({ error: 'Selecciona un perfil válido.' }, { status: 400 })
  const profileId = body.profileId || caller.uid
  const profileType = profileId === caller.uid ? 'user' : 'additional'
  try {
    const identity = await rotateAthleteCredential(caller.uid, profileType, profileId)
    if (!identity) return NextResponse.json({ error: 'No se encontró el perfil.' }, { status: 404 })
    return NextResponse.json(
      { credential: await getIdentityProfile(identity) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json(
      { error: 'No se pudo renovar la credencial. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
