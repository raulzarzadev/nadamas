import { NextResponse } from 'next/server'
import type { CoachClassOffering } from '@/firebase/coaches/coach.model'
import { buildAvailableSlots } from '@/lib/coach-agenda'
import { createOffering, dayLabelsFromDates, offeringsWithoutHours } from '@/lib/coach-offerings'
import { UNASSIGNED_SCHOOL_COACH_ID } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { requireSchoolAccess, schoolPeopleAreValid } from '@/lib/server/school-access'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

type Slot = {
  coachId: string
  date: string
  startTime: string
  endTime: string
  groupType: 'grupal' | 'particular'
  offeringId: string
}

async function handlePOST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
  const coachIds: string[] = Array.isArray(body?.coachIds)
    ? [
        ...new Set<string>(
          body.coachIds.filter((id: unknown) => typeof id === 'string' && id && !id.includes('/'))
        ),
      ]
    : []
  const slots = body?.slots as Slot[] | undefined
  if (
    !coachIds.length ||
    coachIds.length > 30 ||
    !Array.isArray(slots) ||
    !slots.length ||
    slots.length > 100 ||
    slots.some(
      (slot) =>
        !slot ||
        typeof slot.coachId !== 'string' ||
        slot.coachId.includes('/') ||
        !/^\d{4}-\d{2}-\d{2}$/.test(slot.date) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime) ||
        slot.endTime <= slot.startTime ||
        !['grupal', 'particular'].includes(slot.groupType)
    )
  ) {
    return NextResponse.json(
      { error: 'Revisa los horarios y los profes seleccionados.' },
      { status: 400 }
    )
  }
  if (coachIds.includes(UNASSIGNED_SCHOOL_COACH_ID) && coachIds.length > 1)
    return NextResponse.json({ error: 'Elige profes o la opción sin profe.' }, { status: 400 })
  const assignedIds = coachIds.filter((id) => id !== UNASSIGNED_SCHOOL_COACH_ID)
  if (!(await schoolPeopleAreValid(schoolId, assignedIds, [])))
    return NextResponse.json(
      { error: 'Selecciona profes activos de esta escuela.' },
      { status: 400 }
    )

  const updated = await adminDb.runTransaction(async (transaction) => {
    const [
      offeringsSnapshot,
      classesSnapshot,
      bookingsSnapshot,
      assignmentsSnapshot,
      requestsSnapshot,
    ] = await Promise.all([
      transaction.get(adminDb.collection('schoolCoachOfferings').where('schoolId', '==', schoolId)),
      transaction.get(
        adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId)
      ),
      transaction.get(adminDb.collection('bookings').where('schoolId', '==', schoolId)),
      transaction.get(
        adminDb.collection('schoolScheduleAssignments').where('schoolId', '==', schoolId)
      ),
      transaction.get(adminDb.collection('schoolClassRequests').where('schoolId', '==', schoolId)),
    ])
    const offerings = new Map<string, CoachClassOffering[]>(
      offeringsSnapshot.docs.map((doc) => [
        String(doc.data().coachId),
        doc.data().classOfferings || [],
      ])
    )
    const sameTime = (data: { date?: string; startTime?: string; endTime?: string }, slot: Slot) =>
      data.date === slot.date && data.startTime === slot.startTime && data.endTime === slot.endTime
    const selectedRecord = (data: {
      date?: string
      startTime?: string
      endTime?: string
      coachId?: string
      teacherIds?: string[]
      assignedCoachIds?: string[]
      groupType?: string
      type?: string
    }) =>
      slots.some(
        (slot) =>
          sameTime(data, slot) &&
          (data.groupType || (data.type === 'group' ? 'grupal' : 'particular')) ===
            slot.groupType &&
          (data.coachId === slot.coachId ||
            (data.assignedCoachIds || data.teacherIds || []).includes(slot.coachId) ||
            (slot.coachId === UNASSIGNED_SCHOOL_COACH_ID && data.teacherIds?.length === 0))
      )
    const sources = slots.map((slot) => {
      const source = offerings
        .get(slot.coachId)
        ?.find((offering) => offering.id === slot.offeringId)
      const date = new Date(`${slot.date}T12:00:00`)
      const exists =
        source &&
        buildAvailableSlots({
          coachId: slot.coachId,
          offerings: [source],
          bookings: [],
          blocks: [],
          startDate: date,
          endDate: date,
        }).some(
          (candidate) =>
            candidate.startTime === slot.startTime &&
            candidate.endTime === slot.endTime &&
            candidate.groupType === slot.groupType
        )
      const persisted = [
        ...classesSnapshot.docs,
        ...bookingsSnapshot.docs,
        ...assignmentsSnapshot.docs,
      ].some((doc) => {
        const data = doc.data()
        return (
          sameTime(data, slot) &&
          (data.coachId === slot.coachId ||
            (data.assignedCoachIds || data.teacherIds || []).includes(slot.coachId) ||
            (slot.coachId === UNASSIGNED_SCHOOL_COACH_ID && data.teacherIds?.length === 0)) &&
          (data.groupType || (data.type === 'group' ? 'grupal' : 'particular')) === slot.groupType
        )
      })
      return exists || persisted ? { slot, source } : null
    })
    if (sources.some((source) => !source)) return false
    const affected = new Set(coachIds)
    // Remove only these dates and hours; other published dates stay intact.
    for (const entry of sources) {
      if (!entry) continue
      const { slot, source } = entry
      const previousIds = new Set([slot.coachId, ...(source?.assignedCoachIds || [])])
      for (const doc of [...classesSnapshot.docs, ...bookingsSnapshot.docs]) {
        if (sameTime(doc.data(), slot) && selectedRecord(doc.data()))
          for (const id of doc.data().assignedCoachIds || doc.data().teacherIds || [])
            previousIds.add(id)
      }
      for (const previousId of previousIds) {
        affected.add(previousId)
        const current = offerings.get(previousId) || []
        offerings.set(
          previousId,
          current.flatMap((offering) =>
            offering.groupType === slot.groupType
              ? offeringsWithoutHours([offering], [{ date: slot.date, time: slot.startTime }])
              : [offering]
          )
        )
      }
    }
    for (const entry of sources) {
      if (!entry) continue
      const { slot, source } = entry
      for (const coachId of coachIds) {
        const current = offerings.get(coachId) || []
        // Stable identity makes retrying the same reassignment idempotent.
        const id = `assigned:${slot.date}:${slot.startTime}:${slot.groupType}`
        const alreadyPublished = current.some((offering) =>
          buildAvailableSlots({
            coachId,
            offerings: [offering],
            bookings: [],
            blocks: [],
            startDate: new Date(`${slot.date}T12:00:00`),
            endDate: new Date(`${slot.date}T12:00:00`),
          }).some(
            (candidate) =>
              candidate.startTime === slot.startTime &&
              candidate.endTime === slot.endTime &&
              candidate.groupType === slot.groupType
          )
        )
        if (alreadyPublished) continue
        const next: CoachClassOffering = {
          ...(source || createOffering()),
          id,
          assignedCoachIds: coachIds,
          groupType: slot.groupType,
          schedules: [
            {
              id: `${id}:schedule`,
              timeMode: 'fixed',
              startTime: slot.startTime,
              endTime: slot.endTime,
              availabilityMode: 'dates',
              availableDates: [slot.date],
              days: dayLabelsFromDates([slot.date]),
            },
          ],
        }
        offerings.set(coachId, [...current.filter((offering) => offering.id !== id), next])
      }
    }
    const now = Date.now()
    for (const coachId of affected)
      transaction.set(
        adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${coachId}`),
        { schoolId, coachId, classOfferings: offerings.get(coachId) || [], updatedAt: now },
        { merge: true }
      )
    for (const doc of classesSnapshot.docs)
      if (selectedRecord(doc.data()) && doc.data().status !== 'cancelled')
        transaction.update(doc.ref, { teacherIds: assignedIds, updatedAt: now })
    for (const doc of bookingsSnapshot.docs)
      if (selectedRecord(doc.data()) && doc.data().status !== 'cancelled')
        transaction.update(doc.ref, {
          coachId: coachIds[0],
          assignedCoachIds: coachIds,
          coachName: null,
          updatedAt: now,
        })
    for (const doc of assignmentsSnapshot.docs)
      if (selectedRecord(doc.data())) transaction.delete(doc.ref)
    for (const doc of requestsSnapshot.docs) {
      const data = doc.data()
      if (
        data.status === 'pending' &&
        slots.some(
          (slot) =>
            data.startDate === slot.date &&
            data.preferredStartTime === slot.startTime &&
            data.preferredTeacherId === slot.coachId
        )
      )
        transaction.update(doc.ref, { preferredTeacherId: coachIds[0], updatedAt: now })
    }
    return true
  })
  return updated
    ? NextResponse.json({ ok: true, schoolId })
    : NextResponse.json(
        { error: 'Algún horario cambió. Actualiza la agenda e inténtalo de nuevo.' },
        { status: 409 }
      )
}

export const POST = withSchoolAgendaUpdate(handlePOST)
