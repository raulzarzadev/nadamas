import { expect, test } from '@playwright/test'

test('las asignaciones del director notifican al entrenador antes de responder', async ({
  request,
}) => {
  let ready = false
  try {
    ready = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!ready, 'requiere emuladores de Firebase')
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const schoolId = `notify-${crypto.randomUUID()}`
  const documents: string[] = []
  const signup = async () => {
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
    return response.json() as Promise<{ localId: string; idToken: string }>
  }
  const encode = (value: unknown): Record<string, unknown> => {
    if (typeof value === 'string') return { stringValue: value }
    if (typeof value === 'number') return { integerValue: String(value) }
    if (typeof value === 'boolean') return { booleanValue: value }
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
    if (value && typeof value === 'object')
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, encode(item)])
          ),
        },
      }
    return { nullValue: null }
  }
  const seed = async (path: string, values: Record<string, unknown>) => {
    documents.push(path)
    const response = await fetch(`${root}/${path}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(values).map(([key, value]) => [key, encode(value)])
        ),
      }),
    })
    expect(response.ok).toBe(true)
  }
  const director = await signup()
  const teacher = await signup()
  const headers = { authorization: `Bearer ${director.idToken}` }
  const notifications = async () => {
    const response = await fetch(`${root}:runQuery`, {
      method: 'POST',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'notifications' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'recipientId' },
              op: 'EQUAL',
              value: { stringValue: teacher.localId },
            },
          },
        },
      }),
    })
    const rows = (await response.json()) as Array<{
      document?: { name: string; fields: Record<string, { stringValue?: string }> }
    }>
    return rows.flatMap(({ document }) => {
      if (!document) return []
      const path = document.name.split('/documents/')[1]
      if (!documents.includes(path)) documents.push(path)
      return [document.fields]
    })
  }
  try {
    await seed(`schools/${schoolId}`, { name: 'Escuela de prueba', directorId: director.localId })
    for (const [account, role] of [
      [director, 'director'],
      [teacher, 'teacher'],
    ] as const)
      await seed(`schoolMemberships/${schoolId}_${account.localId}`, {
        schoolId,
        userId: account.localId,
        role,
        status: 'active',
      })
    const date = '2026-10-10'
    await seed(`schoolCoachOfferings/${schoolId}___unassigned__`, {
      schoolId,
      coachId: '__unassigned__',
      classOfferings: [
        {
          id: 'open-hour',
          mode: 'fixed',
          groupType: 'particular',
          placeName: 'Alberca',
          currency: 'MXN',
          unit: 'clase',
          schedules: [
            {
              id: 'open-schedule',
              timeMode: 'fixed',
              startTime: '15:00',
              endTime: '16:00',
              availabilityMode: 'dates',
              days: ['Sáb'],
              availableDates: [date],
            },
          ],
        },
      ],
    })
    const assignment = {
      coachId: teacher.localId,
      date,
      startTime: '15:00',
      endTime: '16:00',
      offeringId: 'open-hour',
      scheduleId: 'open-schedule',
    }
    documents.push(
      `schoolScheduleAssignments/${schoolId}_${date}_1500`,
      `schoolAgendaUpdates/${schoolId}`
    )
    const assigned = await request.post(`/api/schools/${schoolId}/agenda/assignments`, {
      headers,
      data: assignment,
    })
    expect(assigned.ok(), await assigned.text()).toBe(true)
    expect(await notifications()).toEqual([
      expect.objectContaining({
        type: { stringValue: 'school_class_assigned' },
        recipientId: { stringValue: teacher.localId },
      }),
    ])
    const repeated = await request.post(`/api/schools/${schoolId}/agenda/assignments`, {
      headers,
      data: assignment,
    })
    expect(repeated.ok()).toBe(true)
    expect(await notifications()).toHaveLength(1)
    const created = await request.post(`/api/schools/${schoolId}/classes`, {
      headers,
      data: {
        title: 'Clase nueva',
        type: 'individual',
        teacherIds: [teacher.localId],
        studentIds: [],
        startDate: date,
        startTime: '17:00',
        endTime: '18:00',
      },
    })
    expect(created.ok(), await created.text()).toBe(true)
    const result = await created.json()
    documents.push(
      `schoolClassSeries/${result.seriesId}`,
      ...result.occurrences.map((item: { id: string }) => `schoolClassOccurrences/${item.id}`)
    )
    expect(await notifications()).toHaveLength(2)
    const cancelled = await request.patch(
      `/api/schools/${schoolId}/classes/${result.occurrences[0].id}`,
      { headers, data: { status: 'cancelled' } }
    )
    expect(cancelled.ok(), await cancelled.text()).toBe(true)
    expect(await notifications()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: { stringValue: 'school_class_cancelled' } }),
      ])
    )
    const studentIds = ['Adri', 'Justi', 'Luis'].map((name) => `${schoolId}-${name}`)
    for (const [index, id] of studentIds.entries()) {
      await seed(`schoolStudents/${id}`, { schoolId, name: ['Adri', 'Justi', 'Luis'][index] })
    }
    const groupCreated = await request.post(`/api/schools/${schoolId}/classes`, {
      headers,
      data: {
        title: 'Clase grupal',
        type: 'group',
        teacherIds: [teacher.localId],
        studentIds: studentIds.slice(0, 2),
        startDate: date,
        startTime: '07:00',
        endTime: '08:00',
      },
    })
    expect(groupCreated.ok(), await groupCreated.text()).toBe(true)
    const group = await groupCreated.json()
    documents.push(
      `schoolClassSeries/${group.seriesId}`,
      ...group.occurrences.map((item: { id: string }) => `schoolClassOccurrences/${item.id}`)
    )
    const beforeUpdate = await notifications()
    const groupNotification = beforeUpdate.find(
      (item) => item.title.stringValue === 'Clase grupal (2)'
    )
    expect(groupNotification).toBeTruthy()
    expect(groupNotification?.body.stringValue).toContain('Adri')
    expect(groupNotification?.body.stringValue).toContain('Justi')
    const updated = await request.post(
      `/api/schools/${schoolId}/classes/${group.occurrences[0].id}/students`,
      { headers, data: { studentIds: [studentIds[2]] } }
    )
    expect(updated.ok(), await updated.text()).toBe(true)
    const afterUpdate = await notifications()
    expect(afterUpdate).toHaveLength(beforeUpdate.length)
    const updatedNotification = afterUpdate.find(
      (item) => item.title.stringValue === 'Se actualizó la clase grupal'
    )
    expect(updatedNotification?.body.stringValue).toContain('Clase grupal (3)')
    expect(updatedNotification?.body.stringValue).toContain('Luis')

    const feedId = `${teacher.localId}_coach`
    const token = crypto.randomUUID()
    await seed(`calendarFeeds/${feedId}`, {
      id: feedId,
      uid: teacher.localId,
      role: 'coach',
      token,
      active: true,
      reminderOffsets: [5],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const calendar = await request.get(`/api/calendar/feeds/${token}.ics`)
    expect(calendar.ok(), await calendar.text()).toBe(true)
    const ics = (await calendar.text()).replace(/\r\n /g, '')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    expect(ics).toContain('SUMMARY:Clase grupal (3)')
    for (const name of ['Adri', 'Justi', 'Luis']) expect(ics).toContain(name)
    const uid = ics.match(/UID:([^\r]+)/)?.[1]
    const modified = await request.patch(
      `/api/schools/${schoolId}/classes/${group.occurrences[0].id}`,
      { headers, data: { location: 'Alberca nueva' } }
    )
    expect(modified.ok()).toBe(true)
    const refreshedCalendar = await request.get(`/api/calendar/feeds/${token}.ics`)
    expect((await refreshedCalendar.text()).replace(/\r\n /g, '').match(/UID:([^\r]+)/)?.[1]).toBe(
      uid
    )
  } finally {
    await notifications()
    for (const path of documents)
      await fetch(`${root}/${path}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
  }
})
