import { NextResponse } from 'next/server'
import { ATTENDANCE_MESSAGES, type AttendanceMethod } from '@/lib/attendance'
import { schoolMembershipHasRole } from '@/lib/school'
import {
  attendanceCandidate,
  attendanceClasses,
  listAttendanceRoster,
  recordAttendance,
  resolveAttendancePerson,
} from '@/lib/server/attendance'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'
type Props = { params: Promise<{ schoolId: string }> }
const privateHeaders = { 'Cache-Control': 'private, no-store' }
const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 250 && !value.includes('/')

export async function GET(request: Request, { params }: Props) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  const director = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const query = new URL(request.url).searchParams
  const occurrenceId = query.get('occurrenceId') || ''
  let date = query.get('date') || ''
  try {
    if (occurrenceId) {
      if (!validId(occurrenceId))
        return NextResponse.json({ error: 'Revisa la clase.' }, { status: 400 })
      const snapshot = await adminDb.collection('schoolClassOccurrences').doc(occurrenceId).get()
      const selected = snapshot.data()
      const virtualDate = occurrenceId.match(/^attendance:(\d{4}-\d{2}-\d{2}):[a-f0-9]{32}$/)?.[1]
      if (
        snapshot.exists
          ? selected?.schoolId !== schoolId ||
            (!director && !selected.teacherIds?.includes(access.caller.uid))
          : !virtualDate
      )
        return NextResponse.json(
          { error: 'No encontramos una clase disponible para ti.' },
          { status: 404 }
        )
      date = selected?.date || virtualDate || ''
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return NextResponse.json({ error: 'Selecciona una fecha.' }, { status: 400 })
    const classes = await attendanceClasses(
      schoolId,
      date,
      director ? undefined : access.caller.uid
    )
    const teachers = [...new Set(classes.flatMap((item) => item.teacherIds))]
    const names = await Promise.all(
      teachers.map(async (id) => {
        const [profile, user] = await Promise.all([
          adminDb.collection('schoolProfiles').doc(`${schoolId}_${id}`).get(),
          adminDb.collection('users').doc(id).get(),
        ])
        const data = user.data()
        return [
          id,
          profile.data()?.name || data?.nickname || data?.displayName || data?.name || 'Profe',
        ] as const
      })
    )
    const base = { classes, coachNames: Object.fromEntries(names) }
    if (!occurrenceId) return NextResponse.json(base, { headers: privateHeaders })
    const occurrence = classes.find(
      (item) =>
        item.id === occurrenceId ||
        ('sourceOccurrenceIds' in item &&
          (item.sourceOccurrenceIds as string[]).includes(occurrenceId))
    )
    if (!occurrence)
      return NextResponse.json({ error: 'Esta clase ya no está disponible.' }, { status: 404 })
    const { roster, records, students, recorded } = await listAttendanceRoster(schoolId, occurrence)
    const mode = query.get('mode')
    const value = (query.get('query') || '').trim()
    let candidates = roster
    if (mode === 'name' && value.length >= 2 && value.length <= 120) {
      const normalized = (text: string) =>
        text
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('es')
      candidates = await Promise.all(
        students
          .filter((student) => student.name && normalized(student.name).includes(normalized(value)))
          .slice(0, 20)
          .map((student) => attendanceCandidate(student, occurrence, recorded))
      )
    } else if (mode === 'id' || mode === 'qr') {
      if ((mode === 'id' && !/^\d{6}$/.test(value)) || value.length > 100)
        return NextResponse.json({ error: 'Revisa el ID o la credencial.' }, { status: 400 })
      const person = await resolveAttendancePerson(
        schoolId,
        mode === 'id' ? { numericId: value } : { qrValue: value }
      )
      candidates = person?.student
        ? [await attendanceCandidate(person.student, occurrence, recorded)]
        : person?.profile
          ? [
              {
                name: person.profile.name,
                numericId: person.profile.numericId,
                ...(person.profile.photoURL ? { photoURL: person.profile.photoURL } : {}),
                inSchool: false,
                enrolled: false,
                pending: false,
                attended: false,
              },
            ]
          : []
    } else if (mode === 'name') candidates = []
    return NextResponse.json({ ...base, roster, records, candidates }, { headers: privateHeaders })
  } catch (error) {
    console.error('[ATTENDANCE_READ]', error)
    return NextResponse.json(
      { error: 'No pudimos cargar el pase de lista. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}

async function handlePOST(request: Request, { params }: Props) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
  const method: AttendanceMethod | null = ['qr', 'name', 'id'].includes(body?.method)
    ? body.method
    : null
  if (
    !validId(body?.occurrenceId) ||
    !method ||
    (body.studentId && !validId(body.studentId)) ||
    (body.numericId && !/^\d{6}$/.test(body.numericId)) ||
    (body.qrValue && (typeof body.qrValue !== 'string' || body.qrValue.length > 100)) ||
    [body.studentId, body.numericId, body.qrValue].filter(Boolean).length !== 1
  )
    return NextResponse.json(
      { error: 'Selecciona una clase y un atleta válidos.' },
      { status: 400 }
    )
  try {
    // Verify the class before any global identity lookup.
    const selected = await adminDb.collection('schoolClassOccurrences').doc(body.occurrenceId).get()
    const director = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
    const virtualDate = body.occurrenceId.match(
      /^attendance:(\d{4}-\d{2}-\d{2}):[a-f0-9]{32}$/
    )?.[1]
    const virtualOccurrence =
      !selected.exists && virtualDate
        ? (
            await attendanceClasses(schoolId, virtualDate, director ? undefined : access.caller.uid)
          ).find((item) => item.id === body.occurrenceId && item.attendanceVirtual)
        : undefined
    if (
      selected.exists
        ? selected.data()?.schoolId !== schoolId ||
          (!director && !selected.data()?.teacherIds?.includes(access.caller.uid))
        : !virtualOccurrence
    )
      return NextResponse.json(
        { error: 'No tienes permiso para pasar lista en esta clase.', code: 'unauthorized' },
        { status: 403 }
      )
    const person = await resolveAttendancePerson(schoolId, {
      studentId: body.studentId,
      numericId: body.numericId,
      qrValue: body.qrValue,
    })
    if (!person)
      return NextResponse.json(
        {
          error: 'No encontramos al atleta. Revisa el ID o la credencial.',
          code: 'missing_person',
        },
        { status: 404 }
      )
    const result = await recordAttendance({
      schoolId,
      occurrenceId: body.occurrenceId,
      actorId: access.caller.uid,
      director,
      method,
      virtualOccurrence,
      ...person,
      addToClass: body.addToClass === true,
      linkToSchool: body.linkToSchool === true,
      promoteToGroup: body.promoteToGroup === true,
    })
    if (result.code === 'ok')
      return NextResponse.json({ ok: true, ...result }, { headers: privateHeaders })
    const messages: Record<string, string> = {
      ...ATTENDANCE_MESSAGES,
      missing_class: 'No encontramos esta clase.',
      missing_person: 'No encontramos este atleta.',
      inactive_student: 'Este atleta está inactivo. La dirección debe revisar su inscripción.',
      unauthorized: 'No tienes permiso para pasar lista en esta clase.',
    }
    return NextResponse.json(
      { error: messages[result.code] || 'No pudimos registrar la asistencia.', code: result.code },
      {
        status:
          result.code === 'unauthorized' ? 403 : result.code.startsWith('missing') ? 404 : 409,
      }
    )
  } catch (error) {
    console.error('[ATTENDANCE_WRITE]', error)
    return NextResponse.json(
      { error: 'No pudimos registrar la asistencia. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
export const POST = withSchoolAgendaUpdate(handlePOST)
