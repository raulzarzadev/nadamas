import { NextResponse } from 'next/server'
import { validProfileBirthDate } from '@/lib/additional-profile'
import type { Booking } from '@/lib/coach-booking'
import {
  type SchoolGender,
  type SchoolInvitationStudentData,
  schoolMembershipHasRole,
} from '@/lib/school'
import { coachVisibleSchoolStudentIds } from '@/lib/school-coach-students'
import { getAdditionalProfile } from '@/lib/server/additional-profiles'
import { sendSchoolInvitationEmail } from '@/lib/server/emails'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { listSchoolClasses } from '@/lib/server/school-classes'
import { createSchoolInvitation } from '@/lib/server/school-invitations'
import { createSchoolStudent, listSchoolStudents } from '@/lib/server/school-students'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response

  try {
    const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
    const isTeacher = schoolMembershipHasRole(access.membership, 'teacher')
    let students = await listSchoolStudents(
      schoolId,
      undefined,
      isDirector || isTeacher ? undefined : access.caller.uid
    )
    if (!isDirector && isTeacher) {
      const [classes, school] = await Promise.all([
        listSchoolClasses({ schoolId, teacherId: access.caller.uid }),
        getSchoolById(schoolId),
      ])
      const visibleIds = coachVisibleSchoolStudentIds(classes, school?.timezone || 'UTC')
      students = students.filter((student) => visibleIds.has(student.id))
    }
    const query = new URL(request.url).searchParams
    if (query.get('includeAgendaStudents') === 'true' && (isDirector || isTeacher)) {
      const coachId = query.get('coachId')?.trim() || access.caller.uid
      if (!isDirector && coachId !== access.caller.uid)
        return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
      const bookings = await adminDb.collection('bookings').where('coachId', '==', coachId).get()
      const seen = new Set(students.map((student) => student.id))
      const agendaStudents: Array<{
        id: string
        name: string
        studentEmail: string
        guardianPhone: string
      }> = []
      // These students were created in agenda slots, rather than the school roster.
      // Include their history even after cancellation so they remain reusable.
      for (const doc of bookings.docs) {
        const booking = doc.data() as Booking
        if (
          booking.schoolId !== schoolId ||
          booking.source !== 'coach' ||
          !/^manual[:_]/.test(booking.athleteId) ||
          seen.has(booking.athleteId)
        )
          continue
        seen.add(booking.athleteId)
        agendaStudents.push({
          id: booking.athleteId,
          name: booking.athleteName,
          studentEmail: booking.athleteEmail || '',
          guardianPhone: booking.athletePhone || '',
        })
      }
      return NextResponse.json({
        students: [...students, ...agendaStudents].sort((a, b) => a.name.localeCompare(b.name)),
      })
    }
    return NextResponse.json({ students })
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar los alumnos.' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'student'])
  if (access.response) return access.response

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const birthDate = typeof body.birthDate === 'string' ? body.birthDate.trim() : ''
  const gender =
    body.gender === 'varonil' || body.gender === 'femenil' || body.gender === 'otro'
      ? body.gender
      : null
  const guardianName = typeof body.guardianName === 'string' ? body.guardianName.trim() : ''
  const guardianRelationship =
    typeof body.guardianRelationship === 'string' ? body.guardianRelationship.trim() : ''
  const guardianPhone = typeof body.guardianPhone === 'string' ? body.guardianPhone.trim() : ''
  const studentEmail =
    typeof body.studentEmail === 'string' ? body.studentEmail.trim().toLowerCase() : ''
  const sendInvitation = body.sendInvitation === true
  if (name.length < 2 || !birthDate || !gender) {
    return NextResponse.json({ error: 'Completa los datos del alumno.' }, { status: 400 })
  }
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const additionalId = typeof body.additionalProfileId === 'string' ? body.additionalProfileId : ''
  const additional = additionalId
    ? await getAdditionalProfile(access.caller.uid, additionalId)
    : null
  if (!isDirector && !additional)
    return NextResponse.json({ error: 'Selecciona uno de tus Adicionales.' }, { status: 400 })
  if (!validProfileBirthDate(birthDate))
    return NextResponse.json({ error: 'Revisa la fecha de nacimiento.' }, { status: 400 })
  if (!isDirector && sendInvitation)
    return NextResponse.json(
      { error: 'Solo la escuela puede enviar invitaciones.' },
      { status: 403 }
    )
  if (studentEmail && !/^\S+@\S+\.\S+$/.test(studentEmail)) {
    return NextResponse.json({ error: 'Escribe un correo válido para el alumno.' }, { status: 400 })
  }
  if (sendInvitation && !studentEmail) {
    return NextResponse.json(
      { error: 'Escribe el correo del alumno para enviar la invitación.' },
      { status: 400 }
    )
  }
  const student = await createSchoolStudent({
    schoolId,
    guardianId: !isDirector ? access.caller.uid : undefined,
    additionalProfileId: additional?.id,
    guardianEmail: !isDirector ? access.caller.email || '' : '',
    name: additional?.name || name,
    birthDate: additional?.birthDate || birthDate,
    gender: additional?.gender || (gender as SchoolGender),
    guardianName,
    guardianRelationship,
    guardianPhone,
    studentEmail,
  })
  const school = await getSchoolById(schoolId)
  let invitation = null
  let inviteUrl: string | null = null
  if (sendInvitation && school) {
    const studentData: SchoolInvitationStudentData = {
      name: student.name,
      birthDate: student.birthDate,
      gender: student.gender,
      guardianName: student.guardianName,
      guardianRelationship: student.guardianRelationship,
      guardianPhone: student.guardianPhone,
    }
    const created = await createSchoolInvitation({
      schoolId,
      email: studentEmail,
      role: 'student',
      invitedBy: access.caller.uid,
      studentId: student.id,
      studentData,
    })
    invitation = created.invitation
    const siteUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
        : new URL(request.url).origin
    inviteUrl = `${siteUrl}/school/invitations/${created.token}`
    try {
      await sendSchoolInvitationEmail({
        email: studentEmail,
        schoolName: school.name,
        role: 'student',
        inviteUrl,
        studentData,
      })
    } catch (error) {
      console.error('[SCHOOL_INVITATION_EMAIL]', error)
    }
  }
  if (school && !isDirector) {
    void createNotification({
      recipientId: school.directorId,
      actorId: access.caller.uid,
      actorName: guardianName,
      type: 'school_class_requested',
      title: 'Nuevo alumno registrado',
      body: `${student.name} fue registrado en ${school.name}.`,
      link: '/school/students',
    }).catch(() => {})
  }
  return NextResponse.json({ student, invitation, inviteUrl }, { status: 201 })
}
