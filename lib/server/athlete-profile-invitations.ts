import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { validProfileBirthDate } from '@/lib/additional-profile'
import { studentProgressId } from '@/lib/coach-student-progress'
import { adminDb } from './firebase-admin'
import { paymentId } from './payments/store'
import { reserveSchoolSeatChanges } from './subscriptions/seats'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const collection = () =>
  adminDb.collection('athleteIdentityRegistry').doc('v1').collection('profileInvitations')
export type ProfileInvitation = {
  coachId: string
  studentId: string
  schoolId: string
  email: string
  tokenHash: string
  status: 'pending' | 'accepted' | 'failed'
  expiresAt: number
  sentAt: number
  acceptedBy?: string
  profile: { name: string; phone: string; birthDate: string; gender: string }
}
export async function createProfileInvitation(
  input: Omit<ProfileInvitation, 'tokenHash' | 'status' | 'expiresAt' | 'sentAt'>
) {
  const token = randomBytes(32).toString('base64url')
  const ref = collection().doc(
    hash(
      `${input.schoolId ? `school:${input.schoolId}` : `coach:${input.coachId}`}|${input.studentId}`
    )
  )
  await adminDb.runTransaction(async (tx) => {
    const previous = (await tx.get(ref)).data() as ProfileInvitation | undefined
    if (previous?.status === 'pending' && Date.now() - previous.sentAt < 60_000)
      throw new Error('INVITATION_THROTTLED')
    tx.set(ref, {
      ...input,
      tokenHash: hash(token),
      status: 'pending',
      expiresAt: Date.now() + 7 * 86400_000,
      sentAt: Date.now(),
    })
  })
  return { token, ref }
}
export async function findProfileInvitation(token: string) {
  if (/^[a-f0-9]{64}$/.test(token)) {
    const snapshot = await collection().doc(token).get()
    return snapshot.exists ? snapshot : null
  }
  if (!/^[\w-]{43}$/.test(token)) return null
  const result = await collection().where('tokenHash', '==', hash(token)).limit(1).get()
  return result.docs[0] || null
}
export function invitationBelongsTo(invitation: ProfileInvitation, caller: DecodedIdToken) {
  return Boolean(
    caller.email_verified &&
      caller.email?.toLowerCase() === invitation.email &&
      invitation.expiresAt > Date.now() &&
      (invitation.status === 'pending' ||
        (invitation.status === 'accepted' && invitation.acceptedBy === caller.uid))
  )
}
export async function acceptProfileInvitation(
  token: string,
  caller: DecodedIdToken,
  body: Record<string, unknown>
) {
  const invitationRef = await findProfileInvitation(token)
  if (!invitationRef) throw new Error('INVITATION_INVALID')
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const birthDate = typeof body.birthDate === 'string' ? body.birthDate : ''
  const gender = body.gender
  if (
    name.length < 2 ||
    !validProfileBirthDate(birthDate) ||
    !['varonil', 'femenil', 'otro'].includes(String(gender)) ||
    (phone && !/^\+\d{8,15}$/.test(phone))
  )
    throw new Error('INVITATION_PROFILE')
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(invitationRef.ref)
    const invitation = snap.data() as ProfileInvitation
    if (
      !invitation ||
      (invitationRef.id !== token && invitation.tokenHash !== hash(token)) ||
      !invitationBelongsTo(invitation, caller)
    )
      throw new Error('INVITATION_INVALID')
    if (invitation.status === 'accepted') return
    const userRef = adminDb.collection('users').doc(caller.uid)
    const user = await tx.get(userRef)
    const now = Date.now()
    const userUpdate = {
      name,
      displayName: name,
      phone,
      birthDate,
      gender,
      email: invitation.email,
      updatedAt: now,
      ...(!user.exists
        ? { id: caller.uid, roles: { athlete: true, coach: false, admin: false }, createdAt: now }
        : {}),
    }
    if (invitation.schoolId) {
      const studentRef = adminDb.collection('schoolStudents').doc(invitation.studentId)
      const student = await tx.get(studentRef)
      const data = student.data()
      if (
        !data ||
        data.schoolId !== invitation.schoolId ||
        data.studentEmail?.toLowerCase() !== invitation.email ||
        data.additionalProfileId ||
        (data.studentUserId && data.studentUserId !== caller.uid)
      )
        throw new Error('INVITATION_CONFLICT')
      const membershipRef = adminDb
        .collection('schoolMemberships')
        .doc(`${invitation.schoolId}_${caller.uid}`)
      const membership = await tx.get(membershipRef)
      const roles = [
        ...new Set([
          ...(membership.data()?.roles ||
            (membership.data()?.role ? [membership.data()?.role] : [])),
          'student',
        ]),
      ]
      const memberUpdate = {
        ...(membership.data() || {}),
        id: membershipRef.id,
        schoolId: invitation.schoolId,
        userId: caller.uid,
        roles,
        role: membership.data()?.role || 'student',
        status: 'active',
        createdAt: membership.data()?.createdAt || now,
        updatedAt: now,
      }
      const seat = await reserveSchoolSeatChanges(tx, invitation.schoolId, 'student', {
        memberships: [memberUpdate],
        students: [{ ...data, id: studentRef.id, studentUserId: caller.uid }],
      })
      tx.set(membershipRef, memberUpdate)
      seat.claim()
      tx.update(studentRef, {
        name,
        phone,
        birthDate,
        gender,
        studentEmail: invitation.email,
        studentUserId: caller.uid,
        accountParticipant: true,
        emailVerifiedAt: now,
        updatedAt: now,
      })
    } else {
      const oldId = invitation.studentId
      if (oldId !== caller.uid && !oldId.startsWith('manual_') && !oldId.startsWith('manual:'))
        throw new Error('INVITATION_CONFLICT')
      const scope = `coach:${invitation.coachId}`
      const oldProgressRef = adminDb
        .collection('coachStudentProgress')
        .doc(studentProgressId(invitation.coachId, oldId))
      const newProgressRef = adminDb
        .collection('coachStudentProgress')
        .doc(studentProgressId(invitation.coachId, caller.uid))
      const [
        oldProgress,
        newProgress,
        bookings,
        entries,
        records,
        evaluations,
        labels,
        oldAccount,
        newAccount,
        orders,
        movements,
        reservations,
        participants,
      ] = await Promise.all([
        tx.get(oldProgressRef),
        tx.get(newProgressRef),
        tx.get(adminDb.collection('bookings').where('coachId', '==', invitation.coachId)),
        tx.get(
          adminDb
            .collection('coachStudentProgressEntries')
            .where('coachId', '==', invitation.coachId)
        ),
        tx.get(
          adminDb.collection('agendaStudentRecords').where('coachId', '==', invitation.coachId)
        ),
        tx.get(
          adminDb.collection('privateClassEvaluations').where('coachId', '==', invitation.coachId)
        ),
        tx.get(adminDb.collection('studentLabelAssignments').where('scope', '==', scope)),
        tx.get(adminDb.collection('paymentAccounts').doc(paymentId(scope, oldId))),
        tx.get(adminDb.collection('paymentAccounts').doc(paymentId(scope, caller.uid))),
        tx.get(adminDb.collection('paymentOrders').where('scope', '==', scope)),
        tx.get(adminDb.collection('paymentMovements').where('scope', '==', scope)),
        tx.get(adminDb.collection('paymentReservations').where('scope', '==', scope)),
        tx.get(adminDb.collection('paymentParticipants').where('scope', '==', scope)),
      ])
      const old = oldProgress.data()
      if (old && old.athleteEmail?.toLowerCase() !== invitation.email)
        throw new Error('INVITATION_CONFLICT')
      if (
        !old &&
        !bookings.docs.some((doc) => doc.data().athleteId === oldId && !doc.data().schoolId)
      )
        throw new Error('INVITATION_CONFLICT')
      const matching = [bookings, entries, evaluations].flatMap((snapshot) =>
        snapshot.docs.filter((doc) => doc.data().athleteId === oldId && !doc.data().schoolId)
      )
      const studentRecords = records.docs.filter(
        (doc) => doc.data().studentId === oldId && !doc.data().schoolId
      )
      const financial = [orders, movements, reservations, participants].flatMap((snapshot) =>
        snapshot.docs.filter((doc) => doc.data().studentId === oldId || doc.data().id === oldId)
      )
      if (matching.length + studentRecords.length + financial.length * 2 > 420)
        throw new Error('INVITATION_TOO_LARGE')
      const assigned = labels.docs.filter(
        (doc) => doc.data().studentId === oldId || doc.data().studentId === caller.uid
      )
      const assignmentRef = adminDb
        .collection('studentLabelAssignments')
        .doc(hash(`${scope}|${caller.uid}`))
      // Read destinations before writes; never replace existing balances or labels.
      const reservationTargets = await Promise.all(
        reservations.docs
          .filter((doc) => doc.data().studentId === oldId)
          .map((doc) =>
            tx.get(
              adminDb
                .collection('paymentReservations')
                .doc(paymentId(scope, caller.uid, doc.data().sourceId))
            )
          )
      )
      if (oldId !== caller.uid && reservationTargets.some((doc) => doc.exists))
        throw new Error('INVITATION_CONFLICT')
      tx.set(
        newProgressRef,
        {
          ...(old || {}),
          ...(newProgress.data() || {}),
          id: newProgressRef.id,
          coachId: invitation.coachId,
          athleteId: caller.uid,
          athleteName: name,
          athleteEmail: invitation.email,
          athletePhone: phone,
          birthDate,
          gender,
          emailVerifiedAt: now,
          createdAt: newProgress.data()?.createdAt || old?.createdAt || now,
          updatedAt: now,
        },
        { merge: true }
      )
      if (oldId !== caller.uid) tx.delete(oldProgressRef)
      for (const doc of matching)
        tx.update(doc.ref, {
          athleteId: caller.uid,
          athleteName: name,
          athleteEmail: invitation.email,
          ...(doc.data().athleteProfileId === oldId ? { athleteProfileId: caller.uid } : {}),
          updatedAt: now,
        })
      for (const doc of studentRecords)
        tx.update(doc.ref, { studentId: caller.uid, updatedAt: now })
      if (assigned.length) {
        tx.set(assignmentRef, {
          scope,
          studentId: caller.uid,
          labelIds: [...new Set(assigned.flatMap((doc) => doc.data().labelIds || []))],
          updatedAt: now,
        })
        for (const doc of assigned) if (doc.id !== assignmentRef.id) tx.delete(doc.ref)
      }
      if (oldId !== caller.uid && oldAccount.exists) {
        const grants = [
          ...new Map(
            [...(oldAccount.data()?.grants || []), ...(newAccount.data()?.grants || [])].map(
              (grant) => [grant.id, grant]
            )
          ).values(),
        ]
        tx.set(
          newAccount.ref,
          {
            ...(oldAccount.data() || {}),
            ...(newAccount.data() || {}),
            studentId: caller.uid,
            grants,
          },
          { merge: true }
        )
        tx.delete(oldAccount.ref)
      }
      for (const doc of financial) {
        const data = doc.data()
        const update = {
          studentId: caller.uid,
          ...(data.ownerId ? { ownerId: caller.uid } : {}),
          ...(data.studentName ? { studentName: name } : {}),
        }
        if (doc.ref.parent.id === 'paymentReservations' && oldId !== caller.uid) {
          const ref = adminDb
            .collection('paymentReservations')
            .doc(paymentId(scope, caller.uid, data.sourceId))
          tx.set(ref, { ...data, ...update, id: ref.id })
          tx.delete(doc.ref)
        } else if (doc.ref.parent.id === 'paymentParticipants' && oldId !== caller.uid) {
          const ref = adminDb.collection('paymentParticipants').doc(paymentId(scope, caller.uid))
          tx.set(ref, { ...data, id: caller.uid, name, ownerId: caller.uid })
          tx.delete(doc.ref)
        } else tx.update(doc.ref, update)
      }
    }
    tx.set(userRef, userUpdate, { merge: true })
    tx.update(invitationRef.ref, { status: 'accepted', acceptedBy: caller.uid, acceptedAt: now })
  })
}

export async function listProfileInvitationNotifications(caller: DecodedIdToken) {
  if (!caller.email_verified || !caller.email) return []
  const snapshot = await collection().where('email', '==', caller.email.toLowerCase()).get()
  return snapshot.docs
    .flatMap((doc) => {
      const invitation = doc.data() as ProfileInvitation
      if (invitation.status !== 'pending' || !invitationBelongsTo(invitation, caller)) return []
      return [
        {
          id: `profile-invitation-${doc.id}`,
          recipientId: caller.uid,
          actorId: invitation.coachId,
          actorName: null,
          type: 'athlete_profile_invitation' as const,
          title: 'Invitación para vincular tu perfil',
          body: `Revisa y completa los datos de ${invitation.profile.name} y acepta la invitación para vincular tu cuenta.`,
          link: `/athlete/profile-invitations/${doc.id}`,
          createdAt: invitation.sentAt,
          readAt: null,
        },
      ]
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}
