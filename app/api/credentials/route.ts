import { NextResponse } from 'next/server'
import { listOwnedCredentials } from '@/lib/server/athlete-identities'
import { getSchoolCaller } from '@/lib/server/school-access'

export async function GET(request: Request) {
  const caller = await getSchoolCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  try {
    return NextResponse.json(
      { credentials: await listOwnedCredentials(caller.uid) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cargar tu credencial. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
