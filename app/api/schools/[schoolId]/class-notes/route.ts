import { NextResponse } from 'next/server'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess } from '@/lib/server/school-access'

type Props = { params: Promise<{ schoolId: string }> }

async function authorize(request: Request, params: Props['params']) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return { response: access.response }
  const query = new URL(request.url).searchParams
  const coachId = query.get('coachId') || ''
  const date = query.get('date') || ''
  const time = query.get('time') || ''
  if (
    !coachId ||
    coachId.length > 128 ||
    coachId.includes('/') ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    return {
      response: NextResponse.json({ error: 'Revisa los datos de la clase.' }, { status: 400 }),
    }
  if (
    !access.globalAdmin &&
    !schoolMembershipHasRole(access.membership, 'director') &&
    coachId !== access.caller.uid
  )
    return {
      response: NextResponse.json(
        { error: 'No tienes permiso para editar esta clase.' },
        { status: 403 }
      ),
    }
  const ref = adminDb
    .collection('schoolClassNotes')
    .doc(encodeURIComponent(`${schoolId}|${coachId}|${date}|${time}`))
  return { ref, schoolId, coachId, date, startTime: time, userId: access.caller.uid }
}

export async function GET(request: Request, { params }: Props) {
  const access = await authorize(request, params)
  if (access.response) return access.response
  try {
    const snapshot = await access.ref.get()
    return NextResponse.json(
      { note: snapshot.data()?.note || '' },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch {
    return NextResponse.json({ error: 'No pudimos cargar las notas de la clase.' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Props) {
  const access = await authorize(request, params)
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
  if (typeof body?.note !== 'string' || body.note.length > 4000)
    return NextResponse.json(
      { error: 'La nota puede tener hasta 4000 caracteres.' },
      { status: 400 }
    )
  try {
    await access.ref.set(
      {
        schoolId: access.schoolId,
        coachId: access.coachId,
        date: access.date,
        startTime: access.startTime,
        note: body.note.trim(),
        updatedAt: Date.now(),
        updatedBy: access.userId,
      },
      { merge: true }
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'No pudimos guardar las notas de la clase.' },
      { status: 500 }
    )
  }
}
