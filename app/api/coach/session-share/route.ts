import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { normalizeClassTraining } from '@/lib/class-training'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requirePersonalCoach } from '@/lib/server/personal-class-access'
import { getSchoolMembership } from '@/lib/server/school-access'

export async function POST(request: Request) {
  const access = await requirePersonalCoach(request)
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  const kind = body?.kind
  if (
    !id ||
    id.length > 512 ||
    id.includes('/') ||
    !['standalone', 'class', 'schoolClass'].includes(kind)
  )
    return NextResponse.json({ error: 'No encontramos esta sesión.' }, { status: 400 })
  try {
    const collection =
      kind === 'standalone'
        ? 'coachStandaloneSessions'
        : kind === 'schoolClass'
          ? 'schoolClassNotes'
          : 'coachClassNotes'
    const snapshot = await adminDb.collection(collection).doc(id).get()
    const data = snapshot.data()
    if (!data || data.coachId !== access.uid)
      return NextResponse.json({ error: 'No encontramos esta sesión.' }, { status: 404 })
    if (kind === 'schoolClass') {
      const membership =
        typeof data.schoolId === 'string'
          ? await getSchoolMembership(data.schoolId, access.uid)
          : null
      if (
        !membership ||
        membership.status !== 'active' ||
        (!schoolMembershipHasRole(membership, 'teacher') &&
          !schoolMembershipHasRole(membership, 'director'))
      )
        return NextResponse.json({ error: 'No tienes acceso a esta sesión.' }, { status: 403 })
    }
    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    await adminDb
      .collection('sharedTrainingSessions')
      .doc(tokenHash)
      .create({
        title: typeof data.title === 'string' && data.title.trim() ? data.title : 'Entrenamiento',
        description: typeof data.description === 'string' ? data.description : '',
        training: normalizeClassTraining(data.training || []) || [],
        createdBy: access.uid,
        createdAt: Date.now(),
      })
    return NextResponse.json({ token }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'No se pudo compartir la sesión.' }, { status: 500 })
  }
}
