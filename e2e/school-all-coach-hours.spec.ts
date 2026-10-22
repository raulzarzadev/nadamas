import { expect, test } from '@playwright/test'

test('Todos creates each selected hour for each coach without duplicates or unassigned classes', async ({
  page,
  request,
}) => {
  test.setTimeout(90000)
  const suffix = crypto.randomUUID()
  const schoolId = `all-hours-${suffix}`
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  function encode(value: unknown): unknown {
    if (typeof value === 'string') return { stringValue: value }
    if (typeof value === 'boolean') return { booleanValue: value }
    if (typeof value === 'number') return { integerValue: String(value) }
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
  async function seed(path: string, value: Record<string, unknown>) {
    const response = await fetch(`${root}/${path}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({
        fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])),
      }),
    })
    expect(response.ok).toBe(true)
  }
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `all-hours-${suffix}@test.com`,
        password: 'local-test-password',
        returnSecureToken: true,
      }),
    }
  )
  const manager = await response.json()
  const teacherIds = [manager.localId, `teacher-a-${suffix}`, `teacher-b-${suffix}`]
  await seed(`schools/${schoolId}`, {
    id: schoolId,
    name: 'Escuela horarios todos',
    ownerId: manager.localId,
    timezone: 'America/Mazatlan',
  })
  for (const [index, userId] of teacherIds.entries()) {
    await seed(`users/${userId}`, {
      id: userId,
      email: index === 0 ? manager.email : `${userId}@test.com`,
      nickname: `Profe ${index}`,
      roles: { athlete: true, coach: true, admin: false },
    })
    await seed(`schoolMemberships/${schoolId}_${userId}`, {
      schoolId,
      userId,
      role: index === 0 ? 'director' : 'teacher',
      roles: index === 0 ? ['director', 'teacher'] : ['teacher'],
      status: 'active',
    })
  }
  expect(
    (await request.post('/api/auth/otp/request', { data: { email: manager.email } })).ok()
  ).toBe(true)
  const otp = await (
    await fetch(`${root}/otpLoginCodes/${manager.email}`, {
      headers: { authorization: 'Bearer owner' },
    })
  ).json()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(
    `/auth/link?email=${encodeURIComponent(manager.email)}&token=${otp.fields.devLinkToken.stringValue}`
  )
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await page.waitForURL(/\/athlete\/(bookings|progress)$/)
  await page.evaluate((id) => localStorage.setItem('nadamas.schoolId', id), schoolId)
  await page.goto(`/school/classes?schoolId=${schoolId}`)
  const addHours = async () => {
    await page.getByRole('button', { name: /^(Editar horario|Agregar horario ahora)$/ }).click()
    const editor = page.getByRole('dialog', { name: 'Editar horas', exact: true })
    await editor.getByRole('button', { name: 'Todos', exact: true }).click()
    await editor.getByRole('button', { name: 'Agregar horas', exact: true }).click()
    const picker = page.getByRole('dialog', { name: 'Agregar horas', exact: true })
    await picker.getByRole('button', { name: '08:00', exact: true }).click()
    await picker.getByRole('button', { name: '09:00', exact: true }).click()
    await picker.getByRole('button', { name: 'Agregar 2 horarios', exact: true }).click()
    await expect(editor.getByText('6 clases', { exact: false })).toBeVisible()
    await expect(
      editor.getByText(/3 (profes|entrenadores|coaches|profesores|instructores)/)
    ).toBeVisible()
    await expect(
      editor.getByRole('button', { name: 'Agregar horarios', exact: true })
    ).toBeEnabled()
    await editor.getByRole('button', { name: 'Agregar horarios', exact: true }).click()
    await expect(editor).not.toBeVisible()
  }
  await addHours()
  const headers = { authorization: `Bearer ${manager.idToken}` }
  const agenda = async () => {
    const res = await request.get(
      `/api/schools/${schoolId}/agenda?month=${new Date().toISOString().slice(0, 7)}`,
      { headers }
    )
    expect(res.ok()).toBe(true)
    return res.json()
  }
  const first = await agenda()
  const selectedDate = first.availableSlots.find(
    (slot: { startTime: string }) => slot.startTime === '08:00'
  )?.date
  expect(selectedDate).toBeTruthy()
  const slots = (data: typeof first) =>
    data.availableSlots.filter(
      (slot: { date: string; startTime: string }) =>
        slot.date === selectedDate && ['08:00', '09:00'].includes(slot.startTime)
    )
  expect(slots(first)).toHaveLength(6)
  for (const coachId of teacherIds)
    expect(
      slots(first).filter((slot: { coachId: string }) => slot.coachId === coachId)
    ).toHaveLength(2)
  await addHours()
  expect(slots(await agenda())).toHaveLength(6)
})
