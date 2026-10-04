import { NextResponse } from 'next/server'
import { buildAvailableSlots, type CoachScheduleBlock } from '@/lib/coach-agenda'
import type { Booking } from '@/lib/coach-booking'
import { resolveOfferings } from '@/lib/coach-offerings'
import { type SchoolClassOccurrence, schoolMembershipHasRole } from '@/lib/school'
import { adminDb } from '@/lib/server/firebase-admin'
import { getSchoolMembership, requireSchoolAccess } from '@/lib/server/school-access'
import { legacySchoolOfferings } from '@/lib/server/school-agenda'
import { withSchoolAgendaUpdate } from '@/lib/server/school-agenda-updates'
import { createSchoolClass } from '@/lib/server/school-classes'
import { getSchoolById } from '@/lib/server/schools'

export const runtime = 'nodejs'

type RouteProps = { params: Promise<{ schoolId: string; studentId: string }> }
type SlotInput = {
  date: string
  startTime: string
  endTime: string
  coachId: string
  groupType: 'particular' | 'grupal'
  schoolClassId?: string
}

function validSlot(slot: unknown): slot is SlotInput {
  if (!slot || typeof slot !== 'object') return false
  const value = slot as Record<string, unknown>
  return (
    typeof value.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    typeof value.startTime === 'string' &&
    /^\d{2}:\d{2}$/.test(value.startTime) &&
    typeof value.endTime === 'string' &&
    /^\d{2}:\d{2}$/.test(value.endTime) &&
    value.startTime < value.endTime &&
    typeof value.coachId === 'string' &&
    value.coachId.length > 0 &&
    (value.groupType === 'particular' || value.groupType === 'grupal') &&
    (value.schoolClassId === undefined || typeof value.schoolClassId === 'string')
  )
}

async function assignToExistingClass(
  schoolId: string,
  studentId: string,
  slot: SlotInput,
  callerId: string,
  isDirector: boolean
) {
  if (!slot.schoolClassId) return false
  const classRef = adminDb.collection('schoolClassOccurrences').doc(slot.schoolClassId)
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(classRef)
    if (!snapshot.exists) return false
    const occurrence = snapshot.data() as SchoolClassOccurrence
    if (
      occurrence.schoolId !== schoolId ||
      slot.groupType !== 'grupal' ||
      occurrence.type !== 'group' ||
      !['scheduled', 'pending'].includes(occurrence.status) ||
      occurrence.date !== slot.date ||
      occurrence.startTime !== slot.startTime ||
      occurrence.endTime !== slot.endTime ||
      !occurrence.teacherIds.includes(slot.coachId) ||
      (!isDirector && !occurrence.teacherIds.includes(callerId)) ||
      occurrence.classFull === true
    )
      return false
    const currentIds = Array.isArray(occurrence.studentIds) ? occurrence.studentIds : []
    if (currentIds.includes(studentId) || currentIds.length >= 100) return false
    transaction.update(classRef, {
      studentIds: [...currentIds, studentId],
      updatedAt: Date.now(),
    })
    return true
  })
}

async function assignToOpenSlot(
  schoolId: string,
  studentId: string,
  slot: SlotInput,
  timezone: string,
  isDirector: boolean,
  callerId: string
) {
  const membership = await getSchoolMembership(schoolId, slot.coachId)
  if (
    !membership ||
    membership.status !== 'active' ||
    !schoolMembershipHasRole(membership, 'teacher') ||
    (!isDirector && slot.coachId !== callerId)
  )
    return false

  const [offeringSnapshot, legacySnapshot, bookingSnapshot, blockSnapshot, classSnapshot] =
    await Promise.all([
      adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${slot.coachId}`).get(),
      adminDb.collection('schoolAvailability').doc(`${schoolId}_${slot.coachId}`).get(),
      adminDb.collection('bookings').where('schoolId', '==', schoolId).get(),
      adminDb.collection('coachScheduleBlocks').where('schoolId', '==', schoolId).get(),
      adminDb.collection('schoolClassOccurrences').where('schoolId', '==', schoolId).get(),
    ])
  const existingClasses = classSnapshot.docs.map((doc) => doc.data() as SchoolClassOccurrence)
  const matchingClass =
    slot.groupType === 'grupal' &&
    existingClasses.find(
      (item) =>
        item.date === slot.date &&
        item.startTime === slot.startTime &&
        item.endTime === slot.endTime &&
        item.type === 'group' &&
        item.status !== 'cancelled' &&
        item.teacherIds.includes(slot.coachId)
    )
  if (matchingClass) return false

  const offerings = offeringSnapshot.exists
    ? resolveOfferings({ classOfferings: offeringSnapshot.data()?.classOfferings || [] })
    : legacySchoolOfferings(legacySnapshot.data()?.weeklySlots)
  const bookings = bookingSnapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as Booking)
    .filter((booking) => booking.coachId === slot.coachId && booking.status !== 'cancelled')
  const blocks = blockSnapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as CoachScheduleBlock)
    .filter((block) => block.coachId === slot.coachId)
  const date = new Date(`${slot.date}T12:00:00`)
  const available = buildAvailableSlots({
    coachId: slot.coachId,
    offerings,
    bookings,
    blocks,
    startDate: date,
    endDate: date,
  }).some(
    (item) =>
      item.date === slot.date &&
      item.startTime === slot.startTime &&
      item.endTime === slot.endTime &&
      item.groupType === slot.groupType &&
      item.status === 'available'
  )
  if (!available) return false

  const parsedDate = new Date(`${slot.date}T00:00:00Z`)
  await createSchoolClass({
    schoolId,
    title: slot.groupType === 'grupal' ? 'Clase grupal' : 'Clase particular',
    type: slot.groupType === 'grupal' ? 'group' : 'individual',
    teacherIds: [slot.coachId],
    studentIds: [studentId],
    startDate: slot.date,
    endDate: slot.date,
    daysOfWeek: [parsedDate.getUTCDay()],
    startTime: slot.startTime,
    endTime: slot.endTime,
    timezone,
    location: '',
    locationUrl: '',
    visibility: 'private',
    recurring: false,
  })
  return true
}

export const POST = withSchoolAgendaUpdate(async (request: Request, { params }: RouteProps) => {
  const { schoolId, studentId } = await params
  const access = await requireSchoolAccess(request, schoolId, ['director', 'teacher'])
  if (access.response) return access.response
  const isDirector = access.globalAdmin || schoolMembershipHasRole(access.membership, 'director')
  const body = await request.json().catch(() => ({}))
  const slots = body && typeof body === 'object' ? (body as { slots?: unknown }).slots : undefined
  if (!Array.isArray(slots) || !slots.length || slots.length > 30 || !slots.every(validSlot))
    return NextResponse.json(
      { error: 'Selecciona uno o varios horarios válidos.' },
      { status: 400 }
    )

  const studentSnapshot = await adminDb.collection('schoolStudents').doc(studentId).get()
  const student = studentSnapshot.data()
  if (!studentSnapshot.exists || student?.schoolId !== schoolId)
    return NextResponse.json({ error: 'Alumno no encontrado.' }, { status: 404 })
  const school = await getSchoolById(schoolId)
  const timezone = school?.timezone || 'America/Mexico_City'
  let assignedCount = 0
  const failedKeys: string[] = []
  const uniqueSlots = [
    ...new Map(
      (slots as SlotInput[]).map((slot) => [
        `${slot.coachId}|${slot.date}|${slot.startTime}|${slot.groupType}`,
        slot,
      ])
    ).values(),
  ]

  for (const slot of uniqueSlots) {
    const key = `${slot.coachId}|${slot.date}|${slot.startTime}|${slot.groupType}`
    try {
      const assigned = slot.schoolClassId
        ? await assignToExistingClass(
            schoolId,
            studentSnapshot.id,
            slot,
            access.caller.uid,
            isDirector
          )
        : await assignToOpenSlot(
            schoolId,
            studentSnapshot.id,
            slot,
            timezone,
            isDirector,
            access.caller.uid
          )
      if (assigned) assignedCount += 1
      else failedKeys.push(key)
    } catch {
      failedKeys.push(key)
    }
  }

  return NextResponse.json({ ok: assignedCount > 0, assignedCount, failedKeys })
})
