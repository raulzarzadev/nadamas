import { NextResponse } from 'next/server'
import { schoolMembershipHasRole } from '@/lib/school'
import { visibleSchoolContacts } from '@/lib/school-contact'
import { getSchoolCaller, getSchoolMembership } from '@/lib/server/school-access'
import { getSchoolById } from '@/lib/server/schools'

export async function GET(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params
  const school = await getSchoolById(schoolId)
  if (!school) return NextResponse.json({ error: 'Escuela no encontrada.' }, { status: 404 })
  const caller = await getSchoolCaller(request)
  const membership = caller ? await getSchoolMembership(schoolId, caller.uid) : null
  const active = membership?.status === 'active'
  if (!school.isPublic && !active)
    return NextResponse.json({ error: 'No tienes acceso a esta escuela.' }, { status: 403 })
  return NextResponse.json(
    {
      contacts: visibleSchoolContacts(
        school.contacts,
        active
          ? {
              director: schoolMembershipHasRole(membership, 'director'),
              student: schoolMembershipHasRole(membership, 'student'),
              teacher: schoolMembershipHasRole(membership, 'teacher'),
            }
          : {}
      ),
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
