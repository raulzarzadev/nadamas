import { NextResponse } from 'next/server'
import { schoolMembershipHasRole } from '@/lib/school'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess, schoolPeopleAreValid } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'
import {
  type CreateSchoolClassInput,
  createSchoolClass,
  listSchoolClasses,
  validateClassInput,
} from '@/lib/server/school-classes'
import { listSchoolStudents } from '@/lib/server/school-students'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher', 'student'])
  if (access.response) return access.response
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const isStudentAccount =
    !isDirector &&
    !schoolMembershipHasRole(access.membership, 'teacher') &&
    schoolMembershipHasRole(access.membership, 'student')
  const students =
    !isDirector && isStudentAccount
      ? await listSchoolStudents(
          schoolId,
          isStudentAccount ? access.caller.uid : undefined,
          undefined
        )
      : []
  const classes = await listSchoolClasses({
    schoolId,
    teacherId:
      !isDirector && schoolMembershipHasRole(access.membership, 'teacher')
        ? access.caller.uid
        : undefined,
    studentIds: !isDirector && isStudentAccount ? students.map((student) => student.id) : undefined,
  })
  return NextResponse.json({ classes })
}

async function handlePOST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const classInput = {
    ...body,
    schoolId,
  } as Partial<CreateSchoolClassInput>
  const validation = validateClassInput(classInput)
  if (!validation.ok) {
    const messages = {
      title: 'Escribe un nombre para la clase.',
      type: 'Selecciona un tipo de clase válido.',
      date: 'Revisa las fechas.',
      time: 'Revisa el horario.',
      days: 'Selecciona los días de la clase.',
      location: 'El enlace de ubicación no es válido.',
    } as const
    return NextResponse.json({ error: messages[validation.reason] }, { status: 400 })
  }
  if (
    !(await schoolPeopleAreValid(
      schoolId,
      validation.value.teacherIds,
      validation.value.studentIds
    ))
  ) {
    return NextResponse.json(
      { error: 'Selecciona personas que pertenezcan a la escuela.' },
      { status: 400 }
    )
  }
  const result = await createSchoolClass(validation.value)
  for (const teacherId of validation.value.teacherIds) {
    void createNotification({
      recipientId: teacherId,
      actorId: access.caller.uid,
      actorName: null,
      type: 'school_class_assigned',
      title: 'Nueva clase asignada',
      body: `${validation.value.title} fue asignada a tu agenda.`,
      link: '/school/classes',
    }).catch(() => {})
  }
  return NextResponse.json(result, { status: 201 })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
