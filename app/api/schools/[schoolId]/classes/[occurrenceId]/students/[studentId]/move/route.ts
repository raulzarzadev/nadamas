import { NextResponse } from 'next/server'
import { buildAvailableSlots, type CoachScheduleBlock, localDateKey } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { resolveOfferings } from '@/lib/coach-offerings'
import { type SchoolClassOccurrence, schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { preparePaymentEvents } from '@/lib/server/payments/reservations'
import { getSchoolMembership, requireSchoolAccess } from '@/lib/server/school-access'
import { legacySchoolOfferings, schoolClassAgendaBooking } from '@/lib/server/school-agenda'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

type RouteProps = {
  params: Promise<{ schoolId: string; occurrenceId: string; studentId: string }>
}

async function handlePOST(request: Request, { params }: RouteProps) {
  const { schoolId, occurrenceId, studentId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const input = await request.json().catch(() => ({}))
  const body = (input && typeof input === 'object' ? input : {}) as {
    allowPackage?: unknown
    destinationSchoolClassId?: unknown
    coachId?: unknown
    date?: unknown
    startTime?: unknown
    endTime?: unknown
  }
  const existingClassId =
    typeof body.destinationSchoolClassId === 'string' ? body.destinationSchoolClassId : ''
  const freeSlot =
    typeof body.coachId === 'string' &&
    typeof body.date === 'string' &&
    typeof body.startTime === 'string' &&
    typeof body.endTime === 'string'
      ? {
          coachId: body.coachId,
          date: body.date,
          startTime: body.startTime,
          endTime: body.endTime,
        }
      : null
  if (!existingClassId && !freeSlot)
    return NextResponse.json({ error: 'Selecciona una clase de destino.' }, { status: 400 })
  if (existingClassId === occurrenceId)
    return NextResponse.json({ error: 'Selecciona otra clase.' }, { status: 409 })
  if (
    freeSlot &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(freeSlot.date) ||
      !/^\d{2}:\d{2}$/.test(freeSlot.startTime) ||
      !/^\d{2}:\d{2}$/.test(freeSlot.endTime) ||
      freeSlot.startTime >= freeSlot.endTime ||
      localDateKey(new Date(`${freeSlot.date}T12:00:00`)) !== freeSlot.date)
  )
    return NextResponse.json({ error: 'Selecciona un horario válido.' }, { status: 400 })
  if (freeSlot) {
    const membership = await getSchoolMembership(schoolId, freeSlot.coachId)
    if (
      !membership ||
      membership.status !== 'active' ||
      !schoolMembershipHasRole(membership, 'teacher') ||
      (!isDirector && freeSlot.coachId !== access.caller.uid)
    )
      return NextResponse.json(
        { error: 'No tienes permiso para usar ese horario.' },
        { status: 403 }
      )
  }
  const newClassRef = adminDb.collection('schoolClassOccurrences').doc()

  const result = await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(
      adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId)
    )
    const sourceDoc = snapshot.docs.find((doc) => doc.id === occurrenceId)
    const destinationDoc = existingClassId
      ? snapshot.docs.find((doc) => doc.id === existingClassId)
      : null
    if (!sourceDoc || (existingClassId && !destinationDoc)) return 'missing' as const
    const source = sourceDoc.data() as SchoolClassOccurrence
    const destination = destinationDoc?.data() as SchoolClassOccurrence | undefined
    const sameGroup = (a: SchoolClassOccurrence, b: SchoolClassOccurrence) =>
      a.type === 'group' &&
      b.type === 'group' &&
      a.schoolId === b.schoolId &&
      a.date === b.date &&
      a.startTime === b.startTime &&
      a.endTime === b.endTime &&
      a.title.trim().toLocaleLowerCase('es') === b.title.trim().toLocaleLowerCase('es') &&
      [...a.teacherIds].sort().join('|') === [...b.teacherIds].sort().join('|')
    if (
      !isDirector &&
      (!schoolMembershipHasRole(access.membership, 'teacher') ||
        !source.teacherIds.includes(access.caller.uid) ||
        (destination && !destination.teacherIds.includes(access.caller.uid)))
    )
      return 'unauthorized' as const
    if (
      (source.status !== 'scheduled' && source.status !== 'pending') ||
      (destination &&
        (destination.status !== 'scheduled' ||
          destination.type !== 'group' ||
          destination.classFull === true))
    )
      return 'unavailable' as const
    const sourceMatches = snapshot.docs.filter((doc) => {
      const item = doc.data() as SchoolClassOccurrence
      return (
        (item.status === 'scheduled' || item.status === 'pending') &&
        item.schoolId === source.schoolId &&
        item.type === source.type &&
        item.date === source.date &&
        item.startTime === source.startTime &&
        item.endTime === source.endTime &&
        item.title.trim().toLocaleLowerCase('es') === source.title.trim().toLocaleLowerCase('es') &&
        [...item.teacherIds].sort().join('|') === [...source.teacherIds].sort().join('|') &&
        item.studentIds.includes(studentId)
      )
    })
    if (!sourceMatches.length) return 'missing' as const
    let destinationStudentIds: string[] = []
    if (destination) {
      if (sameGroup(source, destination)) return 'duplicate' as const
      const destinationMatches = snapshot.docs
        .map((doc) => doc.data() as SchoolClassOccurrence)
        .filter(
          (item) =>
            (item.status === 'scheduled' || item.status === 'pending') &&
            sameGroup(destination, item)
        )
      if (destinationMatches.some((item) => item.classFull || item.studentIds.includes(studentId)))
        return 'duplicate' as const
      destinationStudentIds = [...new Set(destinationMatches.flatMap((item) => item.studentIds))]
      if (destinationStudentIds.length >= 100) return 'unavailable' as const
    }
    let availableSlot: ReturnType<typeof buildAvailableSlots>[number] | undefined
    if (freeSlot) {
      const [offeringsDoc, legacyDoc, bookingsSnapshot, blocksSnapshot] = await Promise.all([
        transaction.get(
          adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${freeSlot.coachId}`)
        ),
        transaction.get(
          adminDb.collection('schoolAvailability').doc(`${schoolId}_${freeSlot.coachId}`)
        ),
        transaction.get(adminDb.collection('bookings').where('schoolId', '==', schoolId)),
        transaction.get(
          adminDb.collection('coachScheduleBlocks').where('schoolId', '==', schoolId)
        ),
      ])
      const offerings = offeringsDoc.exists
        ? resolveOfferings({ classOfferings: offeringsDoc.data()?.classOfferings || [] })
        : legacySchoolOfferings(legacyDoc.data()?.weeklySlots)
      const bookings = bookingsSnapshot.docs
        .map((doc) => doc.data() as Booking)
        .filter((item) => item.coachId === freeSlot.coachId && item.status !== 'cancelled')
      for (const doc of snapshot.docs) {
        const item = doc.data() as SchoolClassOccurrence
        if (
          (item.status === 'scheduled' || item.status === 'pending') &&
          item.teacherIds.includes(freeSlot.coachId) &&
          item.date === freeSlot.date
        )
          bookings.push(
            schoolClassAgendaBooking({
              schoolId,
              occurrence: { ...item, id: doc.id },
              coachId: freeSlot.coachId,
              coachName: null,
            })
          )
      }
      const blocks = blocksSnapshot.docs
        .map((doc) => doc.data() as CoachScheduleBlock)
        .filter((item) => item.coachId === freeSlot.coachId)
      const date = new Date(`${freeSlot.date}T12:00:00`)
      availableSlot = buildAvailableSlots({
        coachId: freeSlot.coachId,
        offerings,
        bookings,
        blocks,
        startDate: date,
        endDate: date,
      }).find(
        (slot) =>
          slot.date === freeSlot.date &&
          slot.startTime === freeSlot.startTime &&
          slot.endTime === freeSlot.endTime &&
          slot.status === 'available'
      )
      if (
        !availableSlot ||
        bookings.some(
          (item) =>
            item.date === freeSlot.date &&
            item.startTime < freeSlot.endTime &&
            freeSlot.startTime < item.endTime
        )
      )
        return 'unavailable' as const
    }
    const paymentTarget = destination || availableSlot
    if (!paymentTarget) return 'unavailable' as const
    const applyPayment = await preparePaymentEvents(transaction, [
      ...sourceMatches.map((doc) => {
        const item = doc.data() as SchoolClassOccurrence
        return {
          scope: `school:${schoolId}`,
          studentId,
          sourceId: doc.id,
          date: item.date,
          startTime: item.startTime,
          actorId: access.caller.uid,
          action: 'release' as const,
          organizerCancelled: true,
        }
      }),
      {
        scope: `school:${schoolId}`,
        studentId,
        sourceId: destinationDoc?.id || newClassRef.id,
        date: paymentTarget.date,
        startTime: paymentTarget.startTime,
        endTime: paymentTarget.endTime,
        actorId: access.caller.uid,
        action: 'reserve',
        allowPackage: body.allowPackage === true,
      },
    ])
    applyPayment()
    const now = Date.now()
    for (const doc of sourceMatches) {
      const item = doc.data() as SchoolClassOccurrence
      transaction.update(doc.ref, {
        studentIds: item.studentIds.filter((id) => id !== studentId),
        updatedAt: now,
      })
    }
    for (const sourceId of new Set([occurrenceId, ...sourceMatches.map((doc) => doc.id)]))
      transaction.delete(
        adminDb.collection('agendaStudentRecords').doc(`class-${sourceId}-${studentId}`)
      )
    if (destinationDoc)
      transaction.update(destinationDoc.ref, {
        studentIds: [...destinationStudentIds, studentId],
        updatedAt: now,
      })
    else if (availableSlot)
      transaction.create(newClassRef, {
        ...source,
        id: newClassRef.id,
        seriesId: newClassRef.id,
        date: availableSlot.date,
        startTime: availableSlot.startTime,
        endTime: availableSlot.endTime,
        teacherIds: [availableSlot.coachId],
        studentIds: [studentId],
        type: availableSlot.groupType === 'grupal' ? 'group' : 'individual',
        location: availableSlot.locationName,
        locationUrl: '',
        classFull: false,
        status: 'scheduled',
        createdAt: now,
        updatedAt: now,
      } satisfies SchoolClassOccurrence)
    return 'ok' as const
  })
  if (result === 'ok') return NextResponse.json({ ok: true })
  const errors = {
    missing: ['No encontramos al alumno o la clase.', 404],
    unauthorized: ['No tienes permiso para cambiar esta clase.', 403],
    unavailable: ['La clase de destino ya no admite alumnos.', 409],
    duplicate: ['El alumno ya está en esa clase.', 409],
  } as const
  const [error, status] = errors[result]
  return NextResponse.json({ error }, { status })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
