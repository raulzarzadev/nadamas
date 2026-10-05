import { NextResponse } from 'next/server'
import { buildAvailableSlots } from '@/lib/coach-agenda'
import { resolveOfferings } from '@/lib/coach-offerings'
import { UNASSIGNED_SCHOOL_COACH_ID } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { requireSchoolAccess, schoolPeopleAreValid } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

interface RouteProps {
  params: Promise<{ schoolId: string }>
}

async function handlePOST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const coachId = typeof body.coachId === 'string' ? body.coachId : ''
  const date = typeof body.date === 'string' ? body.date : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime : ''
  const endTime = typeof body.endTime === 'string' ? body.endTime : ''
  const groupType = body.groupType === 'grupal' ? 'grupal' : 'particular'
  const offeringId = typeof body.offeringId === 'string' ? body.offeringId : ''
  const scheduleId = typeof body.scheduleId === 'string' ? body.scheduleId : ''
  if (
    !coachId ||
    coachId === UNASSIGNED_SCHOOL_COACH_ID ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    !/^\d{2}:\d{2}$/.test(endTime) ||
    endTime <= startTime
  )
    return NextResponse.json({ error: 'Revisa el horario y el entrenador.' }, { status: 400 })
  if (!(await schoolPeopleAreValid(schoolId, [coachId], [])))
    return NextResponse.json(
      { error: 'Selecciona un entrenador activo de la escuela.' },
      { status: 400 }
    )

  const sourceSnapshot = await adminDb
    .collection('schoolCoachOfferings')
    .doc(`${schoolId}_${UNASSIGNED_SCHOOL_COACH_ID}`)
    .get()
  if (!sourceSnapshot.exists)
    return NextResponse.json({ error: 'El horario ya no está disponible.' }, { status: 409 })
  const offerings = resolveOfferings({
    classOfferings: sourceSnapshot.data()?.classOfferings || [],
    teachingLocations: [],
    priceOptions: [],
  })
  const matchingOffering = offerings.find((item) => item.id === offeringId)
  const dateObj = new Date(`${date}T12:00:00`)
  const sourceSlot =
    matchingOffering &&
    buildAvailableSlots({
      coachId: UNASSIGNED_SCHOOL_COACH_ID,
      offerings: [matchingOffering],
      bookings: [],
      blocks: [],
      startDate: dateObj,
      endDate: dateObj,
    }).find(
      (slot) =>
        slot.scheduleId === scheduleId && slot.startTime === startTime && slot.endTime === endTime
    )
  if (!sourceSlot || sourceSlot.groupType !== groupType)
    return NextResponse.json({ error: 'El horario ya no está disponible.' }, { status: 409 })

  const id = `${schoolId}_${date}_${startTime.replace(':', '')}`
  const ref = adminDb.collection('schoolScheduleAssignments').doc(id)
  const previous = await ref.get()
  await ref.set(
    {
      schoolId,
      date,
      startTime,
      endTime,
      coachId,
      groupType,
      offeringId,
      scheduleId,
      locationName: sourceSlot.locationName,
      assignedBy: access.caller.uid,
      updatedAt: Date.now(),
    },
    { merge: true }
  )
  if (previous.data()?.coachId !== coachId) {
    const query = new URLSearchParams({ school: schoolId, date, time: startTime })
    await createNotification({
      recipientId: coachId,
      actorId: access.caller.uid,
      actorName: access.caller.name || null,
      type: 'school_class_assigned',
      title: 'Nuevo horario asignado',
      body: `La dirección te asignó el horario ${date} · ${startTime}.`,
      link: `/coach/agenda?${query.toString()}`,
      data: { date, startTime },
    }).catch((error) => console.error('[SCHOOL_SLOT_NOTIFICATION]', error))
  }
  return NextResponse.json({ ok: true })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
