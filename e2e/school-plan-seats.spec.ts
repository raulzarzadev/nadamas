import './admin-emulator-env'
import { expect, test } from '@playwright/test'
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
  return (await response.json()) as { localId: string; idToken: string }
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
