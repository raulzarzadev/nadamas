import { NextResponse } from 'next/server'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { deleteSchoolInvitation } from '@/lib/server/school-invitations'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string; invitationId: string }>
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const { schoolId, invitationId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response

  try {
    const result = await deleteSchoolInvitation(schoolId, invitationId)
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === 'accepted'
              ? 'No puedes eliminar una invitación ya aceptada.'
              : 'Invitación no encontrada.',
        },
        { status: result.reason === 'accepted' ? 409 : 404 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar la invitación.' }, { status: 500 })
  }
}
