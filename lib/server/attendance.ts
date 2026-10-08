import 'server-only'
import { createHash } from 'node:crypto'
import type { Transaction } from 'firebase-admin/firestore'
import { type AthleteCredential, parseCredentialQr } from '@/lib/athlete-identity'
import {
  type AttendanceCandidate,
  type AttendanceMethod,
  type AttendanceRecord,
  attendanceEnrollmentPolicy,
} from '@/lib/attendance'
import { buildAvailableSlots } from '@/lib/coach-agenda'
import { resolveOfferings } from '@/lib/coach-offerings'
import {
  type SchoolClassOccurrence,
  type SchoolMembership,
  type SchoolStudent,
  UNASSIGNED_SCHOOL_COACH_ID,
} from '@/lib/school'
import {
  ensureAthleteIdentity,
  findAthleteIdentity,
  getIdentityProfile,
} from './athlete-identities'
import { adminDb } from './firebase-admin'
import {
  coalesceGroupClassOccurrences,
  legacySchoolOfferings,
  schoolScheduleOwners,
} from './school-agenda'
import { listSchoolStudents } from './school-students'

export function attendanceClassMatches(a: SchoolClassOccurrence, b: SchoolClassOccurrence) {
  return (
    a.id === b.id ||
    (a.type === 'group' &&
      b.type === 'group' &&
      a.schoolId === b.schoolId &&
      a.date === b.date &&
      a.startTime === b.startTime &&
      a.endTime === b.endTime &&
      a.title.trim().toLocaleLowerCase('es') === b.title.trim().toLocaleLowerCase('es') &&
      [...a.teacherIds].sort().join('|') === [...b.teacherIds].sort().join('|'))
  )
}

export type AttendanceClass = SchoolClassOccurrence & {
  attendanceVirtual?: boolean
  sourceCoachId?: string
}

async function availableAttendanceClasses(
  schoolId: string,
  date: string,
  teacherId?: string
): Promise<AttendanceClass[]> {
  const memberships = await adminDb
    .collection('schoolMemberships')
    .where('schoolId', '==', schoolId)
    .get()
  const owners = schoolScheduleOwners(memberships.docs.map((doc) => doc.data() as SchoolMembership))
    .map((item) => item.userId)
    .filter((id) => !teacherId || id === teacherId)
  if (!teacherId) owners.push(UNASSIGNED_SCHOOL_COACH_ID)
  const [blocksSnapshot, bookingsSnapshot, schoolSnapshot] = await Promise.all([
    adminDb.collection('coachScheduleBlocks').where('schoolId', '==', schoolId).get(),
    adminDb.collection('bookings').where('schoolId', '==', schoolId).get(),
    adminDb.collection('schools').doc(schoolId).get(),
  ])
  const day = new Date(`${date}T12:00:00`)
  const results = await Promise.all(
    [...new Set(owners)].map(async (coachId) => {
      const [source, legacy] = await Promise.all([
        adminDb.collection('schoolCoachOfferings').doc(`${schoolId}_${coachId}`).get(),
        adminDb.collection('schoolAvailability').doc(`${schoolId}_${coachId}`).get(),
      ])
      const offerings = source.exists
        ? resolveOfferings({
            classOfferings: source.data()?.classOfferings || [],
            teachingLocations: [],
            priceOptions: [],
          })
        : legacySchoolOfferings(legacy.data()?.weeklySlots)
      const slots = buildAvailableSlots({
        coachId,
        offerings,
        bookings: bookingsSnapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .filter((item) => (item as { coachId?: string }).coachId === coachId) as Parameters<
          typeof buildAvailableSlots
        >[0]['bookings'],
        blocks: blocksSnapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .filter((item) => (item as { coachId?: string }).coachId === coachId) as Parameters<
          typeof buildAvailableSlots
        >[0]['blocks'],
        startDate: day,
        endDate: day,
      })
      return slots
        .filter((slot) => slot.status === 'available')
        .map((slot) => {
          const maxPeople = offerings.find((item) => item.id === slot.offeringId)?.maxPeople
          const digest = createHash('sha256')
            .update(`${schoolId}|${coachId}|${date}|${slot.startTime}|${slot.endTime}`)
            .digest('hex')
            .slice(0, 32)
          return {
            id: `attendance:${date}:${digest}`,
            seriesId: '',
            schoolId,
            title: '',
            type: slot.groupType === 'grupal' ? ('group' as const) : ('individual' as const),
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            timezone: schoolSnapshot.data()?.timezone || 'America/Mexico_City',
            teacherIds: coachId === UNASSIGNED_SCHOOL_COACH_ID ? [] : [coachId],
            studentIds: [],
            location: slot.locationName,
            locationUrl: '',
            status: 'scheduled' as const,
            createdAt: 0,
            updatedAt: 0,
            ...(slot.groupType === 'grupal' && typeof maxPeople === 'number' && maxPeople > 0
              ? { capacity: Math.max(2, maxPeople) }
              : {}),
            attendanceVirtual: true,
            sourceCoachId: coachId,
          }
        })
    })
  )
  return results.flat()
}

export async function attendanceClasses(
  schoolId: string,
  date: string,
  teacherId?: string
): Promise<AttendanceClass[]> {
  const snapshot = await adminDb
    .collection('schoolClassOccurrences')
    .where('schoolId', '==', schoolId)
    .get()
  const actual = coalesceGroupClassOccurrences(
    snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }) as SchoolClassOccurrence)
      .filter(
        (item) =>
          item.date === date &&
          item.status !== 'cancelled' &&
          (!teacherId || item.teacherIds.includes(teacherId))
      )
  )
  const available = await availableAttendanceClasses(schoolId, date, teacherId)
  return [
    ...actual,
    ...available.filter(
      (slot) =>
        !actual.some(
          (item) =>
            item.startTime === slot.startTime &&
            item.endTime === slot.endTime &&
            [...item.teacherIds].sort().join('|') === [...slot.teacherIds].sort().join('|')
        )
    ),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime))
}

function studentIdentity(student: SchoolStudent) {
  return student.additionalProfileId
    ? { type: 'additional' as const, id: student.additionalProfileId }
    : student.studentUserId
      ? { type: 'user' as const, id: student.studentUserId }
      : student.accountParticipant
        ? { type: 'user' as const, id: student.id }
        : null
}

export async function attendanceCandidate(
  student: SchoolStudent,
  occurrence: SchoolClassOccurrence,
  recorded: Set<string>
): Promise<AttendanceCandidate> {
  const identity = studentIdentity(student)
  const numericId = identity
    ? (await ensureAthleteIdentity(identity.type, identity.id)).numericId
    : undefined
  return {
    studentId: student.id,
    name: student.name,
    ...(numericId ? { numericId } : {}),
    inSchool: true,
    enrolled: occurrence.studentIds.includes(student.id),
    pending:
      'pendingStudentIds' in occurrence
        ? (occurrence.pendingStudentIds as string[]).includes(student.id)
        : occurrence.status === 'pending',
    attended: recorded.has(student.id),
  }
}

export async function resolveAttendancePerson(
  schoolId: string,
  args: { studentId?: string; numericId?: string; qrValue?: string }
) {
  const students = await listSchoolStudents(schoolId)
  if (args.studentId) {
    const student = students.find((item) => item.id === args.studentId && item.status === 'active')
    return student ? { student, profile: null } : null
  }
  const qrToken = args.qrValue ? parseCredentialQr(args.qrValue) : null
  if (args.qrValue && !qrToken) return null
  const identity = await findAthleteIdentity({
    numericId: args.numericId,
    ...(qrToken ? { qrToken } : {}),
  })
  if (!identity) return null
  const profile = await getIdentityProfile(identity)
  if (!profile) return null
  const student = students.find(
    (item) =>
      item.status === 'active' &&
      (identity.profileType === 'additional'
        ? item.additionalProfileId === identity.profileId
        : item.studentUserId === identity.profileId ||
          (item.accountParticipant && item.id === identity.profileId))
  )
  return { student: student || null, profile }
}

export async function listAttendanceRoster(schoolId: string, occurrence: SchoolClassOccurrence) {
  const recordsSnapshot = await adminDb
    .collection('schools')
    .doc(schoolId)
    .collection('attendance')
    .get()
  const records = recordsSnapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }) as AttendanceRecord)
    .filter(
      (record) =>
        record.occurrenceId === occurrence.id ||
        ('sourceOccurrenceIds' in occurrence &&
          (occurrence.sourceOccurrenceIds as string[]).includes(record.occurrenceId))
    )
  const students = (await listSchoolStudents(schoolId)).filter(
    (student) => student.status === 'active'
  )
  const recorded = new Set(records.map((record) => record.studentId))
  const legacyRecords = await adminDb
    .collection('agendaStudentRecords')
    .where('schoolId', '==', schoolId)
    .get()
  const sourceIds = new Set([
    occurrence.id,
    ...('sourceOccurrenceIds' in occurrence ? (occurrence.sourceOccurrenceIds as string[]) : []),
  ])
  for (const doc of legacyRecords.docs) {
    const record = doc.data()
    if (sourceIds.has(record.sourceId) && record.attended === true) recorded.add(record.studentId)
  }
  const roster = await Promise.all(
    students
      .filter((student) => occurrence.studentIds.includes(student.id))
      .map((student) => attendanceCandidate(student, occurrence, recorded))
  )
  return { roster, records, students, recorded }
}

async function readBlocks(transaction: Transaction, schoolId: string) {
  return transaction.get(
    adminDb.collection('coachScheduleBlocks').where('schoolId', '==', schoolId)
  )
}

export async function recordAttendance(args: {
  schoolId: string
  occurrenceId: string
  actorId: string
  director: boolean
  method: AttendanceMethod
  student: SchoolStudent | null
  profile: AthleteCredential | null
  addToClass: boolean
  linkToSchool: boolean
  promoteToGroup: boolean
  virtualOccurrence?: AttendanceClass
}) {
  // School links are deterministic and created in the same transaction as enrollment + attendance.
  const profileId = args.profile?.profileId
  const studentId = args.student?.id || (profileId ? `${args.schoolId}_${profileId}` : '')
  if (!studentId) return { code: 'missing_person' as const }
  const studentRef = adminDb.collection('schoolStudents').doc(studentId)
  return adminDb.runTransaction(async (transaction) => {
    const [snapshot, blocks, studentSnapshot] = await Promise.all([
      transaction.get(
        adminDb.collection('schoolClassOccurrences').where('schoolId', '==', args.schoolId)
      ),
      readBlocks(transaction, args.schoolId),
      transaction.get(studentRef),
    ])
    const existingSelected = snapshot.docs.find((doc) => doc.id === args.occurrenceId)
    const virtual = args.virtualOccurrence
    if (!existingSelected && !virtual) return { code: 'missing_class' as const }
    const selected = existingSelected || {
      id: args.occurrenceId,
      ref: adminDb.collection('schoolClassOccurrences').doc(args.occurrenceId),
      data: () => virtual || {},
    }
    if (!existingSelected && virtual) {
      const coachId = virtual.sourceCoachId || virtual.teacherIds[0] || UNASSIGNED_SCHOOL_COACH_ID
      const [source, legacy, legacyBookings] = await Promise.all([
        transaction.get(
          adminDb.collection('schoolCoachOfferings').doc(`${args.schoolId}_${coachId}`)
        ),
        transaction.get(
          adminDb.collection('schoolAvailability').doc(`${args.schoolId}_${coachId}`)
        ),
        transaction.get(adminDb.collection('bookings').where('schoolId', '==', args.schoolId)),
      ])
      const offerings = source.exists
        ? resolveOfferings({
            classOfferings: source.data()?.classOfferings || [],
            teachingLocations: [],
            priceOptions: [],
          })
        : legacySchoolOfferings(legacy.data()?.weeklySlots)
      const day = new Date(`${virtual.date}T12:00:00`)
      const slots = buildAvailableSlots({
        coachId,
        offerings,
        bookings: legacyBookings.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .filter((item) => (item as { coachId?: string }).coachId === coachId) as Parameters<
          typeof buildAvailableSlots
        >[0]['bookings'],
        blocks: [],
        startDate: day,
        endDate: day,
      })
      if (
        !slots.some(
          (slot) =>
            slot.status === 'available' &&
            slot.startTime === virtual.startTime &&
            slot.endTime === virtual.endTime &&
            (slot.groupType === 'grupal') === (virtual.type === 'group')
        )
      )
        return { code: 'missing_class' as const }
      const overlapping = snapshot.docs.some((doc) => {
        const item = doc.data()
        return (
          item.status !== 'cancelled' &&
          item.date === virtual.date &&
          item.startTime < virtual.endTime &&
          item.endTime > virtual.startTime &&
          (item.teacherIds?.includes(coachId) ||
            (coachId === UNASSIGNED_SCHOOL_COACH_ID && !item.teacherIds?.length))
        )
      })
      if (overlapping) return { code: 'missing_class' as const }
    }
    const occurrence = { ...selected.data(), id: selected.id } as SchoolClassOccurrence
    if (!args.director && !occurrence.teacherIds.includes(args.actorId))
      return { code: 'unauthorized' as const }
    if (studentSnapshot.exists && studentSnapshot.data()?.schoolId !== args.schoolId)
      return { code: 'missing_person' as const }
    if (studentSnapshot.exists && studentSnapshot.data()?.status !== 'active')
      return { code: 'inactive_student' as const }
    const matches = snapshot.docs.filter((doc) => {
      const item = { ...doc.data(), id: doc.id } as SchoolClassOccurrence
      return item.status !== 'cancelled' && attendanceClassMatches(occurrence, item)
    })
    const enrolledSources = matches.filter((doc) =>
      (doc.data().studentIds || []).includes(studentId)
    )
    const enrolled = enrolledSources.length > 0
    // If a merged group contains a pending participant, preserve the original pending source.
    const target = enrolledSources[0] || selected
    const targetOccurrence = { ...target.data(), id: target.id } as SchoolClassOccurrence
    const recordRef = adminDb
      .collection('schools')
      .doc(args.schoolId)
      .collection('attendance')
      .doc(encodeURIComponent(`${args.schoolId}|${target.id}|${studentId}`))
    const agendaRef = adminDb
      .collection('agendaStudentRecords')
      .doc(`class-${target.id}-${studentId}`)
    const [existingRecord, existingAgenda] = await Promise.all([
      transaction.get(recordRef),
      transaction.get(agendaRef),
    ])
    const blocked = blocks.docs.some((doc) => {
      const block = doc.data()
      return (
        block.date === occurrence.date &&
        (occurrence.teacherIds.includes(block.coachId) ||
          (!occurrence.teacherIds.length && block.coachId === UNASSIGNED_SCHOOL_COACH_ID)) &&
        (block.allDay ||
          (block.startTime < occurrence.endTime && block.endTime > occurrence.startTime))
      )
    })
    const capacitySources = await Promise.all(
      (occurrence.teacherIds.length ? occurrence.teacherIds : [UNASSIGNED_SCHOOL_COACH_ID]).map(
        (coachId) =>
          transaction.get(
            adminDb.collection('schoolCoachOfferings').doc(`${args.schoolId}_${coachId}`)
          )
      )
    )
    const capacityLimits = capacitySources.flatMap((source) => {
      const offerings = resolveOfferings({
        classOfferings: source.data()?.classOfferings || [],
        teachingLocations: [],
        priceOptions: [],
      })
      const day = new Date(`${occurrence.date}T12:00:00`)
      const slots = buildAvailableSlots({
        coachId: 'capacity',
        offerings,
        bookings: [],
        blocks: [],
        startDate: day,
        endDate: day,
      })
      return slots
        .filter(
          (slot) =>
            slot.startTime === occurrence.startTime &&
            slot.endTime === occurrence.endTime &&
            slot.groupType === 'grupal'
        )
        .flatMap((slot) => {
          const max = offerings.find((item) => item.id === slot.offeringId)?.maxPeople
          return typeof max === 'number' && max > 0 ? [Math.max(2, max)] : []
        })
    })
    const capacity = Math.min(
      100,
      ...capacityLimits,
      ...(occurrence.capacity ? [occurrence.capacity] : [])
    )
    const combinedIds = [
      ...new Set(matches.flatMap((doc) => doc.data().studentIds || [])),
    ] as string[]
    const failure = attendanceEnrollmentPolicy({
      occurrence: {
        ...occurrence,
        studentIds: combinedIds,
        classFull:
          matches.some((doc) => doc.data().classFull) ||
          (!enrolled && combinedIds.length >= capacity),
      },
      enrolled,
      inSchool: Boolean(args.student || studentSnapshot.exists),
      blocked,
      director: args.director,
      addToClass: args.addToClass,
      linkToSchool: args.linkToSchool,
      promoteToGroup: args.promoteToGroup,
    })
    if (failure) return { code: failure }
    if (existingRecord.exists || (enrolled && existingAgenda.data()?.attended === true))
      return {
        code: 'ok' as const,
        alreadyRecorded: true,
        studentId,
        record: existingRecord.data() as AttendanceRecord | undefined,
      }
    const now = Date.now()
    if (!args.student && !studentSnapshot.exists && args.profile) {
      // This is a roster relationship only; it does not grant account roles or school access.
      const owner =
        args.profile.profileType === 'additional'
          ? await transaction.get(
              adminDb.collection('additionalProfiles').doc(args.profile.profileId)
            )
          : null
      const ownerId = owner?.data()?.ownerId
      transaction.set(studentRef, {
        id: studentId,
        schoolId: args.schoolId,
        name: args.profile.name,
        birthDate: args.profile.birthDate || '',
        gender: args.profile.gender || 'otro',
        ...(args.profile.profileType === 'additional'
          ? {
              additionalProfileId: profileId,
              managerIds: ownerId ? [ownerId] : [],
              guardianIds: ownerId ? [ownerId] : [],
            }
          : {
              studentUserId: profileId,
              accountParticipant: true,
              managerIds: [],
              guardianIds: [],
            }),
        guardianName: '',
        guardianRelationship: '',
        guardianPhone: '',
        guardianEmail: '',
        studentEmail: '',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        linkedBy: args.actorId,
        linkedVia: 'attendance',
      })
    }
    if (!enrolled) {
      const changes = {
        studentIds: [...new Set([...occurrence.studentIds, studentId])],
        ...(occurrence.type === 'individual' && combinedIds.length ? { type: 'group' } : {}),
        updatedAt: now,
      }
      if (existingSelected) transaction.update(selected.ref, changes)
      else {
        const {
          attendanceVirtual: _virtual,
          sourceCoachId: _source,
          ...stored
        } = occurrence as AttendanceClass
        transaction.set(selected.ref, {
          ...stored,
          ...changes,
          createdAt: now,
          seriesId: selected.id,
        })
      }
    }
    const record: AttendanceRecord = {
      id: recordRef.id,
      schoolId: args.schoolId,
      occurrenceId: target.id,
      studentId,
      actorId: args.actorId,
      recordedAt: now,
      method: args.method,
    }
    transaction.set(recordRef, record)
    transaction.set(
      agendaRef,
      {
        sourceId: target.id,
        studentId,
        schoolId: args.schoolId,
        coachId: targetOccurrence.teacherIds[0] || '',
        attended: true,
        updatedAt: now,
        attendanceActorId: args.actorId,
        attendanceMethod: args.method,
        attendanceRecordedAt: now,
      },
      { merge: true }
    )
    return { code: 'ok' as const, alreadyRecorded: false, studentId, record }
  })
}
