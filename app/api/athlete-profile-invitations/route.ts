import { NextResponse } from 'next/server'
import { listProfileInvitationNotifications } from '@/lib/server/athlete-profile-invitations'
import { getSchoolCaller } from '@/lib/server/school-access'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const caller = await getSchoolCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  try {
    return NextResponse.json(
      { notifications: await listProfileInvitationNotifications(caller) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json({ error: 'No pudimos cargar las invitaciones.' }, { status: 500 })
  }
}
