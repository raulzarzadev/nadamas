import { NextResponse } from 'next/server'
import { publicNameFromUser } from '@/lib/public-name'
import {
  normalizeSchoolMembership,
  type SchoolMembership,
  schoolMembershipHasRole,
} from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { getSchoolCaller, requireSchoolAccess } from '@/lib/server/school-access'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'
type Props = { params: Promise<{ schoolId: string }> }
const failure = () =>
  NextResponse.json({ error: 'No pudimos completar la solicitud.' }, { status: 500 })

export async function GET(request: Request, { params }: Props) {
  const { schoolId } = await params
  try {
    if (new URL(request.url).searchParams.get('review') === 'true') {
      const access = await requireSchoolAccess(request, schoolId, ['director'])
      if (access.response) return access.response
      const rows = await adminDb
        .collection('schoolAccessRequests')
        .where('schoolId', '==', schoolId)
        .get()
      return NextResponse.json({
        requests: rows.docs.map((doc) => doc.data()).filter((item) => item.status === 'pending'),
      })
    }
    const caller = await getSchoolCaller(request)
    if (!caller) return NextResponse.json({}, { status: 401 })
    const row = await adminDb
      .collection('schoolAccessRequests')
      .doc(`${schoolId}_${caller.uid}`)
      .get()
    return NextResponse.json({ request: row.data() || null })
  } catch {
    return failure()
  }
}

export async function POST(request: Request, { params }: Props) {
  const { schoolId } = await params
  try {
    const caller = await getSchoolCaller(request)
    if (!caller) return NextResponse.json({}, { status: 401 })
    const school = await getSchoolById(schoolId)
    if (!school) return NextResponse.json({}, { status: 404 })
    const profile = await adminDb.collection('users').doc(caller.uid).get()
    const name = publicNameFromUser({ ...profile.data(), email: caller.email || '' })
    const ref = adminDb.collection('schoolAccessRequests').doc(`${schoolId}_${caller.uid}`)
    const result = await adminDb.runTransaction(async (tx) => {
      const [previous, member] = await Promise.all([
        tx.get(ref),
        tx.get(adminDb.collection('schoolMemberships').doc(ref.id)),
      ])
      if (member.data()?.status === 'suspended') return { blocked: true, created: false }
      if (
        member.exists &&
        member.data()?.status === 'active' &&
        schoolMembershipHasRole(
          normalizeSchoolMembership(member.data() as SchoolMembership),
          'student'
        )
      )
        return { blocked: false, created: false, request: { status: 'approved' } }
      if (previous.data()?.status === 'pending')
        return { blocked: false, created: false, request: previous.data() }
      const now = Date.now()
      const entry = {
        id: ref.id,
        schoolId,
        userId: caller.uid,
        name,
        email: caller.email || '',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      }
      tx.set(ref, entry)
      return { blocked: false, created: true, request: entry }
    })
    if (result.blocked)
      return NextResponse.json(
        { error: 'Contacta a la escuela para revisar tu acceso.' },
        { status: 403 }
      )
    if (result.created)
      await createNotification({
        recipientId: school.directorId,
        actorId: caller.uid,
        type: 'school_access_requested',
        title: 'Solicitud de acceso',
        body: `${name} solicita compartir su perfil de atleta con ${school.name}.`,
        link: '/school/students',
      }).catch(() => {})
    return NextResponse.json({ request: result.request })
  } catch {
    return failure()
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const { schoolId } = await params
  try {
    const access = await requireSchoolAccess(request, schoolId, ['director'])
    if (access.response) return access.response
    const body = await request.json()
    if (
      typeof body.userId !== 'string' ||
      !body.userId ||
      body.userId.includes('/') ||
      !['approved', 'rejected'].includes(body.status)
    )
      return NextResponse.json({}, { status: 400 })
    const ref = adminDb.collection('schoolAccessRequests').doc(`${schoolId}_${body.userId}`)
    const result = await adminDb.runTransaction(async (tx) => {
      const memberRef = adminDb.collection('schoolMemberships').doc(ref.id)
      const studentRef = adminDb.collection('schoolStudents').doc(ref.id)
      const [row, member, student, roster] = await Promise.all([
        tx.get(ref),
        tx.get(memberRef),
        tx.get(studentRef),
        tx.get(adminDb.collection('schoolStudents').where('schoolId', '==', schoolId)),
      ])
      const entry = row.data()
      if (!entry || entry.schoolId !== schoolId || entry.userId !== body.userId) return false
      if (entry.status !== 'pending' || member.data()?.status === 'suspended') return false
      const now = Date.now()
      if (body.status === 'approved') {
        const current = member.exists
          ? normalizeSchoolMembership(member.data() as SchoolMembership)
          : null
        const roles = [
          ...new Set([...(current?.roles || []), ...(current ? [current.role] : []), 'student']),
        ]
        tx.set(
          memberRef,
          {
            id: ref.id,
            schoolId,
            userId: entry.userId,
            role: current?.role || 'student',
            roles,
            status: 'active',
            createdAt: current?.createdAt || now,
            updatedAt: now,
          },
          { merge: true }
        )
        const linked = roster.docs.find((doc) => doc.data().studentUserId === entry.userId)
        if (linked || student.exists) {
          tx.update(linked?.ref || studentRef, { status: 'active', updatedAt: now })
        } else
          tx.set(studentRef, {
            id: ref.id,
            schoolId,
            name: entry.name,
            birthDate: '',
            gender: 'otro',
            guardianIds: [],
            managerIds: [],
            guardianName: '',
            guardianRelationship: '',
            guardianPhone: '',
            guardianEmail: '',
            studentEmail: entry.email,
            studentUserId: entry.userId,
            accountParticipant: true,
            status: 'active',
            createdAt: now,
            updatedAt: now,
          })
      }
      tx.update(ref, { status: body.status, reviewedBy: access.caller.uid, updatedAt: now })
      return true
    })
    if (!result)
      return NextResponse.json({ error: 'La solicitud ya no está pendiente.' }, { status: 409 })
    await createNotification({
      recipientId: body.userId,
      actorId: access.caller.uid,
      type: 'school_access_reviewed',
      title: body.status === 'approved' ? 'Acceso aprobado' : 'Solicitud revisada',
      body:
        body.status === 'approved'
          ? 'La escuela aprobó tu acceso como atleta.'
          : 'La escuela no aprobó tu solicitud. Puedes contactar a la dirección.',
      link: '/athlete/progress',
    }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch {
    return failure()
  }
}
