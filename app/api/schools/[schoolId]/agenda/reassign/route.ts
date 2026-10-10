import { NextResponse } from 'next/server'
import { buildAvailableSlots, type CoachScheduleBlock, localDateKey } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { DAY_TO_INDEX, resolveOfferings } from '@/lib/coach-offerings'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { bookingPaymentEvent } from '@/lib/server/payments/booking-events'
import { type PaymentEvent, preparePaymentEvents } from '@/lib/server/payments/reservations'
import { getSchoolMembership, requireSchoolAccess } from '@/lib/server/school-access'
import { legacySchoolOfferings } from '@/lib/server/school-agenda'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

type RouteProps = { params: Promise<{ schoolId: string }> }

async function handlePOST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const body = await request.json().catch(() => null)
  if (
    body &&
    typeof body.schoolClassId === 'string' &&
    typeof body.destinationSchoolClassId === 'string' &&
    typeof body.coachId === 'string' &&
    typeof body.date === 'string' &&
    typeof body.startTime === 'string'
  ) {
    if (!isDirector)
      return NextResponse.json(
        { error: 'Solo la dirección puede mover una clase completa.' },
        { status: 403 }
      )
    const membership = await getSchoolMembership(schoolId, body.coachId)
    if (
      !membership ||
      membership.status !== 'active' ||
      !schoolMembershipHasRole(membership, 'teacher')
    )
      return NextResponse.json(
        { error: 'El entrenador no está activo en esta escuela.' },
        { status: 403 }
      )
    const sourceRef = adminDb.collection('schoolClassOccurrences').doc(body.schoolClassId)
    const destinationRef = adminDb
      .collection('schoolClassOccurrences')
      .doc(body.destinationSchoolClassId)
    const result = await adminDb.runTransaction(async (transaction) => {
      const [sourceSnapshot, destinationSnapshot] = await Promise.all([
        transaction.get(sourceRef),
        transaction.get(destinationRef),
      ])
      if (!sourceSnapshot.exists || !destinationSnapshot.exists) return 'missing'
      const source = sourceSnapshot.data()
      const destination = destinationSnapshot.data()
      if (!source || !destination) return 'missing'
      if (
        source.schoolId !== schoolId ||
        destination.schoolId !== schoolId ||
        source.status !== 'scheduled' ||
        destination.status !== 'scheduled' ||
        destination.type !== 'group' ||
        !Array.isArray(destination.teacherIds) ||
        !destination.teacherIds.includes(body.coachId) ||
        destination.date !== body.date ||
        destination.startTime !== body.startTime
      )
        return 'invalid'
      const studentIds = [
        ...new Set([
          ...(Array.isArray(destination.studentIds) ? destination.studentIds : []),
          ...(Array.isArray(source.studentIds) ? source.studentIds : []),
        ]),
      ]
      if (destination.classFull === true || studentIds.length > 100) return 'invalid'
      const events: PaymentEvent[] = source.studentIds.flatMap((studentId: string) => {
        const base = {
          scope: `school:${schoolId}`,
          studentId,
          actorId: access.caller.uid,
          organizerCancelled: true,
          allowPackage: body.allowPackage === true,
        }
        return [
          {
            ...base,
            sourceId: sourceRef.id,
            date: source.date,
            startTime: source.startTime,
            action: 'release' as const,
          },
          ...(!destination.studentIds.includes(studentId)
            ? [
                {
                  ...base,
                  sourceId: destinationRef.id,
                  date: destination.date,
                  startTime: destination.startTime,
                  endTime: destination.endTime,
                  action: 'reserve' as const,
                },
              ]
            : []),
        ]
      })
      const apply = await preparePaymentEvents(transaction, events)
      apply()
      transaction.update(destinationRef, { studentIds, updatedAt: Date.now() })
      transaction.update(sourceRef, { status: 'cancelled', updatedAt: Date.now() })
      return 'ok'
    })
    if (result !== 'ok')
      return NextResponse.json(
        {
          error:
            result === 'missing'
              ? 'No encontramos una de las clases.'
              : 'La clase de destino ya no está disponible.',
        },
        { status: result === 'missing' ? 404 : 409 }
      )
    return NextResponse.json({ ok: true })
  }
  if (
    body &&
    typeof body.bookingId === 'string' &&
    typeof body.destinationSchoolClassId === 'string' &&
    typeof body.coachId === 'string'
  ) {
    if (!isDirector && body.coachId !== access.caller.uid)
      return NextResponse.json(
        { error: 'No tienes permiso para mover esta clase.' },
        { status: 403 }
      )
    const result = await adminDb.runTransaction(async (transaction) => {
      const bookingRef = adminDb.collection('bookings').doc(body.bookingId)
      const classRef = adminDb
        .collection('schoolClassOccurrences')
        .doc(body.destinationSchoolClassId)
      const [bookingSnapshot, classSnapshot] = await Promise.all([
        transaction.get(bookingRef),
        transaction.get(classRef),
      ])
      const booking = bookingSnapshot.data() as Booking | undefined
      const destination = classSnapshot.data()
      if (
        !booking ||
        !destination ||
        booking.schoolId !== schoolId ||
        destination.schoolId !== schoolId
      )
        return 'missing' as const
      if (
        !isDirector &&
        (booking.coachId !== access.caller.uid ||
          !destination.teacherIds?.includes(access.caller.uid))
      )
        return 'unauthorized' as const
      if (
        booking.status === 'cancelled' ||
        destination.status !== 'scheduled' ||
        destination.type !== 'group' ||
        destination.classFull === true ||
        !destination.teacherIds?.includes(body.coachId)
      )
        return 'unavailable' as const
      const studentIds: string[] = Array.isArray(destination.studentIds)
        ? destination.studentIds
        : []
      if (studentIds.includes(booking.athleteId)) return 'duplicate' as const
      if (studentIds.length >= 100) return 'unavailable' as const
      const studentSnapshot = await transaction.get(
        adminDb.collection('schoolStudents').doc(booking.athleteId)
      )
      if (!studentSnapshot.exists || studentSnapshot.data()?.schoolId !== schoolId)
        return 'unavailable' as const
      const now = Date.now()
      const apply = await preparePaymentEvents(transaction, [
        bookingPaymentEvent(booking, 'release', access.caller.uid, { organizerCancelled: true }),
        {
          scope: `school:${schoolId}`,
          studentId: booking.athleteId,
          sourceId: classRef.id,
          date: destination.date,
          startTime: destination.startTime,
          endTime: destination.endTime,
          actorId: access.caller.uid,
          action: 'reserve',
          allowPackage: body.allowPackage === true,
        },
      ])
      apply()
      transaction.update(classRef, {
        studentIds: [...studentIds, booking.athleteId],
        updatedAt: now,
      })
      transaction.update(bookingRef, { status: 'cancelled', cancelledAt: now, updatedAt: now })
      transaction.delete(adminDb.collection('agendaStudentRecords').doc(`booking-${booking.id}`))
      return 'ok' as const
    })
    if (result !== 'ok') {
      const errors = {
        missing: ['No encontramos esta clase.', 404],
        unauthorized: ['No tienes permiso para mover esta clase.', 403],
        unavailable: ['La clase de destino ya no admite alumnos.', 409],
        duplicate: ['El alumno ya está en esa clase.', 409],
      } as const
      const [error, status] = errors[result]
      return NextResponse.json({ error }, { status })
    }
    return NextResponse.json({ ok: true })
  }
  if (
    !body ||
    typeof body.bookingId !== 'string' ||
    typeof body.coachId !== 'string' ||
    typeof body.date !== 'string' ||
    typeof body.startTime !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.date)
  ) {
    return NextResponse.json({ error: 'Selecciona una clase de destino.' }, { status: 400 })
  }
  if (!isDirector && body.coachId !== access.caller.uid)
    return NextResponse.json({ error: 'No tienes permiso para mover esta clase.' }, { status: 403 })
  const membership = await getSchoolMembership(schoolId, body.coachId)
  if (
    !membership ||
    membership.status !== 'active' ||
    !schoolMembershipHasRole(membership, 'teacher')
  ) {
    return NextResponse.json({ error: 'El profe no está activo en esta escuela.' }, { status: 403 })
  }
  const result = await adminDb.runTransaction(async (transaction) => {
    const bookingRef = adminDb.collection('bookings').doc(body.bookingId)
    const [source, offeringsDoc, legacyDoc, bookingsSnapshot, blocksSnapshot, profile, user] =
      await Promise.all([
        transaction.get(bookingRef),
        transaction.get(
          adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${body.coachId}`)
        ),
        transaction.get(
          adminDb.collection('schoolAvailability').doc(`${schoolId}_${body.coachId}`)
        ),
        transaction.get(adminDb.collection('bookings').where('schoolId', '==', schoolId)),
        transaction.get(
          adminDb.collection('coachScheduleBlocks').where('schoolId', '==', schoolId)
        ),
        transaction.get(adminDb.collection('schoolProfiles').doc(`${schoolId}_${body.coachId}`)),
        transaction.get(adminDb.collection('users').doc(body.coachId)),
      ])
    const booking = source.data() as Booking | undefined
    if (!booking || booking.schoolId !== schoolId || booking.status === 'cancelled')
      return 'missing'
    if (!isDirector && booking.coachId !== access.caller.uid) return 'unauthorized'
    if (
      booking.coachId === body.coachId &&
      booking.date === body.date &&
      booking.startTime === body.startTime
    )
      return 'same'
    const bookings = bookingsSnapshot.docs
      .map((doc) => doc.data() as Booking)
      .filter(
        (item) =>
          item.coachId === body.coachId && item.status !== 'cancelled' && item.id !== body.bookingId
      )
    const blocks = blocksSnapshot.docs
      .map((doc) => doc.data() as CoachScheduleBlock)
      .filter((block) => block.coachId === body.coachId)
    const offerings = offeringsDoc.exists
      ? resolveOfferings({ classOfferings: offeringsDoc.data()?.classOfferings || [] })
      : legacySchoolOfferings(legacyDoc.data()?.weeklySlots)
    const date = new Date(`${body.date}T12:00:00`)
    if (!Number.isFinite(date.getTime()) || localDateKey(date) !== body.date) return 'blocked'
    const slot = buildAvailableSlots({
      coachId: body.coachId,
      offerings,
      bookings,
      blocks,
      startDate: date,
      endDate: date,
    }).find((slot) => slot.startTime === body.startTime)
    const classmates = bookings.filter(
      (item) => item.date === body.date && item.startTime === body.startTime
    )
    const existingClass = classmates[0]
    // Ad-hoc classes can exist without an offering; their booking defines the slot.
    const target = slot || existingClass
    if (
      !target ||
      blocks.some(
        (block) =>
          block.date === body.date &&
          (block.allDay ||
            (block.startTime &&
              block.endTime &&
              block.startTime < target.endTime &&
              target.startTime < block.endTime))
      )
    )
      return 'blocked'
    if (classmates.some((item) => item.athleteId === booking.athleteId)) return 'duplicate'
    const groupType = existingClass?.groupType || target.groupType
    if (
      classmates.some((item) => item.classFull) ||
      (groupType !== 'grupal' && classmates.length > 0)
    )
      return 'full'
    const teacher = profile.data() || user.data() || {}
    const nextRef = adminDb.collection('bookings').doc()
    const { evaluation: _evaluation, ...previous } = booking
    const now = Date.now()
    const apply = await preparePaymentEvents(transaction, [
      bookingPaymentEvent(booking, 'release', access.caller.uid, { organizerCancelled: true }),
      bookingPaymentEvent(
        {
          ...booking,
          id: nextRef.id,
          date: body.date,
          startTime: target.startTime,
          endTime: target.endTime,
        },
        'reserve',
        access.caller.uid,
        { allowPackage: body.allowPackage === true }
      ),
    ])
    apply()
    transaction.set(nextRef, {
      ...previous,
      id: nextRef.id,
      reassignedFromBookingId: bookingRef.id,
      createdAt: now,
      coachId: body.coachId,
      coachName: teacher.name || teacher.nickname || teacher.displayName || 'Coach',
      date: body.date,
      startTime: target.startTime,
      endTime: target.endTime,
      offeringId: target.offeringId,
      scheduleId: target.scheduleId,
      locationName: target.locationName,
      groupType,
      days: [Object.entries(DAY_TO_INDEX).find(([, index]) => index === date.getDay())?.[0] || ''],
      attended: false,
      classFull: false,
      updatedAt: now,
    })
    transaction.update(bookingRef, {
      status: 'cancelled',
      cancelledAt: now,
      updatedAt: now,
      reassignedToBookingId: nextRef.id,
    })
    return 'ok'
  })
  if (result !== 'ok') {
    const messages = {
      missing: 'No encontramos esta clase.',
      unauthorized: 'No tienes permiso para mover esta clase.',
      same: 'Selecciona una clase diferente.',
      blocked: 'El horario ya no está disponible.',
      duplicate: 'El alumno ya está en esa clase.',
      full: 'La clase de destino está llena.',
    }
    return NextResponse.json(
      { error: messages[result] },
      { status: result === 'missing' ? 404 : result === 'unauthorized' ? 403 : 409 }
    )
  }
  return NextResponse.json({ ok: true })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
