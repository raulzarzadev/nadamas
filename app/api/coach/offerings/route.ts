import { NextResponse } from 'next/server'
import type { CoachClassOffering, CoachPublic } from '@/firebase/coaches/coach.model'
import { type SchoolMembership, schoolMembershipHasRole } from '@/lib/school'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { getSchoolMembership } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

async function handlePOST(request: Request) {
  const token = getBearerToken(request)
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })

  const caller = await adminAuth.verifyIdToken(token)
  const userDoc = await adminDb.collection('users').doc(caller.uid).get()
  const isAdmin = userDoc.data()?.roles?.admin === true
  if (userDoc.data()?.roles?.coach !== true && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const body = (await request.json()) as {
    classOfferings?: CoachClassOffering[]
    schoolId?: string
    coachId?: string
  }
  if (!Array.isArray(body.classOfferings)) {
    return NextResponse.json({ error: 'La configuración de clases es inválida.' }, { status: 400 })
  }

  const requestedCoachId = typeof body.coachId === 'string' ? body.coachId.trim() : ''
  if (requestedCoachId && requestedCoachId !== caller.uid && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }
  const coachId = isAdmin && requestedCoachId ? requestedCoachId : caller.uid

  const schoolId = typeof body.schoolId === 'string' ? body.schoolId.trim() : ''
  if (schoolId) {
    const membership = await getSchoolMembership(schoolId, coachId)
    if (
      !isAdmin &&
      (!membership ||
        membership.status !== 'active' ||
        !schoolMembershipHasRole(membership as SchoolMembership, 'teacher'))
    ) {
      return NextResponse.json({ error: 'No autorizado para esta escuela.' }, { status: 403 })
    }
  }

  const coachRef = adminDb.collection('coaches').doc(coachId)
  const coachDoc = await coachRef.get()
  if (isAdmin && !coachDoc.exists) {
    return NextResponse.json({ error: 'Coach no encontrado.' }, { status: 404 })
  }
  const now = Date.now()
  if (schoolId) {
    const schoolOfferingsRef = adminDb
      .collection('schoolCoachOfferings')
      .doc(`${schoolId}_${coachId}`)
    await schoolOfferingsRef.set(
      {
        schoolId,
        coachId,
        classOfferings: body.classOfferings,
        updatedAt: now,
      },
      { merge: true }
    )
    return NextResponse.json({ ok: true })
  }
  const data: Partial<CoachPublic> = {
    classOfferings: body.classOfferings,
    userId: coachId,
    updatedAt: now,
  }
  if (!coachDoc.exists) data.createdAt = now

  await coachRef.set(data, { merge: true })
  return NextResponse.json({ ok: true })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
