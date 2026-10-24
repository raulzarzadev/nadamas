import { NextResponse } from 'next/server'
import { getPublicCoachDirectory } from '@/lib/server/public-coach-directory'

export async function GET() {
  try {
    return NextResponse.json({ coaches: await getPublicCoachDirectory() })
  } catch (error) {
    console.error('[PUBLIC_COACH_DIRECTORY]', error)
    return NextResponse.json({ coaches: [] }, { status: 500 })
  }
}
