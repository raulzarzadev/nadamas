import { NextResponse } from 'next/server'
import { buildAvailableSlots, type CoachScheduleBlock, localDateKey } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { DAY_TO_INDEX, resolveOfferings } from '@/lib/coach-offerings'
import { schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { getSchoolMembership, requireSchoolAccess } from '@/lib/server/school-access'
import { legacySchoolOfferings } from '@/lib/server/school-agenda'

type RouteProps = { params: Promise<{ schoolId: string }> }

export async function POST(request: Request, { params }: RouteProps) {
  const { schoolId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director'])
  if (access.response) return access.response
  const body = await request.json().catch(() => null)
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
      same: 'Selecciona una clase diferente.',
      blocked: 'El horario ya no está disponible.',
      duplicate: 'El alumno ya está en esa clase.',
      full: 'La clase de destino está llena.',
    }
    return NextResponse.json(
      { error: messages[result] },
      { status: result === 'missing' ? 404 : 409 }
    )
  }
  return NextResponse.json({ ok: true })
}
