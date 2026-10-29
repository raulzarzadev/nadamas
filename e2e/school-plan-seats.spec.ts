import './admin-emulator-env'
import { createHash } from 'node:crypto'
import { type APIRequestContext, expect, test } from '@playwright/test'
import { adminDb as db } from '../lib/server/firebase-admin'
import * as seats from '../lib/server/subscriptions/seats'

async function emulatorsReady() {
  try {
    return (await fetch('http://127.0.0.1:8080')).ok
  } catch {
    return false
  }
}

test.beforeEach(async () => {
  test.skip(!(await emulatorsReady()), 'requiere emuladores de Firebase')
})

async function seedSchool(options: {
  teachers?: number
  students?: number
  subscription?: Record<string, unknown>
}) {
  const schoolId = `seats-${crypto.randomUUID().slice(0, 8)}`
  const batch = db.batch()
  if (options.subscription)
    batch.set(db.collection('schoolSubscriptions').doc(schoolId), {
      schoolId,
      ...options.subscription,
    })
  for (let i = 0; i < (options.teachers ?? 0); i++)
    batch.set(db.collection('schoolMemberships').doc(`${schoolId}_teacher-${i}`), {
      schoolId,
      userId: `teacher-${i}`,
      role: 'teacher',
      roles: ['teacher'],
      status: 'active',
    })
  for (let i = 0; i < (options.students ?? 0); i++)
    batch.set(db.collection('schoolStudents').doc(`${schoolId}_student-${i}`), {
      schoolId,
      status: 'active',
      studentUserId: `student-${i}`,
    })
  await batch.commit()
  return schoolId
}

async function cleanup(schoolId: string) {
  const writer = db.bulkWriter()
  for (const collection of ['schoolMemberships', 'schoolStudents']) {
    const docs = await db.collection(collection).where('schoolId', '==', schoolId).get()
    for (const doc of docs.docs) writer.delete(doc.ref)
  }
  writer.delete(db.collection('schoolSubscriptions').doc(schoolId))
  writer.delete(db.collection('schoolSeatLocks').doc(schoolId))
  await writer.close()
}

test('blocks the 6th teacher', async () => {
  const schoolId = await seedSchool({ teachers: 5 })
  try {
    const blocked = db.runTransaction(async (tx) => {
      const seat = await seats.reserveSchoolSeat(tx, schoolId, 'teacher', 'new-uid')
      seat.claim()
    })
    await expect(blocked).rejects.toMatchObject({ code: 'plan_limit_reached', status: 409 })
    await db.runTransaction(async (tx) => {
      const seat = await seats.reserveSchoolSeat(tx, schoolId, 'teacher', 'teacher-2')
      seat.claim()
    })
  } finally {
    await cleanup(schoolId)
  }
})

test('allows exactly one of two concurrent student seats at 99/100', async () => {
  test.setTimeout(60000)
  const schoolId = await seedSchool({ students: 99 })
  try {
    const enroll = (key: string) =>
      db.runTransaction(async (tx) => {
        const seat = await seats.reserveSchoolSeat(tx, schoolId, 'student', key)
        tx.set(db.collection('schoolStudents').doc(`${schoolId}_${key}`), {
          schoolId,
          status: 'active',
          studentUserId: key,
        })
        seat.claim()
      })
    const results = await Promise.allSettled([enroll('racer-a'), enroll('racer-b')])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: 'plan_limit_reached',
    })
    const active = await db
      .collection('schoolStudents')
      .where('schoolId', '==', schoolId)
      .where('status', '==', 'active')
      .count()
      .get()
    expect(active.data().count).toBe(100)
  } finally {
    await cleanup(schoolId)
  }
})

test('unlimited for exempt school without custom limits', async () => {
  test.setTimeout(60000)
  const schoolId = await seedSchool({ students: 120, subscription: { paymentExempt: true } })
  try {
    await db.runTransaction(async (tx) => {
      const seat = await seats.reserveSchoolSeat(tx, schoolId, 'student', 'extra-student')
      seat.claim()
    })
    const result = await seats.readSchoolSeats(schoolId)
    expect(result.limits.plan).toBe('unlimited')
    expect(result.usage.students).toBe(120)
  } finally {
    await cleanup(schoolId)
  }
})

test('client SDK rules deny reading and writing schoolSeatLocks', async () => {
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const signup = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `${crypto.randomUUID()}@test.com`,
        password: 'local-test-password',
        returnSecureToken: true,
      }),
    }
  )
  const user = (await signup.json()) as { localId: string; idToken: string }
  const headers = { authorization: `Bearer ${user.idToken}`, 'content-type': 'application/json' }
  const id = `rules-${crypto.randomUUID()}`
  try {
    const seeded = await fetch(`${root}/schoolSeatLocks/${id}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { schoolId: { stringValue: id } } }),
    })
    expect(seeded.ok).toBe(true)
    const read = await fetch(`${root}/schoolSeatLocks/${id}`, { headers })
    expect(read.status).toBe(403)
    const created = await fetch(`${root}/schoolSeatLocks?documentId=forged-${id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: { userId: { stringValue: user.localId }, schoolId: { stringValue: 'x' } },
      }),
    })
    expect(created.status).toBe(403)
  } finally {
    for (const doc of [id, `forged-${id}`])
      await fetch(`${root}/schoolSeatLocks/${doc}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
  }
})

const BASIC_LIMIT_MESSAGE =
  'Llegaste al límite de tu plan Básico (5 profes / 100 alumnos). Contáctanos para un plan personalizado.'

async function signup() {
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `${crypto.randomUUID()}@test.com`,
        password: 'local-test-password',
        returnSecureToken: true,
      }),
    }
  )
  expect(response.ok).toBe(true)
  return (await response.json()) as { localId: string; idToken: string; email: string }
}

async function seedDirectorSchool(students: number) {
  const schoolId = await seedSchool({ students })
  const director = await signup()
  await db.collection('schools').doc(schoolId).set({
    name: 'Escuela de prueba',
    createdBy: director.localId,
    directorId: director.localId,
    isPublic: true,
  })
  await db
    .collection('schoolMemberships')
    .doc(`${schoolId}_${director.localId}`)
    .set({
      schoolId,
      userId: director.localId,
      role: 'director',
      roles: ['director'],
      status: 'active',
    })
  return { schoolId, directorHeaders: { authorization: `Bearer ${director.idToken}` } }
}

async function cleanupSchool(schoolId: string) {
  await cleanup(schoolId)
  const writer = db.bulkWriter()
  const requests = await db
    .collection('schoolAccessRequests')
    .where('schoolId', '==', schoolId)
    .get()
  for (const doc of requests.docs) writer.delete(doc.ref)
  for (const collection of ['schoolInvitations', 'schoolProfiles']) {
    const docs = await db.collection(collection).where('schoolId', '==', schoolId).get()
    for (const doc of docs.docs) writer.delete(doc.ref)
  }
  writer.delete(db.collection('schools').doc(schoolId))
  await writer.close()
}

async function seedAccessRequest(schoolId: string, userId: string) {
  await db
    .collection('schoolAccessRequests')
    .doc(`${schoolId}_${userId}`)
    .set({
      id: `${schoolId}_${userId}`,
      schoolId,
      userId,
      name: 'Nadador',
      email: '',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
}

const studentCount = async (schoolId: string) =>
  (await db.collection('schoolStudents').where('schoolId', '==', schoolId).count().get()).data()
    .count

test('createSchoolStudent at 100 returns plan_limit_reached', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId, directorHeaders } = await seedDirectorSchool(100)
  try {
    const response = await request.post(`/api/schools/${schoolId}/students/quick`, {
      headers: directorHeaders,
      data: { name: 'Alumno nuevo' },
    })
    expect(response.status(), await response.text()).toBe(409)
    expect(await response.json()).toEqual({
      code: 'plan_limit_reached',
      error: BASIC_LIMIT_MESSAGE,
    })
    expect(await studentCount(schoolId)).toBe(100)
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('createSchoolStudent at 99 enrolls and claims the seat lock', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId, directorHeaders } = await seedDirectorSchool(99)
  try {
    const response = await request.post(`/api/schools/${schoolId}/students/quick`, {
      headers: directorHeaders,
      data: { name: 'Alumno nuevo' },
    })
    expect(response.status(), await response.text()).toBe(201)
    expect(await studentCount(schoolId)).toBe(100)
    expect((await db.collection('schoolSeatLocks').doc(schoolId).get()).exists).toBe(true)
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('approving an access request for an already-active student is not blocked', async ({
  request,
}) => {
  test.setTimeout(60000)
  const { schoolId, directorHeaders } = await seedDirectorSchool(99)
  const athlete = await signup()
  try {
    await db
      .collection('schoolStudents')
      .doc(`${schoolId}_${athlete.localId}`)
      .set({ schoolId, status: 'active', studentUserId: athlete.localId, name: 'Nadador' })
    await seedAccessRequest(schoolId, athlete.localId)
    expect((await seats.readSchoolSeats(schoolId)).usage.students).toBe(100)
    const response = await request.patch(`/api/schools/${schoolId}/access-requests`, {
      headers: directorHeaders,
      data: { userId: athlete.localId, status: 'approved' },
    })
    expect(response.ok(), await response.text()).toBe(true)
    expect((await seats.readSchoolSeats(schoolId)).usage.students).toBe(100)
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('reactivating a suspended student at 100/100 is blocked', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId, directorHeaders } = await seedDirectorSchool(100)
  const athlete = await signup()
  const studentRef = db.collection('schoolStudents').doc(`${schoolId}_${athlete.localId}`)
  try {
    await studentRef.set({
      schoolId,
      status: 'inactive',
      studentUserId: athlete.localId,
      name: 'Nadador',
    })
    await seedAccessRequest(schoolId, athlete.localId)
    const response = await request.patch(`/api/schools/${schoolId}/access-requests`, {
      headers: directorHeaders,
      data: { userId: athlete.localId, status: 'approved' },
    })
    expect(response.status(), await response.text()).toBe(409)
    expect(await response.json()).toEqual({
      code: 'plan_limit_reached',
      error: BASIC_LIMIT_MESSAGE,
    })
    expect((await studentRef.get()).data()?.status).toBe('inactive')
    expect(
      (
        await db.collection('schoolAccessRequests').doc(`${schoolId}_${athlete.localId}`).get()
      ).data()?.status
    ).toBe('pending')
  } finally {
    await cleanupSchool(schoolId)
  }
})

async function seedParentInvitation(schoolId: string) {
  const parent = await signup()
  const token = crypto.randomUUID()
  const childRef = db.collection('additionalProfiles').doc()
  await childRef.set({
    ownerId: parent.localId,
    name: 'Hijo',
    birthDate: '2015-01-01',
    gender: 'otro',
  })
  await db
    .collection('schoolInvitations')
    .doc()
    .set({
      schoolId,
      email: parent.email.toLowerCase(),
      role: 'student',
      status: 'pending',
      expiresAt: Date.now() + 86400000,
      invitedBy: 'director',
      // Same hash as hashInvitationToken (that module is server-only).
      tokenHash: createHash('sha256').update(token).digest('hex'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  return {
    childId: childRef.id,
    accept: (request: APIRequestContext, participantIds: string[]) =>
      request.post(`/api/school-invitations/${token}`, {
        headers: { authorization: `Bearer ${parent.idToken}` },
        data: { participantIds },
      }),
    cleanup: () => childRef.delete(),
  }
}

test('a parent enrolling their first child at 99/100 succeeds', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId } = await seedDirectorSchool(99)
  const invitation = await seedParentInvitation(schoolId)
  try {
    const response = await invitation.accept(request, [invitation.childId])
    expect(response.status(), await response.text()).toBe(200)
    expect((await seats.readSchoolSeats(schoolId)).usage.students).toBe(100)
  } finally {
    await invitation.cleanup()
    await cleanupSchool(schoolId)
  }
})

test('a write adding 2 new students at 99/100 is blocked', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId } = await seedDirectorSchool(99)
  const invitation = await seedParentInvitation(schoolId)
  try {
    const response = await invitation.accept(request, ['self', invitation.childId])
    expect(response.status(), await response.text()).toBe(409)
    expect(await response.json()).toEqual({
      code: 'plan_limit_reached',
      error: BASIC_LIMIT_MESSAGE,
    })
    expect(await studentCount(schoolId)).toBe(99)
  } finally {
    await invitation.cleanup()
    await cleanupSchool(schoolId)
  }
})

async function seedTeacherInvitation(schoolId: string) {
  const teacher = await signup()
  const token = crypto.randomUUID()
  const invitationRef = db.collection('schoolInvitations').doc()
  await invitationRef.set({
    schoolId,
    email: teacher.email.toLowerCase(),
    role: 'teacher',
    status: 'pending',
    expiresAt: Date.now() + 86400000,
    invitedBy: 'director',
    tokenHash: createHash('sha256').update(token).digest('hex'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  return {
    teacherId: teacher.localId,
    invitationRef,
    accept: (request: APIRequestContext) =>
      request.post(`/api/school-invitations/${token}`, {
        headers: { authorization: `Bearer ${teacher.idToken}` },
        data: { profile: { name: 'Profe Nuevo' } },
      }),
  }
}

const teacherSeatsOf = async (schoolId: string) =>
  (await seats.readSchoolSeats(schoolId)).usage.teachers

test('accepting a 6th teacher invitation is blocked', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId } = await seedDirectorSchool(0)
  for (let i = 0; i < 5; i++)
    await db
      .collection('schoolMemberships')
      .doc(`${schoolId}_teacher-${i}`)
      .set({
        schoolId,
        userId: `teacher-${i}`,
        role: 'teacher',
        roles: ['teacher'],
        status: 'active',
      })
  const invitation = await seedTeacherInvitation(schoolId)
  try {
    const response = await invitation.accept(request)
    expect(response.status(), await response.text()).toBe(409)
    expect(await response.json()).toEqual({
      code: 'plan_limit_reached',
      error: BASIC_LIMIT_MESSAGE,
    })
    expect((await invitation.invitationRef.get()).data()?.status).toBe('pending')
    expect(await teacherSeatsOf(schoolId)).toBe(5)
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('accepting a teacher invitation under the limit claims the seat lock', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId } = await seedDirectorSchool(0)
  for (let i = 0; i < 4; i++)
    await db
      .collection('schoolMemberships')
      .doc(`${schoolId}_teacher-${i}`)
      .set({
        schoolId,
        userId: `teacher-${i}`,
        role: 'teacher',
        roles: ['teacher'],
        status: 'active',
      })
  const invitation = await seedTeacherInvitation(schoolId)
  try {
    const response = await invitation.accept(request)
    expect(response.status(), await response.text()).toBe(200)
    expect(await teacherSeatsOf(schoolId)).toBe(5)
    expect((await db.collection('schoolSeatLocks').doc(schoolId).get()).exists).toBe(true)
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('legacy school over the teacher limit still adds students but blocks teachers', async ({
  request,
}) => {
  test.setTimeout(60000)
  const { schoolId, directorHeaders } = await seedDirectorSchool(10)
  for (let i = 0; i < 7; i++)
    await db
      .collection('schoolMemberships')
      .doc(`${schoolId}_teacher-${i}`)
      .set({
        schoolId,
        userId: `teacher-${i}`,
        role: 'teacher',
        roles: ['teacher'],
        status: 'active',
      })
  const invitation = await seedTeacherInvitation(schoolId)
  try {
    const created = await request.post(`/api/schools/${schoolId}/students/quick`, {
      headers: directorHeaders,
      data: { name: 'Alumno nuevo' },
    })
    expect(created.status(), await created.text()).toBe(201)
    const response = await invitation.accept(request)
    expect(response.status(), await response.text()).toBe(409)
    expect((await response.json()).code).toBe('plan_limit_reached')
  } finally {
    await cleanupSchool(schoolId)
  }
})

async function adminUser() {
  const user = await signup()
  await db
    .collection('users')
    .doc(user.localId)
    .set({ roles: { athlete: true, admin: true } })
  return { authorization: `Bearer ${user.idToken}` }
}

async function seedTeachers(schoolId: string, count: number) {
  for (let i = 0; i < count; i++)
    await db
      .collection('schoolMemberships')
      .doc(`${schoolId}_teacher-${i}`)
      .set({
        schoolId,
        userId: `teacher-${i}`,
        role: 'teacher',
        roles: ['teacher'],
        status: 'active',
      })
}

const setPlan = (
  request: APIRequestContext,
  headers: Record<string, string>,
  schoolId: string,
  limits: { teachers: number; students: number } | null
) =>
  request.post('/api/subscriptions/admin', {
    headers,
    data: { action: 'setCustomPlan', schoolId, limits, reason: 'Convenio especial' },
  })

test('admin sets custom limits and the 6th teacher passes', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId } = await seedDirectorSchool(0)
  await seedTeachers(schoolId, 5)
  const admin = await adminUser()
  const invitation = await seedTeacherInvitation(schoolId)
  try {
    const response = await setPlan(request, admin, schoolId, { teachers: 8, students: 150 })
    expect(response.ok(), await response.text()).toBe(true)
    const sub = (await db.collection('schoolSubscriptions').doc(schoolId).get()).data()
    expect(sub?.paymentExempt).toBe(true)
    expect(sub?.customLimits).toEqual({ teachers: 8, students: 150 })
    const accepted = await invitation.accept(request)
    expect(accepted.status(), await accepted.text()).toBe(200)
    expect(await teacherSeatsOf(schoolId)).toBe(6)
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('invalid custom limits are rejected', async ({ request }) => {
  const { schoolId } = await seedDirectorSchool(0)
  const admin = await adminUser()
  try {
    for (const limits of [
      { teachers: 5, students: 100 },
      { teachers: 6.5, students: 200 },
      { teachers: 6, students: 100001 },
    ]) {
      const response = await setPlan(request, admin, schoolId, limits)
      expect(response.status()).toBe(400)
      expect((await response.json()).code).toBe('invalid_limits')
    }
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('back to basic clears exemption and limits', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId } = await seedDirectorSchool(0)
  await seedTeachers(schoolId, 8)
  const admin = await adminUser()
  const invitation = await seedTeacherInvitation(schoolId)
  try {
    expect((await setPlan(request, admin, schoolId, { teachers: 10, students: 150 })).ok()).toBe(
      true
    )
    expect((await setPlan(request, admin, schoolId, null)).ok()).toBe(true)
    const sub = (await db.collection('schoolSubscriptions').doc(schoolId).get()).data()
    expect(sub?.paymentExempt).toBe(false)
    expect(sub?.customLimits ?? null).toBeNull()
    // Back on Basic the school needs a live trial/payment to accept anyone.
    await db
      .collection('schoolSubscriptions')
      .doc(schoolId)
      .update({ trialEndsAt: Date.now() + 86400000 })
    const blocked = await invitation.accept(request)
    expect(blocked.status(), await blocked.text()).toBe(409)
    // Going back again is a harmless no-op.
    expect((await setPlan(request, admin, schoolId, null)).ok()).toBe(true)
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('non-admin cannot set custom plan', async ({ request }) => {
  const { schoolId, directorHeaders } = await seedDirectorSchool(0)
  try {
    const response = await setPlan(request, directorHeaders, schoolId, {
      teachers: 8,
      students: 150,
    })
    expect(response.status()).toBe(403)
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('creating a teacher invitation at 5/5 returns plan_limit_reached', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId, directorHeaders } = await seedDirectorSchool(0)
  await seedTeachers(schoolId, 5)
  try {
    const invite = (role: string) =>
      request.post(`/api/schools/${schoolId}/invitations`, {
        headers: directorHeaders,
        data: { email: `${crypto.randomUUID()}@test.com`, role },
      })
    const blocked = await invite('teacher')
    expect(blocked.status(), await blocked.text()).toBe(409)
    expect(await blocked.json()).toEqual({ code: 'plan_limit_reached', error: BASIC_LIMIT_MESSAGE })
    const pending = await db
      .collection('schoolInvitations')
      .where('schoolId', '==', schoolId)
      .count()
      .get()
    expect(pending.data().count).toBe(0)
    // Student invitations do not take a teacher seat.
    expect((await invite('student')).status()).toBe(201)
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('subscription snapshot includes plan usage only for managers asking for it', async ({
  request,
}) => {
  test.setTimeout(60000)
  const { schoolId, directorHeaders } = await seedDirectorSchool(3)
  const member = await signup()
  await db
    .collection('schoolMemberships')
    .doc(`${schoolId}_${member.localId}`)
    .set({
      schoolId,
      userId: member.localId,
      role: 'teacher',
      roles: ['teacher'],
      status: 'active',
    })
  const memberHeaders = { authorization: `Bearer ${member.idToken}` }
  const snapshot = async (headers: Record<string, string>, usage: boolean) => {
    const response = await request.get(
      `/api/subscriptions?schoolId=${schoolId}${usage ? '&usage=1' : ''}`,
      { headers }
    )
    expect(response.status(), await response.text()).toBe(200)
    return (await response.json()) as Record<string, unknown>
  }
  try {
    expect(await snapshot(directorHeaders, false)).not.toHaveProperty('plan')
    expect((await snapshot(directorHeaders, true)).plan).toEqual({
      limits: { plan: 'basic', teachers: 5, students: 100 },
      usage: { teachers: 1, students: 3 },
    })
    expect(await snapshot(memberHeaders, true)).not.toHaveProperty('plan')
    expect(await snapshot(memberHeaders, false)).not.toHaveProperty('plan')
  } finally {
    await cleanupSchool(schoolId)
  }
})

test('removing the payment exemption also clears custom limits', async ({ request }) => {
  test.setTimeout(60000)
  const { schoolId } = await seedDirectorSchool(0)
  const admin = await adminUser()
  try {
    expect((await setPlan(request, admin, schoolId, { teachers: 10, students: 150 })).ok()).toBe(
      true
    )
    const removed = await request.post('/api/subscriptions/admin', {
      headers: admin,
      data: { action: 'setExemption', schoolId, enabled: false, reason: 'Fin del convenio' },
    })
    expect(removed.status(), await removed.text()).toBe(200)
    const sub = (await db.collection('schoolSubscriptions').doc(schoolId).get()).data()
    expect(sub?.paymentExempt).toBe(false)
    expect(sub?.customLimits ?? null).toBeNull()
  } finally {
    await cleanupSchool(schoolId)
  }
})
