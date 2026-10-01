import 'server-only'

import type { SchoolGender, SchoolStudent } from '@/lib/school'
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
  return snapshot.docs
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
}) {
  const now = Date.now()
  const ref = args.additionalProfileId
    ? adminDb.collection('schoolStudents').doc(`${args.schoolId}_${args.additionalProfileId}`)
    : adminDb.collection('schoolStudents').doc()
  if (args.additionalProfileId) {
    const current = await ref.get()
    if (current.exists) {
      const student = current.data() as SchoolStudent
      const managedBy = [...(student.managerIds || []), ...(student.guardianIds || [])]
      if (student.schoolId !== args.schoolId || !managedBy.includes(args.guardianId || '')) {
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
