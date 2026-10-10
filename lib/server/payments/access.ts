import 'server-only'
import { NextResponse } from 'next/server'
import { type PaymentScope, type PaymentStudent, scopeKey } from '@/lib/payments/model'
import { publicNameFromUser } from '@/lib/public-name'
import { schoolMembershipHasRole } from '@/lib/school'
import { tenantSlugFromHost } from '@/lib/tenant-host'
import { adminDb } from '../firebase-admin'
import { getSchoolCaller, requireSchoolAccess } from '../school-access'
import { listSchoolStudents } from '../school-students'

export async function paymentAccess(request: Request) {
  const params = new URL(request.url).searchParams
  const schoolId = params.get('schoolId') || ''
  const coachId = params.get('coachId') || ''
  const studentView = params.get('view') === 'student'
  if (
    (!schoolId && !coachId) ||
    (schoolId && coachId) ||
    /[/]/.test(schoolId + coachId) ||
    (schoolId + coachId).length > 128
  )
    return {
      response: NextResponse.json(
        { error: 'Selecciona una escuela o entrenador.' },
        { status: 400 }
      ),
    }
  const caller = await getSchoolCaller(request)
  if (!caller)
    return {
      response: NextResponse.json({ error: 'Tu sesión no está disponible.' }, { status: 401 }),
    }
  const scope: PaymentScope = { kind: schoolId ? 'school' : 'coach', id: schoolId || coachId }
  let manager = false
  let students: PaymentStudent[] = []
  if (schoolId) {
    const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
    if (access.response) return { response: access.response }
    manager =
      !studentView && (access.globalAdmin || schoolMembershipHasRole(access.membership, 'director'))
    if (!studentView && !manager && schoolMembershipHasRole(access.membership, 'teacher'))
      return {
        response: NextResponse.json(
          { error: 'Los pagos de la escuela solo están disponibles para coordinación.' },
          { status: 403 }
        ),
      }
    const all = await listSchoolStudents(schoolId)
    students = all
      .filter(
        (student) =>
          manager ||
          [...(student.managerIds || []), ...(student.guardianIds || [])].includes(caller.uid) ||
          student.studentUserId === caller.uid
      )
      .map((student) => ({
        id: student.id,
        name: student.name,
        isSelf: student.studentUserId === caller.uid && !student.additionalProfileId,
        ownerId:
          [...(student.managerIds || []), ...(student.guardianIds || [])].includes(caller.uid) ||
          student.studentUserId === caller.uid
            ? caller.uid
            : student.managerIds?.[0] || student.guardianIds?.[0] || student.studentUserId || '',
      }))
  } else {
    const coach = await adminDb.collection('users').doc(coachId).get()
    if (!coach.exists || !(coach.data()?.roles?.coach || coach.data()?.isCoach))
      return {
        response: NextResponse.json({ error: 'Entrenador no disponible.' }, { status: 404 }),
      }
    manager = !studentView && coachId === caller.uid
    if (manager && tenantSlugFromHost(request.headers.get('host')))
      return {
        response: NextResponse.json(
          {
            error: 'Los pagos personales solo están disponibles fuera del espacio de una escuela.',
          },
          { status: 403 }
        ),
      }
    const bookings = await adminDb.collection('bookings').where('coachId', '==', coachId).get()
    const byId = new Map<string, PaymentStudent>()
    for (const doc of bookings.docs) {
      const booking = doc.data()
      if (booking.schoolId || (!manager && booking.athleteId !== caller.uid)) continue
      const id = booking.additionalProfileId || booking.athleteProfileId || booking.athleteId
      if (id)
        byId.set(id, {
          id,
          name: booking.athleteName || 'Alumno',
          ownerId: booking.athleteId || '',
        })
    }
    if (manager) {
      const participants = await adminDb
        .collection('paymentParticipants')
        .where('scope', '==', scopeKey(scope))
        .get()
      for (const doc of participants.docs) {
        const participant = doc.data() as PaymentStudent
        byId.set(participant.id, participant)
      }
    }
    if (!manager) {
      byId.set(caller.uid, {
        id: caller.uid,
        isSelf: true,
        name: caller.name || caller.email || 'Mi perfil',
        ownerId: caller.uid,
      })
      const profiles = await adminDb
        .collection('additionalProfiles')
        .where('ownerId', '==', caller.uid)
        .get()
      for (const doc of profiles.docs)
        byId.set(doc.id, {
          id: doc.id,
          name: publicNameFromUser(doc.data()) || doc.data().name || 'Alumno',
          ownerId: caller.uid,
        })
    }
    students = [...byId.values()]
  }
  return { caller, scope, key: scopeKey(scope), manager, students }
}
