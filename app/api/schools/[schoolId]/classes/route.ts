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
  let result: Awaited<ReturnType<typeof createSchoolClass>>
  try {
    result = await createSchoolClass(validation.value, {
      actorId: access.caller.uid,
      allowPackage: body.allowPackage === true,
      exceptionReason:
        typeof body.paymentExceptionReason === 'string'
          ? body.paymentExceptionReason.trim().slice(0, 300)
          : undefined,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'GROUP_CLASS_FULL')
      return NextResponse.json({ error: 'El cupo de esta clase está cerrado.' }, { status: 409 })
    throw error
  }
  for (const teacherId of validation.value.teacherIds) {
    await createNotification({
      recipientId: teacherId,
      classEvent: result.occurrences[0]
        ? {
            schoolId,
            date: result.occurrences[0].date,
            startTime: result.occurrences[0].startTime,
            endTime: result.occurrences[0].endTime,
            groupType: validation.value.type === 'group' ? 'grupal' : 'particular',
          }
        : undefined,
      actorId: access.caller.uid,
      actorName: null,
      type: 'school_class_assigned',
      title: 'Nueva clase asignada',
      body: `${validation.value.title} fue asignada a tu agenda.`,
      link: classDeepLink(schoolId, result),
      data: classDeepLinkData(result),
    }).catch((error) => console.error('[SCHOOL_CLASS_NOTIFICATION]', error))
  }
  return NextResponse.json(result, { status: 201 })
}

function classDeepLink(
  schoolId: string,
  result: { seriesId: string; occurrences?: Array<{ date: string; startTime: string }> }
) {
  const first = [...(result.occurrences || [])].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  )[0]
  const params = new URLSearchParams({ school: schoolId })
  if (first?.date) params.set('date', first.date)
  if (first?.startTime) params.set('time', first.startTime)
  if (result.seriesId) params.set('class', result.seriesId)
  return `/coach/agenda?${params.toString()}`
}

function classDeepLinkData(result: {
  seriesId: string
  occurrences?: Array<{ date: string; startTime: string }>
}): { date?: string; startTime?: string } | undefined {
  const first = [...(result.occurrences || [])].sort((a, b) =>
    `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
  )[0]
  if (!first?.date && !first?.startTime) return undefined
  return {
    ...(first?.date ? { date: first.date } : {}),
    ...(first?.startTime ? { startTime: first.startTime } : {}),
  }
}

export const POST = withSchoolAgendaUpdate(handlePOST)
