import { NextResponse } from 'next/server'
import { createNotification } from '@/lib/server/notifications'
import { getSchoolCaller } from '@/lib/server/school-access'
import {
  acceptSchoolInvitation,
  getInvitationByIdForEmail,
  getInvitationByToken,
} from '@/lib/server/school-invitations'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ token: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { token } = await params
  const caller = await getSchoolCaller(request)
  const invitation =
    (await getInvitationByToken(token)) ||
    (caller ? await getInvitationByIdForEmail(token, caller.email || '') : null)
  if (!invitation) return NextResponse.json({ error: 'Invitación no encontrada.' }, { status: 404 })
  const school = await getSchoolById(invitation.schoolId)
  if (!school) return NextResponse.json({ error: 'Escuela no encontrada.' }, { status: 404 })
  const status =
    invitation.status === 'pending' && invitation.expiresAt <= Date.now()
      ? 'expired'
      : invitation.status
  return NextResponse.json({
    invitation: {
      schoolId: invitation.schoolId,
      schoolName: school.name,
      schoolLogoUrl: school.logoUrl || null,
      terminology: school.terminology,
      role: invitation.role,
      email: invitation.email,
      status,
      acceptedByCurrentUser: invitation.acceptedBy === caller?.uid,
      expiresAt: invitation.expiresAt,
      studentId: invitation.studentId || null,
      studentData: invitation.studentData || null,
    },
  })
}

export async function POST(request: Request, { params }: RouteProps) {
  const caller = await getSchoolCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const { token } = await params
  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown
    phone?: unknown
    relationship?: unknown
    bio?: unknown
    birthDate?: unknown
    gender?: unknown
    guardianName?: unknown
    guardianRelationship?: unknown
    guardianPhone?: unknown
    additionalProfileId?: unknown
    participantIds?: unknown
    useInvitationData?: unknown
  }
  const result = await acceptSchoolInvitation({
    token,
    caller,
    profile: {
      name: typeof body.name === 'string' ? body.name.slice(0, 120) : '',
      phone: typeof body.phone === 'string' ? body.phone.slice(0, 40) : '',
      relationship: typeof body.relationship === 'string' ? body.relationship.slice(0, 40) : '',
      bio: typeof body.bio === 'string' ? body.bio.slice(0, 500) : '',
      birthDate: typeof body.birthDate === 'string' ? body.birthDate : '',
      gender:
        body.gender === 'varonil' || body.gender === 'femenil' || body.gender === 'otro'
          ? body.gender
          : undefined,
      guardianName: typeof body.guardianName === 'string' ? body.guardianName.slice(0, 120) : '',
      guardianRelationship:
        typeof body.guardianRelationship === 'string' ? body.guardianRelationship.slice(0, 60) : '',
      guardianPhone: typeof body.guardianPhone === 'string' ? body.guardianPhone.slice(0, 40) : '',
      additionalProfileId:
        typeof body.additionalProfileId === 'string' ? body.additionalProfileId : '',
      participantIds: Array.isArray(body.participantIds)
        ? body.participantIds.filter((id): id is string => typeof id === 'string')
        : undefined,
      useInvitationData: body.useInvitationData === true,
    },
  })
  if (!result.ok) {
    const messages = {
      not_found: 'Invitación no encontrada.',
      accepted: 'Esta invitación ya fue aceptada.',
      expired: 'Esta invitación ya expiró.',
      revoked: 'Esta invitación fue cancelada.',
      email_mismatch: 'Inicia sesión con el correo al que se envió la invitación.',
      student_profile: 'Completa tu nombre, fecha de nacimiento y rama / género.',
      participants_required: 'Selecciona al menos un perfil para agregar a la escuela.',
      minor_requires_additional: 'Para un menor, crea y selecciona un Adicional desde Mi perfil.',
      additional_not_found: 'Selecciona un Adicional de tu cuenta.',
      student_not_found: 'El registro del alumno ya no está disponible.',
      student_already_linked: 'Este registro ya está ligado a otra cuenta.',
    } as const
    return NextResponse.json({ error: messages[result.reason] }, { status: 400 })
  }

  const school = await getSchoolById(result.schoolId)
  if (school) {
    void createNotification({
      recipientId: school.directorId,
      actorId: caller.uid,
      actorName: caller.name || caller.email || null,
      type: 'school_invitation_accepted',
      title: 'Invitación aceptada',
      body: `${caller.name || caller.email || 'Una persona'} se unió a ${school.name}.`,
      link: '/school/classes',
    }).catch(() => {})
  }
  return NextResponse.json(result)
}
