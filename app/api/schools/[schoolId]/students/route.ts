import { NextResponse } from 'next/server'
import { validProfileBirthDate } from '@/lib/additional-profile'
import {
  type SchoolGender,
  type SchoolInvitationStudentData,
  schoolMembershipHasRole,
} from '@/lib/school'
import { getAdditionalProfile } from '@/lib/server/additional-profiles'
import { sendSchoolInvitationEmail } from '@/lib/server/emails'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess } from '@/lib/server/school-access'
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
    const staff = access.globalAdmin || schoolMembershipHasRole(access.membership, 'teacher')
    const students = await listSchoolStudents(
      schoolId,
      undefined,
      staff ? undefined : access.caller.uid
    )
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
