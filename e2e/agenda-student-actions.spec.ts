import { expect, test } from '@playwright/test'

test('la ficha grupal edita y mueve solo al alumno elegido', async ({ request }) => {
  test.setTimeout(60000)
  let emulatorReady = false
  try {
    emulatorReady = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!emulatorReady, 'requiere el emulador de Firestore')

  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const suffix = crypto.randomUUID()
  const schoolId = `agenda-actions-${suffix}`
  const sourceId = `agenda-source-${suffix}`
  const duplicateId = `agenda-duplicate-${suffix}`
  const targetId = `agenda-target-${suffix}`
  const studentA = `agenda-a-${suffix}`
  const studentB = `agenda-b-${suffix}`
  const created: Array<[string, string]> = []

  const signup = async () => {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `agenda-actions-${crypto.randomUUID()}@test.com`,
          password: 'local-test-password',
          returnSecureToken: true,
        }),
      }
    )
    expect(response.ok).toBe(true)
    return response.json() as Promise<{ localId: string; idToken: string }>
  }

  const encodeValue = (value: unknown): Record<string, unknown> => {
    if (typeof value === 'string') return { stringValue: value }
    if (typeof value === 'number') return { integerValue: String(value) }
    if (typeof value === 'boolean') return { booleanValue: value }
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } }
    if (value && typeof value === 'object')
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, encodeValue(item)])
          ),
        },
      }
    return { nullValue: null }
  }

  const seed = async (collection: string, id: string, values: Record<string, unknown>) => {
    created.push([collection, id])
    const fields = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, encodeValue(value)])
    )
    const response = await fetch(`${root}/${collection}/${id}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
    expect(response.ok, await response.text()).toBe(true)
  }

  const director = await signup()
  const teacher = await signup()
  const outsider = await signup()
  const headers = { authorization: `Bearer ${director.idToken}` }
  const month = '2026-10'
  const date = '2026-10-10'
  try {
    await seed('schools', schoolId, { id: schoolId, name: 'Escuela de prueba' })
    await seed('schoolMemberships', `${schoolId}_${director.localId}`, {
      schoolId,
      userId: director.localId,
      role: 'director',
      status: 'active',
    })
    await seed('schoolMemberships', `${schoolId}_${teacher.localId}`, {
      schoolId,
      userId: teacher.localId,
      role: 'teacher',
      status: 'active',
    })
    await seed('schoolStudents', studentA, { schoolId, name: 'Alumno A' })
    await seed('schoolStudents', studentB, { schoolId, name: 'Alumno B' })
    const base = {
      schoolId,
      type: 'group',
      teacherIds: [teacher.localId],
      date,
      startTime: '18:00',
      endTime: '19:00',
      status: 'scheduled',
      location: '',
      createdAt: Date.now(),
    }
    await seed('schoolClassOccurrences', sourceId, {
      ...base,
      id: sourceId,
      title: 'Clase grupal',
      studentIds: [studentA],
    })
    await seed('schoolClassOccurrences', duplicateId, {
      ...base,
      id: duplicateId,
      title: 'Clase grupal',
      studentIds: [studentB],
    })
    await seed('schoolClassOccurrences', targetId, {
      ...base,
      id: targetId,
      title: 'Otra clase',
      startTime: '19:00',
      endTime: '20:00',
      studentIds: [],
    })

    const agenda = async () => {
      const response = await request.get(`/api/schools/${schoolId}/agenda?month=${month}`, {
        headers,
      })
      expect(response.status(), await response.text()).toBe(200)
      return (await response.json()).bookings as Array<{
        schoolClassId?: string
        schoolClassStudents?: Array<{
          id: string
          name: string
          attended?: boolean
          note?: string
        }>
      }>
    }
    const before = await agenda()
    const group = before.find((item) => item.schoolClassStudents?.length === 2)
    expect(group).toBeTruthy()
    expect(group?.schoolClassStudents?.map((student) => student.name).sort()).toEqual([
      'Alumno A',
      'Alumno B',
    ])

    const studentPath = `/api/schools/${schoolId}/classes/${group?.schoolClassId}/students/${studentA}`
    const saveResponse = await request.patch(studentPath, {
      headers,
      data: { attended: true, note: 'Trabajó la técnica de crol.' },
    })
    expect(saveResponse.status(), await saveResponse.text()).toBe(200)
    const afterSave = await agenda()
    const savedGroup = afterSave.find((item) => item.schoolClassId === group?.schoolClassId)
    expect(
      savedGroup?.schoolClassStudents?.find((student) => student.id === studentA)
    ).toMatchObject({
      attended: true,
      note: 'Trabajó la técnica de crol.',
    })
    expect(
      savedGroup?.schoolClassStudents?.find((student) => student.id === studentB)
    ).toMatchObject({
      attended: false,
      note: '',
    })

    expect(
      (
        await request.patch(studentPath, {
          headers: { authorization: `Bearer ${outsider.idToken}` },
          data: { note: 'Sin acceso' },
        })
      ).status()
    ).toBe(403)

    const moveResponse = await request.post(`${studentPath}/move`, {
      headers,
      data: { destinationSchoolClassId: targetId },
    })
    expect(moveResponse.status(), await moveResponse.text()).toBe(200)
    const afterMove = await agenda()
    expect(
      afterMove.find((item) => item.schoolClassId === group?.schoolClassId)?.schoolClassStudents
    ).toHaveLength(1)
    expect(afterMove.find((item) => item.schoolClassId === targetId)?.schoolClassStudents).toEqual([
      expect.objectContaining({ id: studentA, attended: false, note: '' }),
    ])

    const removeResponse = await request.delete(
      `/api/schools/${schoolId}/classes/${group?.schoolClassId}/students/${studentB}`,
      { headers }
    )
    expect(removeResponse.status(), await removeResponse.text()).toBe(200)
    expect(
      (await agenda()).find((item) => item.schoolClassId === group?.schoolClassId)
        ?.schoolClassStudents
    ).toHaveLength(0)

    await seed('schoolCoachOfferings', `${schoolId}_${teacher.localId}`, {
      schoolId,
      coachId: teacher.localId,
      classOfferings: [
        {
          id: `free-hour-${suffix}`,
          mode: 'fixed',
          groupType: 'particular',
          placeName: 'Alberca de destino',
          currency: 'MXN',
          unit: 'clase',
          schedules: [
            {
              id: 'free-schedule',
              timeMode: 'fixed',
              startTime: '20:00',
              endTime: '21:00',
              availabilityMode: 'dates',
              days: ['Sáb'],
              availableDates: [date],
            },
            {
              id: 'free-group-schedule',
              timeMode: 'fixed',
              groupType: 'grupal',
              startTime: '21:00',
              endTime: '22:00',
              availabilityMode: 'dates',
              days: ['Sáb'],
              availableDates: [date],
            },
          ],
        },
      ],
    })
    const freeSlotAgenda = await request.get(`/api/schools/${schoolId}/agenda?month=${month}`, {
      headers,
    })
    const freeSlot = (await freeSlotAgenda.json()).availableSlots.find(
      (slot: { date: string; startTime: string }) =>
        slot.date === date && slot.startTime === '20:00'
    )
    expect(freeSlot).toMatchObject({ status: 'available', groupType: 'particular' })
    const freeSlotMove = await request.post(
      `/api/schools/${schoolId}/classes/${targetId}/students/${studentA}/move`,
      {
        headers,
        data: {
          coachId: teacher.localId,
          date,
          startTime: '20:00',
          endTime: '21:00',
        },
      }
    )
    expect(freeSlotMove.status(), await freeSlotMove.text()).toBe(200)
    const afterFreeSlotMove = await agenda()
    const newClass = afterFreeSlotMove.find(
      (item) => item.schoolClassId !== targetId && item.schoolClassStudents?.[0]?.id === studentA
    )
    expect(newClass?.schoolClassStudents).toEqual([
      expect.objectContaining({ id: studentA, attended: false }),
    ])
    if (newClass?.schoolClassId) created.push(['schoolClassOccurrences', newClass.schoolClassId])
    const particularDoc = await (
      await fetch(`${root}/schoolClassOccurrences/${newClass?.schoolClassId}`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
    expect(particularDoc.fields.type.stringValue).toBe('individual')
    expect(particularDoc.fields.location.stringValue).toBe('Alberca de destino')
    const groupFreeSlot = (
      await (
        await request.get(`/api/schools/${schoolId}/agenda?month=${month}`, { headers })
      ).json()
    ).availableSlots.find(
      (slot: { date: string; startTime: string }) =>
        slot.date === date && slot.startTime === '21:00'
    )
    expect(groupFreeSlot).toMatchObject({ status: 'available', groupType: 'grupal' })
    const groupMove = await request.post(
      `/api/schools/${schoolId}/classes/${newClass?.schoolClassId}/students/${studentA}/move`,
      {
        headers,
        data: {
          coachId: teacher.localId,
          date,
          startTime: '21:00',
          endTime: '22:00',
        },
      }
    )
    expect(groupMove.status(), await groupMove.text()).toBe(200)
    const newGroup = (await agenda()).find(
      (item) =>
        item.schoolClassId !== newClass?.schoolClassId &&
        item.schoolClassId !== targetId &&
        item.schoolClassStudents?.[0]?.id === studentA
    )
    expect(newGroup?.schoolClassStudents).toEqual([expect.objectContaining({ id: studentA })])
    if (newGroup?.schoolClassId) created.push(['schoolClassOccurrences', newGroup.schoolClassId])
    const groupDoc = await (
      await fetch(`${root}/schoolClassOccurrences/${newGroup?.schoolClassId}`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
    expect(groupDoc.fields.type.stringValue).toBe('group')

    const personalSourceId = `personal-source-${suffix}`
    const personalTargetId = `personal-target-${suffix}`
    await seed('users', teacher.localId, { roles: { coach: true } })
    await seed('coaches', teacher.localId, { classOfferings: [] })
    const bookingBase = {
      coachId: teacher.localId,
      athleteEmail: null,
      date,
      endTime: '20:00',
      groupType: 'grupal',
      classFull: false,
      status: 'confirmed',
      offeringId: 'open',
      scheduleId: 'open:19:00',
      locationName: 'Alberca',
    }
    await seed('bookings', personalSourceId, {
      ...bookingBase,
      id: personalSourceId,
      athleteId: studentA,
      athleteName: 'Alumno A',
      startTime: '17:00',
      endTime: '18:00',
      attended: true,
    })
    await seed('bookings', personalTargetId, {
      ...bookingBase,
      id: personalTargetId,
      athleteId: studentB,
      athleteName: 'Alumno B',
      startTime: '19:00',
    })
    const personalMove = await request.post('/api/coach/agenda/bookings/reassign', {
      headers: { authorization: `Bearer ${teacher.idToken}` },
      data: { bookingId: personalSourceId, date, startTime: '19:00' },
    })
    expect(personalMove.status(), await personalMove.text()).toBe(200)
    const movedBooking = await (
      await fetch(`${root}/bookings/${personalSourceId}`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
    expect(movedBooking.fields.startTime.stringValue).toBe('19:00')
    expect(movedBooking.fields.attended.booleanValue).toBe(false)
    const untouchedBooking = await (
      await fetch(`${root}/bookings/${personalTargetId}`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
    expect(untouchedBooking.fields.startTime.stringValue).toBe('19:00')
  } finally {
    for (const [collection, id] of [
      ...created,
      ['agendaStudentRecords', `class-${sourceId}-${studentA}`],
      ['agendaStudentRecords', `class-${duplicateId}-${studentA}`],
      ['agendaStudentRecords', `class-${targetId}-${studentA}`],
      ['schoolAgendaUpdates', schoolId],
    ])
      await fetch(`${root}/${collection}/${id}`, { method: 'DELETE' }).catch(() => {})
  }
})
