import { NextResponse } from 'next/server'
import type { Booking } from '@/lib/coach-booking'
import {
  DAY_TO_INDEX,
  resolveOfferingSchedules,
  resolveOfferings,
  scheduleIsAvailableOn,
} from '@/lib/coach-offerings'
import { type StudentProgress, studentProgressId } from '@/lib/coach-student-progress'
import { publicNameFromUser } from '@/lib/public-name'
import { type SchoolMembership, schoolMembershipHasRole } from '@/lib/school'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { notifyBookingByCoach } from '@/lib/server/notifications'
import { getSchoolMembership } from '@/lib/server/school-access'
import { legacySchoolOfferings } from '@/lib/server/school-agenda'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'

export const runtime = 'nodejs'

function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

async function verifyCoach(request: Request) {
  const token = getBearerToken(request)
  if (!token) return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) }

  const authenticatedCaller = await adminAuth.verifyIdToken(token)
  const input =
    request.method === 'DELETE'
      ? Object.fromEntries(new URL(request.url).searchParams)
      : await request
          .clone()
          .json()
          .catch(() => ({}))
  if (!input || typeof input !== 'object')
    return { error: NextResponse.json({ error: 'Revisa los datos de la clase.' }, { status: 400 }) }
  const schoolId = typeof input.schoolId === 'string' ? input.schoolId.trim() : ''
  const targetCoachId = typeof input.coachId === 'string' ? input.coachId.trim() : ''
  if (targetCoachId && targetCoachId !== authenticatedCaller.uid) {
    if (!schoolId) return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) }
    const actor = await getSchoolMembership(schoolId, authenticatedCaller.uid)
    const target = await getSchoolMembership(schoolId, targetCoachId)
    if (
      !actor ||
      actor.status !== 'active' ||
      !schoolMembershipHasRole(actor, 'director') ||
      !target ||
      target.status !== 'active' ||
      !schoolMembershipHasRole(target, 'teacher')
    ) {
      return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) }
    }
    const callerDoc = await adminDb.collection('users').doc(targetCoachId).get()
    return {
      caller: { ...authenticatedCaller, uid: targetCoachId },
      callerDoc,
      isAdmin: false,
      directorMode: true,
    }
  }
  const caller = authenticatedCaller
  const callerDoc = await adminDb.collection('users').doc(caller.uid).get()
  if (callerDoc.data()?.roles?.coach !== true && callerDoc.data()?.roles?.admin !== true) {
    return { error: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) }
  }

  return {
    caller,
    callerDoc,
    isAdmin: callerDoc.data()?.roles?.admin === true,
    directorMode: false,
  }
}

function weekdayLabel(date: string) {
  const index = new Date(`${date}T12:00:00`).getDay()
  return Object.entries(DAY_TO_INDEX).find(([, value]) => value === index)?.[0] || ''
}

type CoachBookingInput = {
  coachId?: string
  date?: string
  startTime?: string
  endTime?: string
  locationName?: string
  athleteId?: string
  athleteName?: string
  athleteEmail?: string | null
  athletePhone?: string | null
  groupType?: 'particular' | 'grupal'
  schoolId?: string
}

type SlotSettingsInput = {
  coachId?: string
  id?: string
  date?: string
  startTime?: string
  offeringId?: string
  scheduleId?: string
  groupType?: 'particular' | 'grupal'
  classFull?: boolean
  attended?: boolean
  note?: string
  schoolId?: string
}

async function authorizeSchoolContext(schoolId: string | null, uid: string, isAdmin: boolean) {
  if (!schoolId || isAdmin) return null
  const membership = await getSchoolMembership(schoolId, uid)
  if (
    !membership ||
    membership.status !== 'active' ||
    !schoolMembershipHasRole(membership as SchoolMembership, 'teacher')
  ) {
    return NextResponse.json({ error: 'No autorizado para esta escuela.' }, { status: 403 })
  }
  return null
}

async function syncCoachCreatedSlotGroupType(
  coachId: string,
  date: string,
  startTime: string,
  schoolId: string | null
) {
  const snapshot = await adminDb.collection('bookings').where('coachId', '==', coachId).get()
  const slotBookings = snapshot.docs.filter((doc) => {
    const booking = doc.data() as Booking
    return (
      booking.date === date &&
      booking.startTime === startTime &&
      (schoolId ? booking.schoolId === schoolId : !booking.schoolId) &&
      booking.status !== 'cancelled' &&
      booking.source === 'coach' &&
      booking.offeringId === 'open'
    )
  })
  if (slotBookings.length <= 1) return

  const batch = adminDb.batch()
  let changed = false

  for (const doc of slotBookings) {
    if ((doc.data() as Booking).groupType === 'grupal') continue
    batch.set(doc.ref, { groupType: 'grupal', updatedAt: Date.now() }, { merge: true })
    changed = true
  }

  if (changed) await batch.commit()
}

async function handlePOST(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const coachId = verification.caller.uid
  const body = (await request.json()) as CoachBookingInput
  const schoolId = typeof body.schoolId === 'string' ? body.schoolId.trim() || null : null
  const schoolError = await authorizeSchoolContext(schoolId, coachId, verification.isAdmin)
  if (schoolError) return schoolError
  const date = typeof body.date === 'string' ? body.date.trim() : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : ''
  const endTime = typeof body.endTime === 'string' ? body.endTime.trim() : ''
  const athleteName = typeof body.athleteName === 'string' ? body.athleteName.trim() : ''
  const groupType = body.groupType === 'grupal' ? 'grupal' : 'particular'

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    !/^\d{2}:\d{2}$/.test(endTime) ||
    endTime <= startTime ||
    !athleteName
  ) {
    return NextResponse.json(
      { error: 'Datos del alumno o del horario inválidos.' },
      { status: 400 }
    )
  }

  // One booking per student per class: match by id for existing students,
  // by normalized name for free-text ones.
  const requestedAthleteId = typeof body.athleteId === 'string' ? body.athleteId.trim() : ''
  const slotSnapshot = await adminDb
    .collection('bookings')
    .where('coachId', '==', coachId)
    .where('date', '==', date)
    .where('startTime', '==', startTime)
    .get()
  const normalizedName = athleteName.toLowerCase()
  const activeSlotBookings = slotSnapshot.docs
    .map((doc) => doc.data() as Booking)
    .filter((booking) => (schoolId ? booking.schoolId === schoolId : !booking.schoolId))
    .filter((existing) => existing.status !== 'cancelled')
  if (activeSlotBookings.some((existing) => existing.classFull)) {
    return NextResponse.json({ error: 'Esta clase está llena.' }, { status: 409 })
  }
  const alreadyBooked = activeSlotBookings.some((existing) =>
    requestedAthleteId
      ? existing.athleteId === requestedAthleteId
      : existing.athleteName.trim().toLowerCase() === normalizedName
  )
  if (alreadyBooked) {
    return NextResponse.json({ error: 'Este alumno ya está en esta clase.' }, { status: 409 })
  }

  const now = Date.now()
  const ref = adminDb.collection('bookings').doc()
  const athletePhone = body.athletePhone?.trim()
  const booking: Booking = {
    id: ref.id,
    athleteId: requestedAthleteId || `manual:${ref.id}`,
    athleteName,
    classFull: false,
    attended: false,
    // Firestore rejects `undefined`; only include the field when present.
    ...(athletePhone ? { athletePhone } : {}),
    athleteEmail: body.athleteEmail?.trim() || null,
    coachId,
    coachName: publicNameFromUser(verification.callerDoc.data()),
    offeringId: 'open',
    scheduleId: `open:${date}:${startTime}`,
    locationName: body.locationName?.trim() || 'Horario abierto',
    mode: 'fixed',
    groupType,
    days: [weekdayLabel(date)],
    date,
    startTime,
    endTime,
    price: null,
    priceCents: null,
    currency: 'MXN',
    unit: 'clase',
    status: 'confirmed',
    source: 'coach',
    createdAt: now,
    updatedAt: now,
    ...(schoolId ? { schoolId } : {}),
  }

  await ref.set(booking)
  await syncCoachCreatedSlotGroupType(coachId, date, startTime, schoolId)

  const progressRef = adminDb
    .collection('coachStudentProgress')
    .doc(studentProgressId(coachId, booking.athleteId))
  const progressSnap = await progressRef.get()
  if (!progressSnap.exists) {
    const progress: StudentProgress = {
      id: progressRef.id,
      coachId,
      athleteId: booking.athleteId,
      athleteName: booking.athleteName,
      athleteEmail: booking.athleteEmail ?? null,
      ...(booking.athletePhone ? { athletePhone: booking.athletePhone } : {}),
      level: 1,
      coachAssessment: 1,
      lastNote: '',
      createdAt: now,
      updatedAt: now,
    }
    await progressRef.set(progress)
  }

  // Notify the athlete (skipped automatically for manual_* placeholder ids).
  try {
    await notifyBookingByCoach({
      athleteId: booking.athleteId,
      coachId,
      coachName: booking.coachName,
      date: booking.date,
      startTime: booking.startTime,
      locationName: booking.locationName,
      bookingId: booking.id,
    })
  } catch (error) {
    console.error('[COACH_BOOKING_NOTIFY_INAPP]', error)
  }

  return NextResponse.json({ booking })
}

async function handlePATCH(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const body = (await request.json()) as SlotSettingsInput
  const schoolId = typeof body.schoolId === 'string' ? body.schoolId.trim() || null : null
  const schoolError = await authorizeSchoolContext(
    schoolId,
    verification.caller.uid,
    verification.isAdmin
  )
  if (schoolError) return schoolError
  const bookingId = typeof body.id === 'string' ? body.id.trim() : ''
  if (bookingId && (typeof body.attended === 'boolean' || typeof body.note === 'string')) {
    if (typeof body.note === 'string' && body.note.length > 1000)
      return NextResponse.json(
        { error: 'La nota no puede superar 1000 caracteres.' },
        { status: 400 }
      )
    const bookingRef = adminDb.collection('bookings').doc(bookingId)
    const bookingDoc = await bookingRef.get()
    const booking = bookingDoc.data() as Booking | undefined
    if (
      !bookingDoc.exists ||
      !booking ||
      booking?.coachId !== verification.caller.uid ||
      (schoolId ? booking?.schoolId !== schoolId : booking?.schoolId)
    ) {
      return NextResponse.json({ error: 'No encontramos esta clase.' }, { status: 404 })
    }
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Esta clase está cancelada.' }, { status: 409 })
    }
    const now = Date.now()
    if (typeof body.attended === 'boolean')
      await bookingRef.set({ attended: body.attended, updatedAt: now }, { merge: true })
    if (typeof body.note === 'string')
      await adminDb
        .collection('agendaStudentRecords')
        .doc(`booking-${bookingId}`)
        .set(
          {
            sourceId: bookingId,
            studentId: booking.athleteId,
            coachId: booking.coachId,
            ...(schoolId ? { schoolId } : {}),
            note: body.note.trim(),
            updatedAt: now,
          },
          { merge: true }
        )
    return NextResponse.json({ ok: true })
  }

  const date = typeof body.date === 'string' ? body.date.trim() : ''
  const startTime = typeof body.startTime === 'string' ? body.startTime.trim() : ''
  const offeringId = typeof body.offeringId === 'string' ? body.offeringId.trim() : ''
  const scheduleId = typeof body.scheduleId === 'string' ? body.scheduleId.trim() : ''
  const hasGroupType = body.groupType === 'particular' || body.groupType === 'grupal'
  const hasClassFull = typeof body.classFull === 'boolean'

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    (!hasGroupType && !hasClassFull)
  ) {
    return NextResponse.json({ error: 'Configuración de clase inválida.' }, { status: 400 })
  }

  const snapshot = await adminDb
    .collection('bookings')
    .where('coachId', '==', verification.caller.uid)
    .where('date', '==', date)
    .where('startTime', '==', startTime)
    .get()
  const activeDocs = snapshot.docs.filter((doc) => {
    const booking = doc.data() as Booking
    return (
      (schoolId ? booking.schoolId === schoolId : !booking.schoolId) &&
      (!offeringId || booking.offeringId === offeringId) &&
      (!scheduleId || booking.scheduleId === scheduleId) &&
      booking.status !== 'cancelled'
    )
  })
  if (activeDocs.length === 0) {
    return NextResponse.json({ error: 'No encontramos esta clase.' }, { status: 404 })
  }

  const currentIsGroup =
    activeDocs.length > 1 ||
    activeDocs.some((doc) => (doc.data() as Booking).groupType === 'grupal')
  const nextGroupType = hasGroupType ? body.groupType : currentIsGroup ? 'grupal' : 'particular'
  if (nextGroupType === 'particular' && activeDocs.length > 1) {
    return NextResponse.json(
      { error: 'Una clase con varios alumnos debe ser grupal.' },
      { status: 409 }
    )
  }

  const currentIsFull = activeDocs.some((doc) => (doc.data() as Booking).classFull)
  const nextClassFull =
    nextGroupType === 'grupal' ? (hasClassFull ? body.classFull : currentIsFull) : false
  const batch = adminDb.batch()
  const updatedAt = Date.now()
  for (const doc of activeDocs) {
    batch.set(
      doc.ref,
      { groupType: nextGroupType, classFull: nextClassFull, updatedAt },
      { merge: true }
    )
  }
  if (verification.directorMode && schoolId && hasGroupType) {
    const ref = adminDb
      .collection('schoolCoachOfferings')
      .doc(`${schoolId}_${verification.caller.uid}`)
    const [current, legacy] = await Promise.all([
      ref.get(),
      adminDb.collection('schoolAvailability').doc(`${schoolId}_${verification.caller.uid}`).get(),
    ])
    const offerings = current.exists
      ? resolveOfferings({ classOfferings: current.data()?.classOfferings || [] })
      : legacySchoolOfferings(legacy.data()?.weeklySlots)
    const classOfferings = offerings.map((offering) => ({
      ...offering,
      schedules: resolveOfferingSchedules(offering).map((schedule) =>
        (!offeringId || offering.id === offeringId) &&
        (!scheduleId || schedule.id === scheduleId) &&
        schedule.startTime === startTime &&
        scheduleIsAvailableOn(schedule, new Date(`${date}T12:00:00`))
          ? { ...schedule, groupType: nextGroupType }
          : schedule
      ),
    }))
    batch.set(
      ref,
      { schoolId, coachId: verification.caller.uid, classOfferings, updatedAt },
      { merge: true }
    )
  }
  await batch.commit()

  return NextResponse.json({ ok: true, groupType: nextGroupType, classFull: nextClassFull })
}

async function handleDELETE(request: Request) {
  const verification = await verifyCoach(request)
  if (verification.error) return verification.error

  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const schoolId = url.searchParams.get('schoolId') || null
  const schoolError = await authorizeSchoolContext(
    schoolId,
    verification.caller.uid,
    verification.isAdmin
  )
  if (schoolError) return schoolError
  if (!id) return NextResponse.json({ error: 'Reserva inválida.' }, { status: 400 })

  const ref = adminDb.collection('bookings').doc(id)
  const current = await ref.get()
  if (
    !current.exists ||
    current.data()?.coachId !== verification.caller.uid ||
    (schoolId ? current.data()?.schoolId !== schoolId : current.data()?.schoolId)
  ) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  }

  const now = Date.now()
  const participantIds = url.searchParams.get('participantIds')
  if (participantIds !== null) {
    let input: unknown
    try {
      input = JSON.parse(participantIds)
    } catch {
      input = null
    }
    if (
      !Array.isArray(input) ||
      !input.length ||
      input.length > 100 ||
      input.some((value) => typeof value !== 'string' || !value)
    )
      return NextResponse.json(
        { error: 'Selecciona los participantes que quieres retirar.' },
        { status: 400 }
      )
    const selected = new Set<string>(input)
    const anchor = current.data() as Booking
    const result = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(
        adminDb.collection('bookings').where('coachId', '==', verification.caller.uid)
      )
      const active = snapshot.docs.filter((doc) => {
        const booking = doc.data() as Booking
        return (
          booking.status !== 'cancelled' &&
          booking.date === anchor.date &&
          booking.startTime === anchor.startTime &&
          booking.endTime === anchor.endTime &&
          (schoolId ? booking.schoolId === schoolId : !booking.schoolId)
        )
      })
      if ([...selected].some((id) => !active.some((doc) => doc.data().athleteId === id)))
        return null
      const removed = active.filter((doc) => selected.has(doc.data().athleteId))
      for (const doc of removed)
        transaction.update(doc.ref, { status: 'cancelled', cancelledAt: now, updatedAt: now })
      return {
        removed: removed.map((doc) => ({ ...doc.data(), id: doc.id }) as Booking),
        cancelled: removed.length === active.length,
      }
    })
    if (!result)
      return NextResponse.json(
        { error: 'La clase cambió. Actualiza la agenda e inténtalo de nuevo.' },
        { status: 409 }
      )
    for (const booking of result.removed) {
      await notifyBookingByCoach({
        athleteId: booking.athleteId,
        coachId: booking.coachId,
        coachName: booking.coachName,
        date: booking.date,
        startTime: booking.startTime,
        locationName: booking.locationName,
        bookingId: booking.id,
        cancelled: true,
      }).catch((error) => console.error('[COACH_BOOKING_CANCEL_NOTIFY_INAPP]', error))
    }
    return NextResponse.json({
      ok: true,
      cancelled: result.cancelled,
      removedCount: result.removed.length,
    })
  }
  await ref.set({ status: 'cancelled', cancelledAt: now, updatedAt: now }, { merge: true })

  const cancelled = current.data() as Booking
  await syncCoachCreatedSlotGroupType(
    verification.caller.uid,
    cancelled.date,
    cancelled.startTime,
    schoolId
  )

  try {
    await notifyBookingByCoach({
      athleteId: cancelled.athleteId,
      coachId: verification.caller.uid,
      coachName: cancelled.coachName,
      date: cancelled.date,
      startTime: cancelled.startTime,
      locationName: cancelled.locationName,
      bookingId: id,
      cancelled: true,
    })
  } catch (error) {
    console.error('[COACH_BOOKING_CANCEL_NOTIFY_INAPP]', error)
  }

  return NextResponse.json({ ok: true, status: 'cancelled' })
}

export const POST = withSchoolAgendaUpdate(handlePOST)
export const PATCH = withSchoolAgendaUpdate(handlePATCH)
export const DELETE = withSchoolAgendaUpdate(handleDELETE)
