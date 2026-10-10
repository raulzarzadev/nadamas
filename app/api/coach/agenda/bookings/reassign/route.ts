import { NextResponse } from 'next/server'
import { buildAvailableSlots, type CoachScheduleBlock, localDateKey } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { resolveOfferings } from '@/lib/coach-offerings'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { bookingPaymentEvent } from '@/lib/server/payments/booking-events'
import { preparePaymentEvents } from '@/lib/server/payments/reservations'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

async function handlePOST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  const caller = await adminAuth.verifyIdToken(token)
  const input = await request.json().catch(() => ({}))
  const body = (input && typeof input === 'object' ? input : {}) as {
    allowPackage?: unknown
    bookingId?: unknown
    date?: unknown
    startTime?: unknown
  }
  if (
    typeof body.bookingId !== 'string' ||
    typeof body.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.date) ||
    typeof body.startTime !== 'string' ||
    !/^\d{2}:\d{2}$/.test(body.startTime)
  )
    return NextResponse.json({ error: 'Selecciona una clase de destino.' }, { status: 400 })

  const date = new Date(`${body.date}T12:00:00`)
  if (!Number.isFinite(date.getTime()) || localDateKey(date) !== body.date)
    return NextResponse.json({ error: 'Selecciona una fecha válida.' }, { status: 400 })
  const result = await adminDb.runTransaction(async (transaction) => {
    const ref = adminDb.collection('bookings').doc(body.bookingId as string)
    const [sourceSnapshot, coachSnapshot, bookingsSnapshot, blocksSnapshot] = await Promise.all([
      transaction.get(ref),
      transaction.get(adminDb.collection('coaches').doc(caller.uid)),
      transaction.get(adminDb.collection('bookings').where('coachId', '==', caller.uid)),
      transaction.get(adminDb.collection('coachScheduleBlocks').where('coachId', '==', caller.uid)),
    ])
    const source = sourceSnapshot.data() as Booking | undefined
    if (
      !source ||
      source.coachId !== caller.uid ||
      source.schoolId ||
      source.status === 'cancelled'
    )
      return 'missing' as const
    if (source.date === body.date && source.startTime === body.startTime) return 'same' as const
    const bookings = bookingsSnapshot.docs
      .map((doc) => doc.data() as Booking)
      .filter((item) => !item.schoolId && item.id !== source.id && item.status !== 'cancelled')
    const blocks = blocksSnapshot.docs
      .map((doc) => doc.data() as CoachScheduleBlock)
      .filter((block) => !block.schoolId)
    const offerings = resolveOfferings(coachSnapshot.data() || {})
    const slot = buildAvailableSlots({
      coachId: caller.uid,
      offerings,
      bookings,
      blocks,
      startDate: date,
      endDate: date,
    }).find((item) => item.date === body.date && item.startTime === body.startTime)
    const classmates = bookings.filter(
      (item) => item.date === body.date && item.startTime === body.startTime
    )
    const target = slot || classmates[0]
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
      return 'unavailable' as const
    if (classmates.some((item) => item.athleteId === source.athleteId)) return 'duplicate' as const
    const groupType = classmates[0]?.groupType || target.groupType
    if (classmates.some((item) => item.classFull) || (groupType !== 'grupal' && classmates.length))
      return 'unavailable' as const
    const apply = await preparePaymentEvents(transaction, [
      bookingPaymentEvent(source, 'release', caller.uid, { organizerCancelled: true }),
      bookingPaymentEvent(
        {
          ...source,
          date: body.date as string,
          startTime: target.startTime,
          endTime: target.endTime,
        },
        'reserve',
        caller.uid,
        { allowPackage: body.allowPackage === true }
      ),
    ])
    apply()
    transaction.update(ref, {
      date: body.date,
      startTime: target.startTime,
      endTime: target.endTime,
      offeringId: target.offeringId,
      scheduleId: target.scheduleId,
      locationName: target.locationName,
      groupType,
      attended: false,
      classFull: false,
      updatedAt: Date.now(),
    })
    transaction.delete(adminDb.collection('agendaStudentRecords').doc(`booking-${source.id}`))
    return 'ok' as const
  })
  if (result === 'ok') return NextResponse.json({ ok: true })
  const errors = {
    missing: ['No encontramos esta clase.', 404],
    same: ['Selecciona una clase diferente.', 409],
    unavailable: ['La clase de destino ya no está disponible.', 409],
    duplicate: ['El alumno ya está en esa clase.', 409],
  } as const
  const [error, status] = errors[result]
  return NextResponse.json({ error }, { status })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
