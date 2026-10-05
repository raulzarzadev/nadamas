import { expect, test } from '@playwright/test'

test('un entrenador agrega un alumno registrado a su propia agenda', async ({ request }) => {
  let emulatorReady = false
  try {
    emulatorReady = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!emulatorReady, 'requiere el emulador de Firestore')

  const signup = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `coach-agenda-${crypto.randomUUID()}@test.com`,
        password: 'local-test-password',
        returnSecureToken: true,
      }),
    }
  )
  expect(signup.ok).toBe(true)
  const coach = (await signup.json()) as { localId: string; idToken: string }
  const athleteId = `manual_${crypto.randomUUID()}`
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const progressId = `${coach.localId}_${athleteId}`
  const documents = [`users/${coach.localId}`, `coachStudentProgress/${progressId}`]
  const seed = async (path: string, fields: Record<string, unknown>) => {
    const response = await fetch(`${root}/${path}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
    expect(response.ok).toBe(true)
  }
  const headers = { authorization: `Bearer ${coach.idToken}` }
  try {
    await seed(documents[0], {
      roles: { mapValue: { fields: { coach: { booleanValue: true } } } },
      name: { stringValue: 'Entrenador de prueba' },
    })
    await seed(documents[1], {
      id: { stringValue: progressId },
      coachId: { stringValue: coach.localId },
      athleteId: { stringValue: athleteId },
      athleteName: { stringValue: 'Alumno registrado' },
    })
    const studentsResponse = await request.get('/api/coach/students', { headers })
    expect(studentsResponse.ok()).toBe(true)
    const { students } = await studentsResponse.json()
    const student = students.find((item: { athleteId: string }) => item.athleteId === athleteId)
    expect(student).toBeTruthy()
    const payload = {
      coachId: coach.localId,
      athleteId: student.athleteId,
      athleteName: student.name,
      date: '2026-10-06',
      startTime: '15:00',
      endTime: '16:00',
    }
    const added = await request.post('/api/coach/agenda/bookings', { headers, data: payload })
    expect(added.ok(), await added.text()).toBe(true)
    const { booking } = await added.json()
    documents.push(`bookings/${booking.id}`)
    expect(booking.athleteId).toBe(athleteId)
    expect(booking.coachId).toBe(coach.localId)

    const duplicate = await request.post('/api/coach/agenda/bookings', { headers, data: payload })
    expect(duplicate.status()).toBe(409)
    // A new agenda student must be discoverable and reusable in another hour.
    const created = await request.post('/api/coach/agenda/bookings', {
      headers,
      data: {
        ...payload,
        athleteId: undefined,
        athleteName: 'Atleta nuevo',
        startTime: '17:00',
        endTime: '18:00',
      },
    })
    expect(created.ok(), await created.text()).toBe(true)
    const newBooking = (await created.json()).booking
    documents.push(
      `bookings/${newBooking.id}`,
      `coachStudentProgress/${coach.localId}_${newBooking.athleteId}`
    )
    const refreshed = await request.get('/api/coach/students', { headers })
    expect((await refreshed.json()).students).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ athleteId: newBooking.athleteId, name: 'Atleta nuevo' }),
      ])
    )
    const reused = await request.post('/api/coach/agenda/bookings', {
      headers,
      data: {
        ...payload,
        athleteId: newBooking.athleteId,
        athleteName: 'Atleta nuevo',
        startTime: '18:00',
        endTime: '19:00',
      },
    })
    expect(reused.ok(), await reused.text()).toBe(true)
    documents.push(`bookings/${(await reused.json()).booking.id}`)

    const schoolId = `reuse-school-${crypto.randomUUID()}`
    documents.push(`schoolMemberships/${schoolId}_${coach.localId}`)
    await seed(`schoolMemberships/${schoolId}_${coach.localId}`, {
      schoolId: { stringValue: schoolId },
      userId: { stringValue: coach.localId },
      role: { stringValue: 'teacher' },
      status: { stringValue: 'active' },
    })
    const schoolCreated = await request.post('/api/coach/agenda/bookings', {
      headers,
      data: { ...payload, schoolId, athleteId: undefined, athleteName: 'Atleta de escuela' },
    })
    expect(schoolCreated.ok(), await schoolCreated.text()).toBe(true)
    const schoolBooking = (await schoolCreated.json()).booking
    documents.push(
      `bookings/${schoolBooking.id}`,
      `coachStudentProgress/${coach.localId}_${schoolBooking.athleteId}`,
      `schoolAgendaUpdates/${schoolId}`
    )
    const schoolSearch = await request.get(
      `/api/schools/${schoolId}/students?includeAgendaStudents=true&coachId=${coach.localId}`,
      { headers }
    )
    expect(schoolSearch.ok(), await schoolSearch.text()).toBe(true)
    const schoolStudents = (await schoolSearch.json()).students
    expect(schoolStudents).toEqual([
      expect.objectContaining({ id: schoolBooking.athleteId, name: 'Atleta de escuela' }),
    ])
    const schoolReused = await request.post('/api/coach/agenda/bookings', {
      headers,
      data: {
        ...payload,
        schoolId,
        athleteId: schoolBooking.athleteId,
        athleteName: 'Atleta de escuela',
        startTime: '16:00',
        endTime: '17:00',
      },
    })
    expect(schoolReused.ok(), await schoolReused.text()).toBe(true)
    documents.push(`bookings/${(await schoolReused.json()).booking.id}`)
    const forbiddenSearch = await request.get(
      `/api/schools/${schoolId}/students?includeAgendaStudents=true&coachId=another-coach`,
      { headers }
    )
    expect(forbiddenSearch.status()).toBe(403)
    const otherCoach = await request.post('/api/coach/agenda/bookings', {
      headers,
      data: { ...payload, coachId: 'another-coach' },
    })
    expect(otherCoach.status()).toBe(403)
  } finally {
    for (const path of documents) {
      await fetch(`${root}/${path}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
    }
  }
})
