import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { validProfileBirthDate } from '../lib/additional-profile'
import { dateKey } from '../lib/coach-offerings'

test('valida nacimientos de adultos y menores sin aceptar fechas imposibles', () => {
  expect(validProfileBirthDate('1980-01-01')).toBe(true)
  expect(validProfileBirthDate('2020-01-01')).toBe(true)
  for (const value of ['2025-02-30', '2099-01-01', 'invalid', '2020-1-1'])
    expect(validProfileBirthDate(value)).toBe(false)
})

test('los Adicionales pertenecen a su cuenta y se vinculan a la escuela sin rol tutor', async ({
  request,
  page,
  browser,
}) => {
  test.setTimeout(120000)
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
    created.push(['schoolAgendaUpdates', schoolId])
    await seed('schools', schoolId, {
      name: 'Escuela prueba',
      isPublic: true,
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
    await seed('agendaStudentRecords', `class-${historyClassId}-${historyStudentId}`, {
      sourceId: historyClassId,
      studentId: historyStudentId,
      schoolId,
      coachId: teacher.localId,
      attended: true,
      note: 'Observación de entrenamiento',
      updatedAt: Date.now(),
    })
    const futureClassId = `future-class-${schoolId}`
    const futureClassDate = dateKey(new Date(Date.now() + 7 * 86400000))
    await seed('schoolClassOccurrences', futureClassId, {
      id: futureClassId,
      schoolId,
      title: 'Nueva clase grupal',
      type: 'group',
      date: futureClassDate,
      startTime: '09:00',
      endTime: '10:00',
      status: 'scheduled',
      teacherIds: [teacher.localId],
      studentIds: [],
      classFull: false,
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
    await seed('schoolStudents', `${schoolId}_${owner.localId}`, {
      id: `${schoolId}_${owner.localId}`,
      schoolId,
      name: 'Cuenta principal',
      studentUserId: owner.localId,
      guardianIds: [],
      managerIds: [],
      status: 'active',
    })
    const directBookingId = `direct-${schoolId}`
    await seed('bookings', directBookingId, {
      schoolId,
      athleteId: owner.localId,
      athleteName: 'Cuenta principal',
      coachId: teacher.localId,
      date: '2020-01-05',
      startTime: '11:00',
      endTime: '12:00',
      status: 'confirmed',
    })
    const ownBookingsResponse = await request.get('/api/bookings', { headers })
    expect(ownBookingsResponse.ok()).toBe(true)
    const ownBookingIds = (await ownBookingsResponse.json()).bookings.map(
      (item: { id: string }) => item.id
    )
    for (const id of [historyBookingId, `sibling-${schoolId}`, directBookingId])
      expect(ownBookingIds).toContain(id)
    expect(ownBookingIds).not.toContain(`foreign-school-${schoolId}`)
    expect(new Set(ownBookingIds).size).toBe(ownBookingIds.length)
    const outsiderBookings = (
      await (await request.get('/api/bookings', { headers: otherHeaders })).json()
    ).bookings
    expect(outsiderBookings.map((item: { id: string }) => item.id)).not.toContain(historyBookingId)
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
    await page.waitForURL(/\/athlete\/(bookings|progress)$/)
    await page.goto('/profile')
    const section = page.getByRole('region', { name: 'Atletas adicionales', exact: true })
    await expect(section.getByText('Persona adulta', { exact: true })).toBeVisible()
    await expect(section.getByText('Persona menor', { exact: true })).toBeVisible()
    await page.screenshot({ path: '/tmp/nadamas-additional-mobile.png', fullPage: true })
    await page.goto('/school/students')
    await expect(page.getByRole('heading', { name: 'Configura tu escuela' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ver historial' })).toHaveCount(0)
    expect(
      (await request.post('/api/auth/otp/request', { data: { email: outsider.email } })).ok()
    ).toBe(true)
    const directorOtp = await (
      await fetch(`${root}/otpLoginCodes/${encodeURIComponent(outsider.email)}`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
    created.push(['otpLoginCodes', encodeURIComponent(outsider.email)], ['users', outsider.localId])
    const directorPage = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await directorPage.goto(
      `/auth/link?email=${encodeURIComponent(outsider.email)}&token=${directorOtp.fields.devLinkToken.stringValue}`
    )
    await directorPage.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await directorPage.waitForURL(/\/athlete\/(bookings|progress)$/)
    await directorPage.evaluate(
      (id) => window.localStorage.setItem('nadamas.schoolId', id),
      schoolId
    )
    await directorPage.goto('/school/students')
    const historyButton = directorPage.getByRole('button', {
      name: 'Abrir perfil de Persona adulta',
      exact: true,
    })
    await historyButton.click()
    const profileDialog = directorPage.getByRole('dialog', { name: 'Perfil de Persona adulta' })
    await expect(
      profileDialog.getByRole('button', { name: 'Editar perfil', exact: true })
    ).toBeVisible()
    await profileDialog.getByRole('tab', { name: 'Seguimientos', exact: true }).click()
    const classesPanel = profileDialog.getByRole('tabpanel', { name: 'Seguimientos' })
    await expect(classesPanel.getByRole('listitem')).toHaveCount(2)
    await expect(classesPanel.getByText('Profe de prueba', { exact: true }).first()).toBeVisible()
    await expect(classesPanel.getByText('Buen avance', { exact: true })).toBeVisible()
    await expect(classesPanel.getByText('Observación de entrenamiento')).toBeVisible()
    await profileDialog.getByRole('tab', { name: 'Evaluaciones', exact: true }).click()
    await expect(profileDialog.getByRole('tabpanel', { name: 'Evaluaciones' })).toBeVisible()
    await expect(profileDialog.getByText('Otros comentarios', { exact: true })).toHaveCount(0)
    await profileDialog.getByRole('tab', { name: 'Horarios', exact: true }).click()
    await expect(profileDialog.getByRole('tabpanel', { name: 'Horarios' })).toBeVisible()
    await profileDialog.getByRole('button', { name: '+ Asignar clases', exact: true }).click()
    const assignmentDialog = directorPage.getByRole('dialog', {
      name: 'Asignar clases a Persona adulta',
    })
    await assignmentDialog.getByRole('button', { name: 'Semana siguiente', exact: true }).click()
    await assignmentDialog.getByRole('button', { name: 'Vista vertical', exact: true }).click()
    await assignmentDialog
      .getByRole('button', {
        name: new RegExp(`^[^ ]+ ${new Date(`${futureClassDate}T12:00:00`).getDate()}(?:$|:)`),
      })
      .first()
      .click()
    await assignmentDialog.getByRole('button', { name: 'Seleccionar', exact: true }).click()
    const assignmentResponse = directorPage.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith(`/students/${historyStudentId}/classes`)
    )
    await assignmentDialog.getByRole('button', { name: 'Asignar a 1 clases', exact: true }).click()
    expect(await (await assignmentResponse).json()).toMatchObject({
      assignedCount: 1,
      failedKeys: [],
    })
    await expect(assignmentDialog.getByText('Se asignó a 1 clase.', { exact: true })).toBeVisible()
    await directorPage.keyboard.press('Escape')
    await expect(profileDialog).toBeVisible()
    const assignedClass = (
      await (
        await request.get(`/api/schools/${schoolId}/classes`, { headers: otherHeaders })
      ).json()
    ).classes.find((item: { id: string }) => item.id === futureClassId)
    expect(assignedClass.studentIds).toContain(historyStudentId)
    await directorPage.screenshot({
      path: '/tmp/nadamas-student-history-mobile.png',
      fullPage: true,
    })
    await directorPage.keyboard.press('Escape')
    await expect(profileDialog).toHaveCount(0)
    await expect(historyButton).toBeFocused()
    const availableDate = dateKey(new Date())
    const offeringId = `hours-${schoolId}`
    await seed('schoolCoachOfferings', `${schoolId}_${teacher.localId}`, {
      schoolId,
      coachId: teacher.localId,
      classOfferings: [
        {
          id: offeringId,
          mode: 'fixed',
          groupType: 'particular',
          placeName: 'Alberca',
          currency: 'MXN',
          unit: 'clase',
          schedules: [
            {
              id: 'editable-hour',
              timeMode: 'fixed',
              startTime: '14:00',
              endTime: '15:00',
              availabilityMode: 'dates',
              days: [
                ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][
                  new Date(`${availableDate}T12:00:00`).getDay()
                ],
              ],
              availableDates: [availableDate],
            },
          ],
        },
      ],
    })
    await directorPage.goto('/school/classes')
    await directorPage.getByRole('button', { name: 'Vista vertical', exact: true }).click()
    await directorPage
      .getByRole('button', { name: 'Detalles del horario', exact: true })
      .first()
      .click()
    await directorPage.getByRole('button', { name: 'Configurar', exact: true }).click()
    const configuration = directorPage.getByRole('dialog', {
      name: 'Configurar clase',
      exact: true,
    })
    const groupButton = configuration.getByRole('button', { name: 'Grupal', exact: true })
    await groupButton.click()
    await expect(groupButton).toHaveAttribute('aria-pressed', 'true')
    const blockButton = configuration.getByRole('button', { name: 'Bloqueada', exact: true })
    const availableButton = configuration.getByRole('button', { name: 'Disponible', exact: true })
    const blockResponse = directorPage.waitForResponse(
      (r) =>
        r.request().method() === 'POST' && r.url().includes(`/teachers/${teacher.localId}/schedule`)
    )
    await blockButton.click()
    const blockPayload = await (await blockResponse).json()
    expect(blockPayload.block.coachId).toBe(teacher.localId)
    created.push(['coachScheduleBlocks', blockPayload.block.id])
    await expect(blockButton).toHaveAttribute('aria-pressed', 'true')
    await availableButton.click()
    await expect(blockButton).toHaveAttribute('aria-pressed', 'false')
    // A change from another client must reach the open director agenda.
    const remoteBlockResponse = await request.post(
      `/api/schools/${schoolId}/teachers/${teacher.localId}/schedule`,
      {
        headers: otherHeaders,
        data: {
          date: availableDate,
          allDay: false,
          startTime: '14:00',
          endTime: '15:00',
          hidden: false,
        },
      }
    )
    expect(remoteBlockResponse.status()).toBe(200)
    const remoteBlock = (await remoteBlockResponse.json()).block
    created.push(['coachScheduleBlocks', remoteBlock.id])
    await expect(blockButton).toHaveAttribute('aria-pressed', 'true')
    expect(
      (
        await request.delete(
          `/api/schools/${schoolId}/teachers/${teacher.localId}/schedule?id=${remoteBlock.id}`,
          { headers: otherHeaders }
        )
      ).status()
    ).toBe(200)
    await expect(blockButton).toHaveAttribute('aria-pressed', 'false')
    const signalUrl = `${root}/schoolAgendaUpdates/${schoolId}`
    const signal = await (
      await fetch(signalUrl, { headers: { authorization: `Bearer ${owner.idToken}` } })
    ).json()
    expect(signal.fields.revision.stringValue).toBeTruthy()
    expect(signal.fields.lastUpdate.timestampValue).toBeTruthy()
    expect(
      (
        await fetch(signalUrl, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${owner.idToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({ fields: { revision: { stringValue: 'forged' } } }),
        })
      ).status
    ).toBe(403)

    await configuration.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await directorPage
      .getByRole('dialog', { name: 'Detalles del horario' })
      .getByRole('button', { name: 'Cerrar', exact: true })
      .click()
    await directorPage
      .getByRole('button', { name: 'Agregar atleta a la clase', exact: true })
      .click()
    const addStudentDialog = directorPage.getByRole('dialog', {
      name: 'Agregar atletas',
      exact: true,
    })
    await expect(addStudentDialog).toBeVisible()
    await addStudentDialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await directorPage
      .getByRole('button', { name: 'Detalles del horario', exact: true })
      .first()
      .click()
    await directorPage.getByRole('button', { name: 'Configurar', exact: true }).click()
    await configuration.getByRole('button', { name: 'Eliminar horario', exact: true }).click()
    const deletionResponse = directorPage.waitForResponse(
      (r) =>
        r.request().method() === 'POST' && r.url().includes(`/teachers/${teacher.localId}/schedule`)
    )
    await directorPage.getByRole('button', { name: 'Eliminar horario', exact: true }).click()
    const deletionPayload = await (await deletionResponse).json()
    expect(deletionPayload.block.coachId).toBe(teacher.localId)
    expect(deletionPayload.block.hidden).toBe(true)
    created.push(['coachScheduleBlocks', deletionPayload.block.id])
    await expect(configuration).toHaveCount(0)
    await expect(
      directorPage
        .getByRole('region', { name: 'Agenda de la escuela' })
        .getByText('14:00', { exact: true })
    ).toHaveCount(0)
    await directorPage.close()
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
    await page.getByRole('checkbox', { name: 'Persona menor (Adicional)', exact: true }).check()
    await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Agregar a la escuela', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Todo listo', exact: true })).toBeVisible()
    const coachToken = `coach-${schoolId}`
    await seed('schoolInvitations', coachToken, {
      id: coachToken,
      schoolId,
      email: unassignedStudent.email,
      role: 'teacher',
      status: 'pending',
      expiresAt: Date.now() + 60000,
      tokenHash: createHash('sha256').update(coachToken).digest('hex'),
    })
    expect(
      (
        await request.post('/api/auth/otp/request', { data: { email: unassignedStudent.email } })
      ).ok()
    ).toBe(true)
    const coachOtp = await (
      await fetch(`${root}/otpLoginCodes/${encodeURIComponent(unassignedStudent.email)}`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
    created.push(
      ['otpLoginCodes', encodeURIComponent(unassignedStudent.email)],
      ['users', unassignedStudent.localId],
      ['schoolProfiles', `${schoolId}_${unassignedStudent.localId}`]
    )
    const coachPage = await browser.newPage()
    await coachPage.goto(
      `/auth/link?email=${encodeURIComponent(unassignedStudent.email)}&token=${coachOtp.fields.devLinkToken.stringValue}`
    )
    await coachPage.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await coachPage.waitForURL(/\/athlete\/(bookings|progress)$/)
    await coachPage.goto(`/school/invitations/${coachToken}`)
    await coachPage.getByLabel('Nombre completo', { exact: true }).fill('Coach invitado')
    await coachPage.getByRole('button', { name: 'Aceptar invitación', exact: true }).click()
    await coachPage.getByRole('button', { name: 'Ir al modo entrenador', exact: true }).click()
    await expect(coachPage).toHaveURL(/\/coach\/agenda/)
    await expect(
      coachPage.getByRole('button', {
        name: 'Escuela prueba. Cambiar espacio de trabajo',
        exact: true,
      })
    ).toBeVisible()
    expect(
      await coachPage.evaluate(() => window.localStorage.getItem('nadamas.coachSelection'))
    ).toBe(schoolId)

    created.push(['schoolCoachOfferings', `${schoolId}_${unassignedStudent.localId}`])
    const syncDate = dateKey(new Date(Date.now() + 86400000))
    const remoteOffering = {
      id: `realtime-${schoolId}`,
      mode: 'fixed',
      placeName: 'Alberca',
      groupType: 'particular',
      currency: 'MXN',
      unit: 'clase',
      schedules: [
        {
          id: 'realtime-hour',
          startTime: '16:00',
          endTime: '17:00',
          timeMode: 'fixed',
          days: [
            ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][
              new Date(`${syncDate}T12:00:00`).getDay()
            ],
          ],
          availabilityMode: 'dates',
          availableDates: [syncDate],
        },
      ],
    }
    expect(
      (
        await request.post(
          `/api/schools/${schoolId}/teachers/${unassignedStudent.localId}/schedule`,
          { headers: otherHeaders, data: { classOfferings: [remoteOffering] } }
        )
      ).status()
    ).toBe(200)
    await expect(coachPage.getByText('16:00', { exact: true })).toBeVisible()
    await coachPage.getByRole('button', { name: 'Vista vertical', exact: true }).click()
    await coachPage
      .getByRole('button', {
        name: new RegExp(`^[^ ]+ ${new Date(`${syncDate}T12:00:00`).getDate()}:`),
      })
      .click()
    await page.goto('/athlete/schedule')
    // Horarios lists upcoming classes inline at the top.
    await expect(page.getByRole('heading', { name: 'Próximas clases', level: 1 })).toBeVisible()
    const bookingResponse = await request.post('/api/coach/agenda/bookings', {
      headers: otherHeaders,
      data: {
        schoolId,
        coachId: unassignedStudent.localId,
        date: syncDate,
        startTime: '16:00',
        endTime: '17:00',
        athleteId: historyStudentId,
        athleteName: 'Alumno sincronizado',
        groupType: 'particular',
        locationName: 'Alberca',
      },
    })
    expect(bookingResponse.status(), await bookingResponse.text()).toBe(200)
    const syncedBooking = (await bookingResponse.json()).booking
    created.push(['bookings', syncedBooking.id])
    await expect(page.locator('main').getByText('16:00', { exact: true }).first()).toBeVisible()
    await expect(coachPage.getByText('Alumno sincronizado', { exact: true })).toBeVisible()
    const directoryResponse = await request.get(`/api/schools/${schoolId}/coaches`, { headers })
    expect(directoryResponse.ok()).toBe(true)
    const directory = await directoryResponse.json()
    expect(directory.coaches.map((coach: { id: string }) => coach.id).sort()).toEqual(
      [outsider.localId, teacher.localId, unassignedStudent.localId].sort()
    )
    await page.goto(`/athlete/search/school/${schoolId}/schedule`)
    await expect(page.getByText('16:00', { exact: true })).toBeVisible()
    await expect(page.getByText('Alumno sincronizado', { exact: true })).toHaveCount(0)
    await page.getByRole('link', { name: 'Quitar Escuela prueba', exact: true }).click()
    await expect(page).toHaveURL(/\/athlete\/schedule(?:\?search=schools)?$/)

    const evaluationData = {
      rating: 5,
      topics: ['technique'],
      publicComment: 'Excelente clase',
      privateComment: 'Comentario personal protegido',
    }
    for (const authHeaders of [
      otherHeaders,
      { authorization: `Bearer ${unassignedStudent.idToken}` },
    ]) {
      expect(
        (
          await request.put(`/api/bookings/${historyBookingId}/evaluation`, {
            headers: authHeaders,
            data: evaluationData,
          })
        ).status()
      ).toBe(404)
      expect(
        (
          await request.delete(`/api/bookings/${syncedBooking.id}`, { headers: authHeaders })
        ).status()
      ).toBe(403)
    }
    expect(
      (
        await request.put(`/api/bookings/${historyBookingId}/evaluation`, {
          headers,
          data: evaluationData,
        })
      ).status()
    ).toBe(200)
    const cancelled = await request.delete(`/api/bookings/${syncedBooking.id}`, { headers })
    expect(cancelled.status(), await cancelled.text()).toBe(200)

    await coachPage.goto('/coach/students')
    await coachPage
      .getByRole('button', { name: /Todos mis (alumnos|atletas).*Cambiar espacio de trabajo/ })
      .click()
    await coachPage
      .getByRole('dialog', { name: 'Espacio de trabajo', exact: true })
      .getByRole('button', { name: 'Escuela prueba', exact: true })
      .click()
    await expect(
      coachPage.getByRole('button', {
        name: 'Escuela prueba. Cambiar espacio de trabajo',
        exact: true,
      })
    ).toBeVisible()
    await coachPage.close()
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
