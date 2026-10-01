import { NextResponse } from 'next/server'
import {
  type SchoolGender,
  type SchoolInvitationStudentData,
  schoolMembershipHasRole,
} from '@/lib/school'
import { sendSchoolInvitationEmail } from '@/lib/server/emails'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { createSchoolInvitation } from '@/lib/server/school-invitations'
import { createSchoolStudent, isMinor, listSchoolStudents } from '@/lib/server/school-students'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, [
    'director',
    'teacher',
    'guardian',
    'student',
  ])
  if (access.response) return access.response

  try {
    const students = await listSchoolStudents(
      schoolId,
      schoolMembershipHasRole(access.membership, 'guardian') ? access.caller.uid : undefined,
      schoolMembershipHasRole(access.membership, 'student') ? access.caller.uid : undefined
    )
    return NextResponse.json({ students })
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar los alumnos.' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'guardian'])
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
  const isGuardian = schoolMembershipHasRole(access.membership, 'guardian')
  if (isGuardian && !isMinor(birthDate)) {
    return NextResponse.json(
      { error: 'Los alumnos mayores de 18 años deben crear su propia cuenta.' },
      { status: 400 }
    )
  }
  if (studentEmail && !/^\S+@\S+\.\S+$/.test(studentEmail)) {
    return NextResponse.json({ error: 'Escribe un correo válido para el alumno.' }, { status: 400 })
  }
  if (sendInvitation && !studentEmail) {
    return NextResponse.json(
      { error: 'Escribe el correo del alumno para enviar la invitación.' },
      { status: 400 }
    )
  }
  if (sendInvitation && isMinor(birthDate)) {
    return NextResponse.json(
      { error: 'Los menores de 18 años deben registrarse con un tutor.' },
      { status: 400 }
    )
  }
  if (isMinor(birthDate) && (!guardianName || !guardianRelationship || !guardianPhone)) {
    return NextResponse.json(
      { error: 'Agrega los datos del padre o tutor del menor.' },
      { status: 400 }
    )
  }

  const student = await createSchoolStudent({
    schoolId,
    guardianId: isGuardian ? access.caller.uid : undefined,
    guardianEmail: isGuardian ? access.caller.email || '' : '',
    name,
    birthDate,
    gender: gender as SchoolGender,
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
  if (school && isGuardian) {
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
