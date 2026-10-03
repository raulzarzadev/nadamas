import { NextResponse } from 'next/server'
import { listPublicSchools } from '@/lib/server/schools'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return NextResponse.json({ schools: await listPublicSchools() })
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar las escuelas.' }, { status: 500 })
  }
}
