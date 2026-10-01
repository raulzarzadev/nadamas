import { normalizeSchoolMembership } from '@/lib/school'
import 'server-only'

import { NextResponse } from 'next/server'
import { type SchoolMembership, type SchoolRole, schoolMembershipHasRole } from '@/lib/school'
import { adminAuth, adminDb } from './firebase-admin'

export function getBearerToken(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer (.+)$/i)
  return match?.[1] || null
}

export async function getSchoolCaller(request: Request) {
  const token = getBearerToken(request)
  if (!token) return null
  try {
    return await adminAuth.verifyIdToken(token)
  } catch {
    return null
  }
}

export async function getSchoolMembership(schoolId: string, userId: string) {
  const snapshot = await adminDb.collection('schoolMemberships').doc(`${schoolId}_${userId}`).get()
  if (!snapshot.exists) return null
  return normalizeSchoolMembership({
    id: snapshot.id,
    ...(snapshot.data() as Omit<SchoolMembership, 'id'>),
  })
}

export async function isGlobalAdmin(userId: string) {
  const snapshot = await adminDb.collection('users').doc(userId).get()
  return snapshot.data()?.roles?.admin === true
}

export async function schoolPeopleAreValid(
  schoolId: string,
  teacherIds: string[],
  studentIds: string[]
) {
  const [teacherSnapshots, studentSnapshots] = await Promise.all([
    Promise.all(
      [...new Set(teacherIds)].map((userId) =>
        adminDb.collection('schoolMemberships').doc(`${schoolId}_${userId}`).get()
      )
    ),
    Promise.all(
      [...new Set(studentIds)].map((studentId) =>
        adminDb.collection('schoolStudents').doc(studentId).get()
      )
    ),
  ])

  const teachersValid = teacherSnapshots.every(
    (snapshot) =>
      snapshot.exists &&
      snapshot.data()?.schoolId === schoolId &&
      schoolMembershipHasRole(snapshot.data() as SchoolMembership, 'teacher') &&
      snapshot.data()?.status === 'active'
  )
  const studentsValid = studentSnapshots.every(
    (snapshot) => snapshot.exists && snapshot.data()?.schoolId === schoolId
  )
  return teachersValid && studentsValid
}

export async function requireSchoolAccess(
  request: Request,
  schoolId: string,
  allowedRoles?: SchoolRole[]
) {
  const caller = await getSchoolCaller(request)
  if (!caller) return { response: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) }

  const globalAdmin = await isGlobalAdmin(caller.uid)
  const membership = await getSchoolMembership(schoolId, caller.uid)
  const allowed =
    globalAdmin ||
    Boolean(
      membership &&
        membership.status === 'active' &&
        (!allowedRoles || allowedRoles.some((role) => schoolMembershipHasRole(membership, role)))
    )
  if (!allowed) {
    return { response: NextResponse.json({ error: 'No autorizado.' }, { status: 403 }) }
  }

  return { caller, membership, globalAdmin }
}
