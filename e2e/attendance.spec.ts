import { expect, test } from '@playwright/test'

/** Isolated emulator fixtures: no real accounts or school data are touched. */
test('pase de lista: credencial, incorporación, duplicados y modal móvil', async ({
  request,
  page,
}) => {
  test.setTimeout(60000)
  page.setDefaultTimeout(10000)
  let ready = false
  try {
    ready = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!ready, 'Requiere los emuladores de Firebase y la app con configuración local.')
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const suffix = crypto.randomUUID()
  const schoolId = `attendance-${suffix}`
  const occurrenceId = `attendance-class-${suffix}`
  const date = new Date().toISOString().slice(0, 10)
  const created = new Set<string>()
  function encode(value: unknown): Record<string, unknown> {
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
  async function seed(path: string, data: Record<string, unknown>) {
    created.add(path)
    const response = await fetch(`${root}/${path}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, encode(value)])
        ),
      }),
    })
    expect(response.ok).toBe(true)
  }
  async function signup(name: string, coach = false) {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `${name}-${suffix}@test.com`,
          password: 'test-local-password',
          returnSecureToken: true,
        }),
      }
    )
    const account = (await response.json()) as { localId: string; idToken: string; email: string }
    await seed(`users/${account.localId}`, {
      id: account.localId,
      email: account.email,
      nickname: name,
      roles: { athlete: true, coach, admin: false },
    })
    return account
  }
  const director = await signup('Director', true)
  const teacher = await signup('Profe', true)
  const athlete = await signup('Atleta Prueba')
  const outsider = await signup('Visitante')
  const headers = { authorization: `Bearer ${director.idToken}` }
  const credential = async (account: typeof director) => {
    const response = await request.get('/api/credentials', {
      headers: { authorization: `Bearer ${account.idToken}` },
    })
    expect(response.ok()).toBe(true)
    const item = (await response.json()).credentials[0] as {
      numericId: string
      qrToken: string
      profileId: string
    }
    created.add(`athleteIdentityRegistry/v1/profiles/user_${item.profileId}`)
    created.add(`athleteIdentityRegistry/v1/numbers/${item.numericId}`)
    created.add(`athleteIdentityRegistry/v1/tokens/${item.qrToken}`)
    return item
  }
  try {
    await seed(`schools/${schoolId}`, {
      id: schoolId,
      name: 'Escuela Pase de Lista',
      ownerId: director.localId,
      slug: `attendance-${suffix}`,
      isPublic: true,
      timezone: 'America/Mexico_City',
    })
    for (const [account, role] of [
      [director, 'director'],
      [teacher, 'teacher'],
    ] as const)
      await seed(`schoolMemberships/${schoolId}_${account.localId}`, {
        schoolId,
        userId: account.localId,
        role,
        roles: [role],
        status: 'active',
      })
    const studentId = `${schoolId}_${athlete.localId}`
    await seed(`schoolStudents/${studentId}`, {
      id: studentId,
      schoolId,
      name: 'Atleta Prueba',
      studentUserId: athlete.localId,
      status: 'active',
      guardianIds: [],
      managerIds: [],
      birthDate: '2000-01-01',
      gender: 'otro',
    })
    await seed(`schoolClassOccurrences/${occurrenceId}`, {
      id: occurrenceId,
      schoolId,
      seriesId: occurrenceId,
      title: 'Clase prueba',
      type: 'group',
      date,
      startTime: '18:00',
      endTime: '19:00',
      teacherIds: [teacher.localId],
      studentIds: [studentId],
      status: 'scheduled',
      timezone: 'America/Mexico_City',
      location: '',
      locationUrl: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const athleteCard = await credential(athlete)
    const outsiderCard = await credential(outsider)
    await credential(director)
    await credential(teacher)
    const endpoint = `/api/schools/${schoolId}/attendance`
    expect(
      (
        await request.get(`${endpoint}?date=${date}`, {
          headers: { authorization: `Bearer ${athlete.idToken}` },
        })
      ).status()
    ).toBe(403)
    const first = await request.post(endpoint, {
      headers,
      data: { occurrenceId, numericId: athleteCard.numericId, method: 'id' },
    })
    expect(first.ok()).toBe(true)
    expect((await first.json()).alreadyRecorded).toBe(false)
    const duplicate = await request.post(endpoint, {
      headers: { authorization: `Bearer ${teacher.idToken}` },
      data: { occurrenceId, qrValue: `nadamas:credential:${athleteCard.qrToken}`, method: 'qr' },
    })
    expect((await duplicate.json()).alreadyRecorded).toBe(true)
    const visitor = { occurrenceId, numericId: outsiderCard.numericId, method: 'id' }
    expect((await (await request.post(endpoint, { headers, data: visitor })).json()).code).toBe(
      'outside_school'
    )
    const enrolled = await request.post(endpoint, {
      headers,
      data: { ...visitor, addToClass: true, linkToSchool: true },
    })
    expect(enrolled.ok()).toBe(true)
    const newStudentId = (await enrolled.json()).studentId
    created.add(`schoolStudents/${newStudentId}`)
    for (const id of [studentId, newStudentId]) {
      created.add(`agendaStudentRecords/class-${occurrenceId}-${id}`)
      created.add(
        `schools/${schoolId}/attendance/${encodeURIComponent(`${schoolId}|${occurrenceId}|${id}`)}`
      )
    }
    const roster = await (
      await request.get(`${endpoint}?occurrenceId=${occurrenceId}`, { headers })
    ).json()
    expect(roster.roster).toHaveLength(2)
    expect(roster.roster.every((item: { attended: boolean }) => item.attended)).toBe(true)
    expect(JSON.stringify(roster)).not.toContain('qrToken')
    // Sign in through the real local OTP flow, then review the mobile modal.
    expect(
      (await request.post('/api/auth/otp/request', { data: { email: director.email } })).ok()
    ).toBe(true)
    created.add(`otpLoginCodes/${director.email}`)
    const otp = await (
      await fetch(`${root}/otpLoginCodes/${director.email}`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(
      `/auth/link?email=${encodeURIComponent(director.email)}&token=${otp.fields.devLinkToken.stringValue}`
    )
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await page.waitForURL(/\/athlete\/(bookings|progress)$/)
    await page.evaluate((id) => window.localStorage.setItem('nadamas.schoolId', id), schoolId)
    await page.goto(`/school/classes?school=${schoolId}&date=${date}`)
    await page.getByRole('button', { name: 'Pase de lista', exact: true }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Pase de lista' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: /18:00.*19:00/ }).click()
    await expect(dialog.getByText('2 asistencias registradas', { exact: false })).toBeVisible()
    await dialog.getByRole('button', { name: 'ID del atleta', exact: true }).click()
    await dialog.getByLabel('ID de seis dígitos').fill(athleteCard.numericId)
    await dialog.getByRole('button', { name: 'Buscar atleta', exact: true }).click()
    await expect(dialog.getByText('Atleta Prueba', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Procesando…', { exact: true })).toHaveCount(0)
    await expect(dialog.getByRole('listitem')).toHaveCount(1)
    const attendanceWidth = await dialog.evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }))
    expect(attendanceWidth.scroll).toBeLessThanOrEqual(attendanceWidth.client + 1)
    await page.screenshot({ path: '/tmp/nadamas-attendance-mobile.png', fullPage: true })
    await dialog.getByRole('button', { name: 'Escanear QR', exact: true }).click()
    await dialog
      .getByLabel('O pega el contenido del QR')
      .fill(`nadamas:credential:${athleteCard.qrToken}`)
    await dialog.getByRole('button', { name: 'Buscar credencial', exact: true }).click()
    await expect(
      dialog.getByText('Atleta Prueba: asistencia ya registrada.', { exact: true })
    ).toBeVisible()
    await dialog.getByRole('button', { name: 'Cerrar modal', exact: true }).click()
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Credencial digital', exact: true }).first().click()
    const credentialDialog = page.getByRole('dialog', { name: 'Credencial digital' })
    await expect(
      credentialDialog.locator('svg').filter({ has: page.locator('title') })
    ).toBeVisible()
    await expect(credentialDialog.getByText('Director', { exact: true })).toBeVisible()
    await page.screenshot({ path: '/tmp/nadamas-credential-mobile.png', fullPage: true })
    const width = await credentialDialog.evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }))
    expect(width.scroll).toBeLessThanOrEqual(width.client + 1)
  } finally {
    await page.close()
    await Promise.allSettled(
      [...created].map(async (path) => {
        const response = await fetch(
          `${root}/${path.split('/').map(encodeURIComponent).join('/')}`,
          {
            method: 'DELETE',
            headers: { authorization: 'Bearer owner' },
            signal: AbortSignal.timeout(5000),
          }
        )
        await response.arrayBuffer()
      })
    )
    await Promise.allSettled(
      [director, teacher, athlete, outsider].map(async (account) => {
        const response = await fetch(
          'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:delete?key=local-test',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ idToken: account.idToken }),
            signal: AbortSignal.timeout(5000),
          }
        )
        await response.arrayBuffer()
      })
    )
  }
})
