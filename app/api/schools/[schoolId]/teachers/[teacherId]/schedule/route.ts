import { NextResponse } from 'next/server'
import type { CoachClassOffering } from '@/firebase/coaches/coach.model'
import { normalizeScheduleBlockInput, type ScheduleBlockInput } from '@/lib/coach-agenda'
import {
  type SchoolMembership,
  schoolMembershipHasExplicitRole,
  schoolMembershipHasRole,
  UNASSIGNED_SCHOOL_COACH_ID,
} from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { getSchoolMembership, requireSchoolAccess } from '@/lib/server/school-access'
import { schoolScheduleOwners } from '@/lib/server/school-agenda'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

type RouteProps = { params: Promise<{ schoolId: string; teacherId: string }> }

async function authorize(request: Request, params: RouteProps['params']) {
  const { schoolId, teacherId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return { response: access.response }
  if (teacherId === UNASSIGNED_SCHOOL_COACH_ID) return { schoolId, teacherId }
  const target = await getSchoolMembership(schoolId, teacherId)
  const activeTarget = target?.status === 'active'
  const isTeacher = activeTarget && schoolMembershipHasExplicitRole(target, 'teacher')
  const isDirector = activeTarget && schoolMembershipHasRole(target, 'director')
  let isDirectorFallback = false
  if (!isTeacher && isDirector) {
    const memberships = await adminDb
      .collection('schoolMemberships')
      .where('schoolId', '==', schoolId)
      .get()
    const scheduleOwners = schoolScheduleOwners(
      memberships.docs.map((doc) => doc.data() as SchoolMembership)
    )
    isDirectorFallback = scheduleOwners.some((membership) => membership.userId === teacherId)
  }
  if (!isTeacher && !isDirectorFallback) {
    return {
      response: NextResponse.json(
        { error: 'El profe no está activo en esta escuela.' },
        { status: 403 }
      ),
    }
  }
  return { schoolId, teacherId }
}

async function handlePOST(request: Request, { params }: RouteProps) {
  const access = await authorize(request, params)
  if (access.response) return access.response
  const { schoolId, teacherId } = access
  const body = (await request.json().catch(() => null)) as
    | (ScheduleBlockInput & { classOfferings?: CoachClassOffering[] })
    | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Revisa los datos del horario.' }, { status: 400 })
  }
  const now = Date.now()
  if ('classOfferings' in body) {
    if (!Array.isArray(body.classOfferings)) {
      return NextResponse.json({ error: 'Revisa los datos del horario.' }, { status: 400 })
    }
    await adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${teacherId}`).set(
      {
        schoolId,
        coachId: teacherId,
        classOfferings: body.classOfferings,
        updatedAt: now,
      },
      { merge: true }
    )
    return NextResponse.json({ ok: true })
  }
  const input = normalizeScheduleBlockInput(body)
  if (!input) return NextResponse.json({ error: 'Revisa los datos del bloqueo.' }, { status: 400 })
  const ref = adminDb.collection('coachScheduleBlocks').doc()
  const block = {
    ...input,
    id: ref.id,
    schoolId,
    coachId: teacherId,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(block)
  return NextResponse.json({ block })
}

async function handleDELETE(request: Request, { params }: RouteProps) {
  const access = await authorize(request, params)
  if (access.response) return access.response
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Bloqueo inválido.' }, { status: 400 })
  const ref = adminDb.collection('coachScheduleBlocks').doc(id)
  const snapshot = await ref.get()
  if (
    !snapshot.exists ||
    snapshot.data()?.schoolId !== access.schoolId ||
    snapshot.data()?.coachId !== access.teacherId
  ) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }
  await ref.delete()
  return NextResponse.json({ ok: true })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
export const DELETE = withSchoolAgendaUpdate(handleDELETE)
