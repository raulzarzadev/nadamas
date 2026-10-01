import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import type { DecodedIdToken } from 'firebase-admin/auth'
import type {
  SchoolGender,
  SchoolInvitation,
  SchoolInvitationRole,
  SchoolInvitationStudentData,
  SchoolMembership,
  SchoolRole,
} from '@/lib/school'
import { adminDb } from './firebase-admin'
import { isMinor } from './school-students'

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase()
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSchoolInvitation(args: {
  schoolId: string
  email: string
  role: SchoolInvitationRole
  invitedBy: string
  studentId?: string
  studentData?: SchoolInvitationStudentData
}) {
  const token = randomBytes(32).toString('base64url')
  const now = Date.now()
  const ref = adminDb.collection('schoolInvitations').doc()
  const invitation: SchoolInvitation = {
    id: ref.id,
    schoolId: args.schoolId,
    email: normalizeInvitationEmail(args.email),
    role: args.role,
    status: 'pending',
    expiresAt: now + INVITATION_LIFETIME_MS,
    invitedBy: args.invitedBy,
    acceptedBy: null,
    acceptedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  if (args.studentId) invitation.studentId = args.studentId
  if (args.studentData) invitation.studentData = args.studentData
  await ref.set({ ...invitation, tokenHash: hashInvitationToken(token) })
  return { invitation, token }
}

export async function getInvitationByToken(token: string) {
  const snapshot = await adminDb
    .collection('schoolInvitations')
    .where('tokenHash', '==', hashInvitationToken(token))
    .limit(1)
    .get()
  if (snapshot.empty) return null
  return {
    ref: snapshot.docs[0].ref,
    ...(snapshot.docs[0].data() as SchoolInvitation & { tokenHash: string }),
  }
}

export async function getInvitationByIdForEmail(id: string, email: string) {
  const snapshot = await adminDb.collection('schoolInvitations').doc(id).get()
  if (!snapshot.exists) return null
  const data = snapshot.data() as SchoolInvitation & { tokenHash: string }
  if (normalizeInvitationEmail(data.email) !== normalizeInvitationEmail(email)) return null
  return { ref: snapshot.ref, ...data }
}

export async function listSchoolInvitationsForEmail(email: string) {
  const snapshot = await adminDb
    .collection('schoolInvitations')
    .where('email', '==', normalizeInvitationEmail(email))
    .get()
  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as Omit<SchoolInvitation, 'id'>
      const invitation: SchoolInvitation = {
        id: doc.id,
        schoolId: data.schoolId,
        email: data.email,
        role: data.role,
        studentId: data.studentId,
        studentData: data.studentData,
        status: data.status,
        expiresAt: data.expiresAt,
        invitedBy: data.invitedBy,
        acceptedBy: data.acceptedBy,
        acceptedAt: data.acceptedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
      return invitation.status === 'pending' && invitation.expiresAt <= Date.now()
        ? { ...invitation, status: 'expired' as const }
        : invitation
    })
    .filter((invitation) => invitation.status === 'pending' || invitation.status === 'expired')
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function listSchoolInvitations(schoolId: string) {
  const snapshot = await adminDb
    .collection('schoolInvitations')
    .where('schoolId', '==', schoolId)
    .get()
  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as Omit<SchoolInvitation, 'id'>
      const invitation: SchoolInvitation = {
        id: doc.id,
        schoolId: data.schoolId,
        email: data.email,
        role: data.role,
        status: data.status,
        expiresAt: data.expiresAt,
        invitedBy: data.invitedBy,
        acceptedBy: data.acceptedBy,
        acceptedAt: data.acceptedAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
      return invitation.status === 'pending' && invitation.expiresAt <= Date.now()
        ? { ...invitation, status: 'expired' as const }
        : invitation
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteSchoolInvitation(schoolId: string, invitationId: string) {
  const ref = adminDb.collection('schoolInvitations').doc(invitationId)
  const snapshot = await ref.get()
  if (!snapshot.exists || snapshot.data()?.schoolId !== schoolId) {
    return { ok: false as const, reason: 'not_found' as const }
  }
  if (snapshot.data()?.status === 'accepted') {
    return { ok: false as const, reason: 'accepted' as const }
  }
  await ref.delete()
  return { ok: true as const }
}

export async function acceptSchoolInvitation(args: {
  token: string
  caller: DecodedIdToken
  profile?: {
    name?: string
    phone?: string
    relationship?: string
    bio?: string
    birthDate?: string
    gender?: SchoolGender
    guardianName?: string
    guardianRelationship?: string
    guardianPhone?: string
    useInvitationData?: boolean
  }
}) {
  const invitation =
    (await getInvitationByToken(args.token)) ||
    (await getInvitationByIdForEmail(args.token, args.caller.email || ''))
  if (!invitation) return { ok: false as const, reason: 'not_found' as const }
  if (invitation.status !== 'pending')
    return {
      ok: false as const,
      reason: invitation.status as 'accepted' | 'expired' | 'revoked',
    }
  if (invitation.expiresAt <= Date.now()) {
    await invitation.ref.update({ status: 'expired', updatedAt: Date.now() })
    return { ok: false as const, reason: 'expired' as const }
  }

  const callerEmail = normalizeInvitationEmail(args.caller.email || '')
  if (!callerEmail || callerEmail !== invitation.email) {
    return { ok: false as const, reason: 'email_mismatch' as const }
  }
  const studentProfile =
    invitation.role === 'student' && args.profile?.useInvitationData && invitation.studentData
      ? invitation.studentData
      : args.profile
  if (invitation.role === 'student') {
    if (
      !studentProfile?.name?.trim() ||
      !studentProfile.birthDate ||
      !studentProfile.gender ||
      !['varonil', 'femenil', 'otro'].includes(studentProfile.gender)
    )
      return { ok: false as const, reason: 'student_profile' as const }
    const birthDate = new Date(`${studentProfile.birthDate}T00:00:00Z`)
    if (Number.isNaN(birthDate.getTime()) || birthDate.getTime() > Date.now())
      return { ok: false as const, reason: 'student_profile' as const }
    if (isMinor(studentProfile.birthDate))
      return { ok: false as const, reason: 'minor_requires_guardian' as const }
  }

  const now = Date.now()
  const membershipRef = adminDb
    .collection('schoolMemberships')
    .doc(`${invitation.schoolId}_${args.caller.uid}`)
  const profileRef = adminDb
    .collection('schoolProfiles')
    .doc(`${invitation.schoolId}_${args.caller.uid}`)
  const studentRef =
    invitation.role === 'student'
      ? adminDb
          .collection('schoolStudents')
          .doc(invitation.studentId || `${invitation.schoolId}_${args.caller.uid}`)
      : null

  const transactionResult = await adminDb.runTransaction(async (transaction) => {
    const membershipSnapshot = await transaction.get(membershipRef)
    const studentSnapshot = studentRef ? await transaction.get(studentRef) : null
    if (invitation.studentId && !studentSnapshot?.exists)
      return { ok: false as const, reason: 'student_not_found' as const }
    if (studentSnapshot?.exists && studentSnapshot.data()?.schoolId !== invitation.schoolId)
      return { ok: false as const, reason: 'student_not_found' as const }
    if (
      studentSnapshot?.exists &&
      studentSnapshot.data()?.studentUserId &&
      studentSnapshot.data()?.studentUserId !== args.caller.uid
    )
      return { ok: false as const, reason: 'student_already_linked' as const }

    const studentValues = studentProfile || {}
    const studentDocument = {
      id: studentRef?.id,
      schoolId: invitation.schoolId,
      studentUserId: args.caller.uid,
      name: studentValues.name?.trim() || args.caller.name || '',
      birthDate: studentValues.birthDate || '',
      gender: studentValues.gender,
      guardianIds: [],
      guardianName: studentValues.guardianName?.trim() || '',
      guardianRelationship: studentValues.guardianRelationship?.trim() || '',
      guardianPhone: studentValues.guardianPhone?.trim() || '',
      guardianEmail: '',
      status: 'active' as const,
      updatedAt: now,
    }
    if (membershipSnapshot.exists) {
      const existing = membershipSnapshot.data() as SchoolMembership
      const existingRoles = existing.roles?.length ? existing.roles : [existing.role]
      const roles = [...new Set([...existingRoles, invitation.role] as SchoolRole[])]
      transaction.update(membershipRef, {
        roles,
        updatedAt: now,
      })
      transaction.set(
        profileRef,
        {
          schoolId: invitation.schoolId,
          userId: args.caller.uid,
          role: invitation.role,
          name: studentValues.name?.trim() || args.caller.name || '',
          phone: args.profile?.phone?.trim() || '',
          relationship: args.profile?.relationship?.trim() || '',
          bio: args.profile?.bio?.trim() || '',
          birthDate: studentValues.birthDate || '',
          gender: studentValues.gender || null,
          profileComplete: Boolean(studentValues.name?.trim() || args.caller.name),
          updatedAt: now,
        },
        { merge: true }
      )
      if (studentRef) {
        if (studentSnapshot?.exists) {
          transaction.update(studentRef, studentDocument)
        } else {
          transaction.set(studentRef, { ...studentDocument, createdAt: now })
        }
      }
      transaction.update(invitation.ref, {
        status: 'accepted',
        acceptedBy: args.caller.uid,
        acceptedAt: now,
        updatedAt: now,
      })
      return { ok: true as const }
    }

    transaction.set(membershipRef, {
      schoolId: invitation.schoolId,
      userId: args.caller.uid,
      role: invitation.role,
      roles: [invitation.role],
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    transaction.set(
      profileRef,
      {
        schoolId: invitation.schoolId,
        userId: args.caller.uid,
        role: invitation.role,
        name: studentValues.name?.trim() || args.caller.name || '',
        phone: args.profile?.phone?.trim() || '',
        relationship: args.profile?.relationship?.trim() || '',
        bio: args.profile?.bio?.trim() || '',
        birthDate: studentValues.birthDate || '',
        gender: studentValues.gender || null,
        profileComplete: Boolean(studentValues.name?.trim() || args.caller.name),
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    )
    if (studentRef) {
      transaction.set(studentRef, { ...studentDocument, createdAt: now })
    }
    transaction.update(invitation.ref, {
      status: 'accepted',
      acceptedBy: args.caller.uid,
      acceptedAt: now,
      updatedAt: now,
    })
    return { ok: true as const }
  })

  if (!transactionResult.ok) return transactionResult

  return { ok: true as const, schoolId: invitation.schoolId, role: invitation.role }
}
