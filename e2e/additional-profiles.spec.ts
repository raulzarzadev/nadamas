import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { validProfileBirthDate } from '../lib/additional-profile'

test('valida nacimientos de adultos y menores sin aceptar fechas imposibles', () => {
  expect(validProfileBirthDate('1980-01-01')).toBe(true)
  expect(validProfileBirthDate('2020-01-01')).toBe(true)
  for (const value of ['2025-02-30', '2099-01-01', 'invalid', '2020-1-1'])
    expect(validProfileBirthDate(value)).toBe(false)
})

test('los Adicionales pertenecen a su cuenta y se vinculan a la escuela sin rol tutor', async ({
  request,
  page,
}) => {
  let available = false
  try {
    available = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!available, 'requiere emuladores de Firebase y aplicación local')
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const signup = async () => {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `additional-${crypto.randomUUID()}@test.com`,
          password: 'local-test-password',
          returnSecureToken: true,
        }),
      }
    )
    return response.json() as Promise<{ localId: string; idToken: string; email: string }>
  }
  const owner = await signup()
  const outsider = await signup()
  const teacher = await signup()
  const unassignedStudent = await signup()
  const schoolId = `additional-test-${owner.localId}`
  const headers = { authorization: `Bearer ${owner.idToken}` }
  const otherHeaders = { authorization: `Bearer ${outsider.idToken}` }
  const created: Array<[string, string]> = []
  const encodeValue = (value: unknown): Record<string, unknown> => {
    if (typeof value === 'string') return { stringValue: value }
    if (typeof value === 'number') return { integerValue: String(value) }
    if (typeof value === 'boolean') return { booleanValue: value }
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } }
    if (value && typeof value === 'object') {
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, encodeValue(item)])
          ),
        },
      }
    }
    return { nullValue: null }
  }
  const seed = async (collection: string, id: string, values: Record<string, unknown>) => {
    created.push([collection, id])
    const fields = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, encodeValue(value)])
    )
    expect(
      (
        await fetch(`${root}/${collection}/${id}`, {
          method: 'PATCH',
          headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
          body: JSON.stringify({ fields }),
        })
      ).ok
    ).toBe(true)
  }
  try {
    expect(
      (await request.post('/api/additional-profiles', { data: { name: 'Sin acceso' } })).status()
    ).toBe(401)
    const profiles = []
    for (const [name, birthDate] of [
      ['Persona adulta', '1980-01-01'],
      ['Persona menor', '2020-01-01'],
    ]) {
      const response = await request.post('/api/additional-profiles', {
        headers,
        data: { name, birthDate, gender: 'otro' },
      })
      expect(response.status()).toBe(201)
      const profile = (await response.json()).profile
      created.push(['additionalProfiles', profile.id])
      profiles.push(profile)
    }
    expect(
      (await (await request.get('/api/additional-profiles', { headers })).json()).profiles
    ).toHaveLength(2)
    expect(
      (await (await request.get('/api/additional-profiles', { headers: otherHeaders })).json())
        .profiles
    ).toHaveLength(0)
    await seed('schools', schoolId, {
      name: 'Escuela prueba',
      directorId: outsider.localId,
      timezone: 'America/Mexico_City',
    })
    await seed('schoolMemberships', `${schoolId}_${outsider.localId}`, {
      schoolId,
      userId: outsider.localId,
      role: 'director',
      status: 'active',
    })
    await seed('schoolMemberships', `${schoolId}_${teacher.localId}`, {
      schoolId,
      userId: teacher.localId,
      role: 'teacher',
      status: 'active',
    })
    await seed('users', teacher.localId, { roles: { coach: true } })
    await seed('coaches', teacher.localId, { classOfferings: [] })
    await seed('schoolProfiles', `${schoolId}_${teacher.localId}`, {
      schoolId,
      userId: teacher.localId,
      role: 'teacher',
      name: 'Profe de prueba',
      profileComplete: true,
    })
    await seed('schoolMemberships', `${schoolId}_${unassignedStudent.localId}`, {
      schoolId,
      userId: unassignedStudent.localId,
      role: 'student',
      status: 'active',
    })
    for (const collection of ['schoolCoachOfferings', 'coachScheduleBlocks']) {
      const response = await fetch(`${root}/${collection}/${schoolId}_${teacher.localId}`, {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${outsider.idToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            schoolId: { stringValue: schoolId },
            coachId: { stringValue: teacher.localId },
            userId: { stringValue: outsider.localId },
          },
        }),
      })
      expect(response.status).toBe(403)
    }
    const schoolStudentResponse = await request.post(`/api/schools/${schoolId}/students`, {
      headers: otherHeaders,
      data: { name: 'Alumno de clase', birthDate: '2010-01-01', gender: 'otro' },
    })
    expect(schoolStudentResponse.status()).toBe(201)
    const schoolStudent = (await schoolStudentResponse.json()).student
    created.push(['schoolStudents', schoolStudent.id])
    const classDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const schoolClassResponse = await request.post(`/api/schools/${schoolId}/classes`, {
      headers: otherHeaders,
      data: {
        title: 'Clase visible en agenda',
        type: 'individual',
        teacherIds: [teacher.localId],
        studentIds: [schoolStudent.id],
        startDate: classDate,
        endDate: classDate,
        daysOfWeek: [new Date(`${classDate}T12:00:00Z`).getUTCDay()],
        startTime: '09:00',
        endTime: '10:00',
        timezone: 'America/Mexico_City',
        location: '',
        locationUrl: '',
        recurring: false,
      },
    })
    expect(schoolClassResponse.status()).toBe(201)
    const schoolClass = await schoolClassResponse.json()
    created.push(
      ['schoolClassSeries', schoolClass.seriesId],
      ...schoolClass.occurrences.map((occurrence: { id: string }) => [
        'schoolClassOccurrences',
        occurrence.id,
      ])
    )
    const month = classDate.slice(0, 7)
    const agendaResponse = await request.get(`/api/schools/${schoolId}/agenda?month=${month}`, {
      headers: otherHeaders,
    })
    expect(agendaResponse.status(), await agendaResponse.text()).toBe(200)
    const agendaPayload = await agendaResponse.json()
    const agenda = agendaPayload.bookings
    expect(Array.isArray(agenda), JSON.stringify(agendaPayload)).toBe(true)
    expect(
      agenda.some(
        (item: { schoolClassTitle?: string }) => item.schoolClassTitle === 'Clase visible en agenda'
      )
    ).toBe(true)
    const teacherAgendaResponse = await request.get(
      `/api/coach/agenda?month=${month}&schoolId=${schoolId}`,
      { headers: { authorization: `Bearer ${teacher.idToken}` } }
    )
    expect(teacherAgendaResponse.status(), await teacherAgendaResponse.text()).toBe(200)
    const teacherAgenda = (await teacherAgendaResponse.json()).bookings
    expect(
      teacherAgenda.some(
        (item: { schoolClassTitle?: string }) => item.schoolClassTitle === 'Clase visible en agenda'
      )
    ).toBe(true)
    const unassignedClasses = (
      await (
        await request.get(`/api/schools/${schoolId}/classes`, {
          headers: { authorization: `Bearer ${unassignedStudent.idToken}` },
        })
      ).json()
    ).classes
    expect(unassignedClasses).toHaveLength(0)
    expect(
      (
        await request.post(`/api/schools/${schoolId}/invitations`, {
          headers: otherHeaders,
          data: { email: owner.email, role: 'guardian' },
        })
      ).status()
    ).toBe(400)
    for (const profile of profiles) {
      const token = `token-${profile.id}`
      await seed('schoolInvitations', token, {
        id: token,
        schoolId,
        email: owner.email,
        role: 'student',
        status: 'pending',
        expiresAt: Date.now() + 60000,
        tokenHash: createHash('sha256').update(token).digest('hex'),
      })
      expect(
        (
          await request.post(`/api/school-invitations/${token}`, {
            headers,
            data: { additionalProfileId: profile.id },
          })
        ).status()
      ).toBe(200)
      created.push(['schoolStudents', `${schoolId}_${profile.id}`])
    }
    created.push(
      ['schoolMemberships', `${schoolId}_${owner.localId}`],
      ['schoolProfiles', `${schoolId}_${owner.localId}`]
    )
    const students = (
      await (await request.get(`/api/schools/${schoolId}/students`, { headers })).json()
    ).students
    expect(students).toHaveLength(2)
    expect(students.map((s: { name: string }) => s.name).sort()).toEqual([
      'Persona adulta',
      'Persona menor',
    ])
    const historyStudentId = `${schoolId}_${profiles[0].id}`
    const historyBookingId = `history-${schoolId}`
    const historyClassId = `history-class-${schoolId}`
    await seed('schoolClassOccurrences', historyClassId, {
      schoolId,
      title: 'Clase tomada en la escuela',
      date: '2020-01-01',
      startTime: '09:00',
      endTime: '10:00',
      status: 'completed',
      teacherIds: [teacher.localId],
      studentIds: [historyStudentId],
    })
    for (const role of ['teacher', 'student'])
      await seed('schoolReviews', `review-${role}-${schoolId}`, {
        schoolId,
        occurrenceId: historyClassId,
        studentId: historyStudentId,
        teacherId: teacher.localId,
        reviewerRole: role,
        rating: role === 'teacher' ? 4 : 5,
        comment: role === 'teacher' ? 'Buen avance' : 'Explicación clara',
      })
    await seed('bookings', historyBookingId, {
      schoolId,
      athleteId: historyStudentId,
      athleteName: 'Persona adulta',
      coachId: teacher.localId,
      date: '2020-01-02',
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
      attended: true,
    })
    await seed('bookings', `sibling-${schoolId}`, {
      schoolId,
      athleteId: `${schoolId}_${profiles[1].id}`,
      athleteName: 'Persona adulta',
      coachId: teacher.localId,
      date: '2020-01-03',
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
      attended: true,
    })
    await seed('bookings', `foreign-school-${schoolId}`, {
      schoolId: `foreign-${schoolId}`,
      athleteId: historyStudentId,
      athleteName: 'Persona adulta',
      coachId: teacher.localId,
      date: '2020-01-04',
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
      attended: true,
    })
    await seed('classEvaluations', historyBookingId, {
      coachId: teacher.localId,
      rating: 5,
      publicComment: 'Excelente clase',
    })
    await seed('privateClassEvaluations', historyBookingId, {
      privateComment: 'Comentario personal protegido',
      athleteId: owner.localId,
    })
    await seed('coachStudentProgressEntries', `booking_${historyBookingId}`, {
      bookingId: historyBookingId,
      coachId: teacher.localId,
      athleteId: historyStudentId,
      level: 2,
      coachAssessment: 3,
      result: 4,
      note: 'Mejoró su técnica',
    })
    const historyPath = `/api/schools/${schoolId}/students/${historyStudentId}/history`
    for (const authHeaders of [
      headers,
      otherHeaders,
      { authorization: `Bearer ${teacher.idToken}` },
    ]) {
      const response = await request.get(historyPath, { headers: authHeaders })
      expect(response.status(), await response.text()).toBe(200)
      const history = await response.json()
      expect(history.classes).toHaveLength(2)
      expect(
        history.classes.filter((item: { status: string }) => item.status === 'taken')
      ).toHaveLength(2)
      expect(history.coachNames[teacher.localId]).toBe('Profe de prueba')
      expect(
        history.classes.flatMap((item: { evaluations: unknown[] }) => item.evaluations)
      ).toHaveLength(4)
      expect(JSON.stringify(history)).not.toContain('Comentario personal protegido')
    }
    expect((await request.get(historyPath)).status()).toBe(401)
    expect(
      (
        await request.get(historyPath, {
          headers: { authorization: `Bearer ${unassignedStudent.idToken}` },
        })
      ).status()
    ).toBe(403)
    expect(
      (
        await request.get(`/api/schools/${schoolId}/students/${profiles[0].id}/history`, {
          headers: otherHeaders,
        })
      ).status()
    ).toBe(404)
    const enrollments = await Promise.all(
      [1, 2].map(() =>
        request.post(`/api/schools/${schoolId}/students`, {
          headers,
          data: {
            additionalProfileId: profiles[0].id,
            name: profiles[0].name,
            birthDate: profiles[0].birthDate,
            gender: profiles[0].gender,
          },
        })
      )
    )
    expect(enrollments.map((response) => response.status())).toEqual([201, 201])
    const enrollmentIds = await Promise.all(
      enrollments.map(async (response) => {
        const student = (await response.json()).student
        return student.id
      })
    )
    expect(enrollmentIds[0]).toBe(enrollmentIds[1])
    const token = `foreign-${schoolId}`
    await seed('schoolInvitations', token, {
      id: token,
      schoolId,
      email: outsider.email,
      role: 'student',
      status: 'pending',
      expiresAt: Date.now() + 60000,
      tokenHash: createHash('sha256').update(token).digest('hex'),
    })
    expect(
      (
        await request.post(`/api/school-invitations/${token}`, {
          headers: otherHeaders,
          data: { additionalProfileId: profiles[0].id },
        })
      ).status()
    ).toBe(400)
    expect(
      (await request.post('/api/auth/otp/request', { data: { email: owner.email } })).ok()
    ).toBe(true)
    const otp = await (
      await fetch(`${root}/otpLoginCodes/${encodeURIComponent(owner.email)}`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(
      `/auth/link?email=${encodeURIComponent(owner.email)}&token=${otp.fields.devLinkToken.stringValue}`
    )
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await page.waitForURL('**/athlete/bookings')
    await page.goto('/profile')
    const section = page.getByRole('region', { name: 'Adicionales', exact: true })
    await expect(section.getByText('Persona adulta', { exact: true })).toBeVisible()
    await expect(section.getByText('Persona menor', { exact: true })).toBeVisible()
    await page.screenshot({ path: '/tmp/nadamas-additional-mobile.png', fullPage: true })
    await page.evaluate((id) => window.localStorage.setItem('nadamas.schoolId', id), schoolId)
    await page.goto('/school/students')
    const historyButton = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Persona adulta', exact: true }) })
      .getByRole('button', { name: 'Ver historial' })
    await historyButton.click()
    const historyDialog = page.getByRole('dialog', { name: 'Historial de Persona adulta' })
    await expect(historyDialog.getByText('2 clases tomadas · 1 coach')).toBeVisible()
    await expect(historyDialog.getByText('Buen avance', { exact: true })).toBeVisible()
    await expect(historyDialog.getByText('Explicación clara', { exact: true })).toBeVisible()
    await page.screenshot({ path: '/tmp/nadamas-student-history-mobile.png', fullPage: true })
    await page.keyboard.press('Escape')
    await expect(historyDialog).toHaveCount(0)
    await expect(historyButton).toBeFocused()
    created.push(['otpLoginCodes', encodeURIComponent(owner.email)], ['users', owner.localId])
    const ownToken = `minor-${schoolId}`
    await seed('schoolInvitations', ownToken, {
      id: ownToken,
      schoolId,
      email: owner.email,
      role: 'student',
      status: 'pending',
      expiresAt: Date.now() + 60000,
      tokenHash: createHash('sha256').update(ownToken).digest('hex'),
    })
    expect(
      (
        await request.post(`/api/school-invitations/${ownToken}`, {
          headers,
          data: { name: 'Menor', birthDate: '2020-01-01', gender: 'otro' },
        })
      ).status()
    ).toBe(400)
    await page.goto(`/school/invitations/${ownToken}`)
    await page.getByLabel('¿Para quién es la invitación?').selectOption(profiles[1].id)
    await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Aceptar invitación', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Todo listo', exact: true })).toBeVisible()
    const teacherProfile = await request.post('/api/additional-profiles', {
      headers: { authorization: `Bearer ${teacher.idToken}` },
      data: { name: 'Hijo del profe', birthDate: '2020-01-01', gender: 'otro' },
    })
    expect(teacherProfile.status()).toBe(201)
    const child = (await teacherProfile.json()).profile
    created.push(['additionalProfiles', child.id], ['schoolStudents', `${schoolId}_${child.id}`])
    const teacherToken = `teacher-${schoolId}`
    await seed('schoolInvitations', teacherToken, {
      id: teacherToken,
      schoolId,
      email: teacher.email,
      role: 'student',
      status: 'pending',
      expiresAt: Date.now() + 60000,
      tokenHash: createHash('sha256').update(teacherToken).digest('hex'),
    })
    expect(
      (
        await request.post(`/api/school-invitations/${teacherToken}`, {
          headers: { authorization: `Bearer ${teacher.idToken}` },
          data: { additionalProfileId: child.id },
        })
      ).status()
    ).toBe(200)
    const teacherList = (
      await (
        await request.get(`/api/schools/${schoolId}/teachers`, { headers: otherHeaders })
      ).json()
    ).teachers
    expect(teacherList.find((item: { id: string }) => item.id === teacher.localId).name).toBe(
      'Profe de prueba'
    )
  } finally {
    await Promise.all(
      created.map(([collection, id]) =>
        fetch(`${root}/${collection}/${id}`, {
          method: 'DELETE',
          headers: { authorization: 'Bearer owner' },
        })
      )
    )
    await Promise.all(
      [owner, outsider, teacher, unassignedStudent].map((user) =>
        fetch(
          'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:delete?key=local-test',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ idToken: user.idToken }),
          }
        )
      )
    )
  }
})
