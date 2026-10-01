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
  if (userDoc.data()?.roles?.coach !== true && userDoc.data()?.roles?.admin !== true) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const body = (await request.json()) as {
    classOfferings?: CoachClassOffering[]
    schoolId?: string
  }
  if (!Array.isArray(body.classOfferings)) {
    return NextResponse.json({ error: 'La configuración de clases es inválida.' }, { status: 400 })
  }

  const schoolId = typeof body.schoolId === 'string' ? body.schoolId.trim() : ''
  if (schoolId) {
    const membership = await getSchoolMembership(schoolId, caller.uid)
    if (
      !membership ||
      membership.status !== 'active' ||
      !schoolMembershipHasRole(membership as SchoolMembership, 'teacher')
    ) {
      return NextResponse.json({ error: 'No autorizado para esta escuela.' }, { status: 403 })
    }
  }

  const coachRef = adminDb.collection('coaches').doc(caller.uid)
  const coachDoc = await coachRef.get()
  const now = Date.now()
  if (schoolId) {
    const schoolOfferingsRef = adminDb
      .collection('schoolCoachOfferings')
      .doc(`${schoolId}_${caller.uid}`)
    await schoolOfferingsRef.set(
      {
        schoolId,
        coachId: caller.uid,
        classOfferings: body.classOfferings,
        updatedAt: now,
      },
      { merge: true }
    )
    return NextResponse.json({ ok: true })
  }
  const data: Partial<CoachPublic> = {
    classOfferings: body.classOfferings,
    userId: caller.uid,
    updatedAt: now,
  }
  if (!coachDoc.exists) data.createdAt = now

  await coachRef.set(data, { merge: true })
  return NextResponse.json({ ok: true })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
