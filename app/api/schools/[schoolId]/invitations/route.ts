import { NextResponse } from 'next/server'
import { sendSchoolInvitationEmail } from '@/lib/server/emails'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { createSchoolInvitation, listSchoolInvitations } from '@/lib/server/school-invitations'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response

  try {
    return NextResponse.json({ invitations: await listSchoolInvitations(schoolId) })
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar las invitaciones.' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response

  const body = (await request.json().catch(() => ({}))) as { email?: unknown; role?: unknown }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role = body.role === 'teacher' || body.role === 'student' ? body.role : null
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Escribe un correo válido.' }, { status: 400 })
  }
  if (!role)
    return NextResponse.json({ error: 'Selecciona a quién quieres invitar.' }, { status: 400 })

  const school = await getSchoolById(schoolId)
  if (!school) return NextResponse.json({ error: 'Escuela no encontrada.' }, { status: 404 })

  try {
    const { invitation, token } = await createSchoolInvitation({
      schoolId,
      email,
      role,
      invitedBy: access.caller.uid,
    })
    const siteUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
        : new URL(request.url).origin
    const invitationPath =
      role === 'student' ? `/athlete/invitations/${token}` : `/school/invitations/${token}`
    const inviteUrl = `${siteUrl}${invitationPath}`

    try {
      await sendSchoolInvitationEmail({ email, schoolName: school.name, role, inviteUrl })
    } catch (error) {
      console.error('[SCHOOL_INVITATION_EMAIL]', error)
    }

    return NextResponse.json({ invitation, inviteUrl }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'No se pudo crear la invitación.' }, { status: 500 })
  }
}
