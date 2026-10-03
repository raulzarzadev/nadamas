import 'server-only'

import {
  type SchoolGender,
  type SchoolMembership,
  type SchoolStudent,
  schoolMembershipHasRole,
} from '@/lib/school'
import { adminDb } from './firebase-admin'

export function isMinor(birthDate: string) {
  const birth = new Date(`${birthDate}T00:00:00Z`)
  if (Number.isNaN(birth.getTime())) return false
  if (birth.getTime() > Date.now()) return false
  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age < 18
}

export async function listSchoolStudents(
  schoolId: string,
  guardianId?: string,
  studentUserId?: string
) {
  const snapshot = await adminDb
    .collection('schoolStudents')
    .where('schoolId', '==', schoolId)
    .get()
  const students = snapshot.docs
    .map((doc) => ({
      id: doc.id,
      studentEmail: '',
      ...(doc.data() as Omit<SchoolStudent, 'id'>),
    }))
    .filter(
      (student) =>
        (!guardianId && !studentUserId) ||
        student.studentUserId === (studentUserId || guardianId) ||
        (student.managerIds || student.guardianIds || []).includes(
          studentUserId || guardianId || ''
        )
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  // Older invitation flows could leave multiple documents for the same linked profile.
  // Keep one roster entry per account participant / Additional while preserving records
  // without a stable linked identity (school-managed students can share a name).
  const seenParticipants = new Set<string>()
  const uniqueStudents = students.filter((student) => {
    const participantId = student.additionalProfileId
      ? `additional:${student.additionalProfileId}`
      : student.studentUserId
        ? `account:${student.studentUserId}`
        : ''
    if (!participantId) return true
    if (seenParticipants.has(participantId)) return false
    seenParticipants.add(participantId)
    return true
  })

  const accountId = studentUserId || guardianId
  if (!uniqueStudents.length && accountId) {
    const membershipRef = adminDb.collection('schoolMemberships').doc(`${schoolId}_${accountId}`)
    const [membershipSnapshot, userSnapshot] = await Promise.all([
      membershipRef.get(),
      adminDb.collection('users').doc(accountId).get(),
    ])
    const membership = membershipSnapshot.data()
    if (
      membershipSnapshot.exists &&
      membership?.status === 'active' &&
      schoolMembershipHasRole(membership as SchoolMembership, 'student')
    ) {
      const user = userSnapshot.data() || {}
      const name =
        [user.firstName, user.lastName]
          .filter((part) => typeof part === 'string' && part)
          .join(' ') ||
        (typeof user.nickname === 'string' && user.nickname.trim()) ||
        (typeof user.displayName === 'string' && user.displayName.trim()) ||
        (typeof user.name === 'string' && user.name.trim()) ||
        'Atleta'
      return [
        {
          id: accountId,
          schoolId,
          name,
          studentEmail: '',
          birthDate: '',
          gender: 'otro',
          guardianIds: [],
          managerIds: [],
          guardianName: '',
          guardianRelationship: '',
          guardianPhone: '',
          guardianEmail: '',
          studentUserId: accountId,
          status: 'active',
          createdAt: 0,
          updatedAt: 0,
          accountParticipant: true,
        } satisfies SchoolStudent,
      ]
    }
  }
  return uniqueStudents
}

export async function createSchoolStudent(args: {
  schoolId: string
  guardianId?: string
  guardianEmail: string
  name: string
  birthDate: string
  gender: SchoolGender
  guardianName: string
  guardianRelationship: string
  guardianPhone: string
  studentEmail?: string
  additionalProfileId?: string
  studentUserId?: string
}) {
  const now = Date.now()
  const linkedId = args.additionalProfileId || args.studentUserId
  const ref = linkedId
    ? adminDb.collection('schoolStudents').doc(`${args.schoolId}_${linkedId}`)
    : adminDb.collection('schoolStudents').doc()
  if (linkedId) {
    const current = await ref.get()
    if (current.exists) {
      const student = current.data() as SchoolStudent
      const managedBy = [...(student.managerIds || []), ...(student.guardianIds || [])]
      const sameAccount = args.studentUserId && student.studentUserId === args.studentUserId
      if (
        student.schoolId !== args.schoolId ||
        (!sameAccount && !managedBy.includes(args.guardianId || ''))
      ) {
        throw new Error('SCHOOL_STUDENT_ALREADY_LINKED')
      }
      return { ...student, id: ref.id }
    }
  }
  const student: SchoolStudent = {
    id: ref.id,
    schoolId: args.schoolId,
    name: args.name.trim().slice(0, 120),
    birthDate: args.birthDate,
    gender: args.gender,
    managerIds: args.guardianId ? [args.guardianId] : [],
    ...(args.additionalProfileId ? { additionalProfileId: args.additionalProfileId } : {}),
    ...(args.studentUserId ? { studentUserId: args.studentUserId, accountParticipant: true } : {}),
    guardianIds: args.guardianId ? [args.guardianId] : [],
    guardianName: args.guardianName.trim().slice(0, 120),
    guardianRelationship: args.guardianRelationship.trim().slice(0, 60),
    guardianPhone: args.guardianPhone.trim().slice(0, 40),
    guardianEmail: args.guardianEmail.trim().toLowerCase(),
    studentEmail: args.studentEmail?.trim().toLowerCase() || '',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(student)
  return student
}
