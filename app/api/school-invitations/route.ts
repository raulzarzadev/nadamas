import { NextResponse } from 'next/server'
import { getSchoolCaller } from '@/lib/server/school-access'
import { listSchoolInvitationsForEmail } from '@/lib/server/school-invitations'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const caller = await getSchoolCaller(request)
  if (!caller) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  try {
    const invitations = await listSchoolInvitationsForEmail(caller.email || '')
    const schools = await Promise.all(
      invitations.map(
        async (invitation) =>
          [invitation.schoolId, await getSchoolById(invitation.schoolId)] as const
      )
    )
    const schoolNames = new Map(
      schools.map(([schoolId, school]) => [schoolId, school?.name || 'Escuela Nadamas'])
    )
    return NextResponse.json({
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        schoolId: invitation.schoolId,
        schoolName: schoolNames.get(invitation.schoolId) || 'Escuela Nadamas',
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        studentData: invitation.studentData || null,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar las invitaciones.' }, { status: 500 })
  }
}
