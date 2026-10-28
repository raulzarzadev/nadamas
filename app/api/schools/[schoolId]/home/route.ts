import { NextResponse } from 'next/server'
import { visibleSchoolContacts } from '@/lib/school-contact'
import { homeSectionsOf } from '@/lib/school-home'
import { resolveSchoolPalette } from '@/lib/school-theme'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { getSchoolMemberHome } from '@/lib/server/school-member-home'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'
interface RouteProps {
  params: Promise<{ schoolId: string }>
}

function firstNameOf(user?: Record<string, unknown>) {
  for (const key of ['nickname', 'displayName', 'name']) {
    const value = user?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim().split(/\s+/)[0]
  }
  return ''
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId)
  if (access.response) return access.response
  const school = await getSchoolById(schoolId)
  if (!school) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })
  const user = await adminDb.collection('users').doc(access.caller.uid).get()
  const userData = user.data()
  const greetingName = firstNameOf(userData)
  const home = await getSchoolMemberHome(school, { uid: access.caller.uid, name: greetingName })
  return NextResponse.json({
    school: {
      id: school.id,
      name: school.name,
      slug: school.slug,
      description: school.description,
      logoUrl: school.logoUrl ?? null,
      coverUrl: school.coverUrl ?? null,
      palette: resolveSchoolPalette(school),
      gallery: school.gallery ?? [],
      homeSections: homeSectionsOf(school),
      contacts: visibleSchoolContacts(school.contacts),
    },
    ...home,
  })
}
