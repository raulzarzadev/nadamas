import { NextResponse } from 'next/server'
import {
  acceptProfileInvitation,
  findProfileInvitation,
  invitationBelongsTo,
  type ProfileInvitation,
} from '@/lib/server/athlete-profile-invitations'
import { getSchoolCaller } from '@/lib/server/school-access'
import { subscriptionErrorResponse } from '@/lib/server/subscriptions/access'
export const runtime = 'nodejs'
type Props = { params: Promise<{ token: string }> }
export async function GET(request: Request, { params }: Props) {
  try {
    const caller = await getSchoolCaller(request)
    const invitation = await findProfileInvitation((await params).token)
    const data = invitation?.data() as ProfileInvitation | undefined
    if (!caller || !data || !invitationBelongsTo(data, caller))
      return NextResponse.json(
        {
          error:
            'El enlace venció o no corresponde a tu correo. Inicia sesión con el correo de la invitación.',
        },
        { status: 403 }
      )
    return NextResponse.json(
      { email: data.email, status: data.status, profile: data.profile },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json({ error: 'No pudimos cargar la invitación.' }, { status: 400 })
  }
}
export async function POST(request: Request, { params }: Props) {
  try {
    const caller = await getSchoolCaller(request)
    if (!caller)
      return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 })
    await acceptProfileInvitation((await params).token, caller, await request.json())
    return NextResponse.json({ ok: true })
  } catch (error) {
    const limitResponse = subscriptionErrorResponse(error)
    if (limitResponse) return limitResponse
    console.error('[ATHLETE_PROFILE_INVITATION_ACCEPT]', error)
    return NextResponse.json(
      {
        error:
          'No pudimos aceptar la invitación. Revisa tus datos, el correo de tu sesión y que el enlace siga vigente.',
      },
      { status: 400 }
    )
  }
}
