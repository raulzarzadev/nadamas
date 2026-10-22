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
  const pastDate = '2026-01-12'
  for (const [index, status] of ['completed', 'completed', 'cancelled', 'pending'].entries()) {
    await seed(`schoolClassOccurrences/follow-up-${index}-${suffix}`, {
      id: `follow-up-${index}-${suffix}`,
      schoolId,
      teacherIds: [teacherIds[1]],
      studentIds: ['student-one'],
      title: `Clase seguimiento ${index}`,
      date: pastDate,
      startTime: `${String(8 + index).padStart(2, '0')}:00`,
      endTime: `${String(9 + index).padStart(2, '0')}:00`,
      timezone: 'America/Mazatlan',
      status,
      type: 'group',
    })
  }
  await seed(`schoolClassNotes/comment-${suffix}`, {
    schoolId,
    coachId: teacherIds[1],
    date: pastDate,
    startTime: '08:00',
    note: 'Buen avance en técnica de respiración.',
  })
  await seed(`schoolClassNotes/other-coach-${suffix}`, {
    schoolId,
    coachId: teacherIds[2],
    date: pastDate,
    startTime: '09:00',
    note: 'Comentario privado de otro profe.',
  })
  const followUpsResponse = await request.get(
    `/api/schools/${schoolId}/teachers/${teacherIds[1]}/follow-ups`,
    { headers }
  )
  expect(followUpsResponse.ok()).toBe(true)
  const followUps = (await followUpsResponse.json()).classes
  expect(followUps).toHaveLength(2)
  expect(followUps[0].comment).toBe('')
  expect(followUps[1].comment).toBe('Buen avance en técnica de respiración.')
  await page.goto(`/school/coaches?schoolId=${schoolId}`)
  await page.getByRole('button', { name: 'Ver horarios de Profe 1', exact: true }).click()
  const teacherProfile = page.getByRole('dialog', { name: 'Ficha de Profe 1', exact: true })
  await expect(teacherProfile).toBeVisible()
  await expect(
    teacherProfile.getByRole('region', { name: 'Horarios de Profe 1', exact: true })
  ).toBeVisible()
  await expect(
    teacherProfile.getByRole('button', { name: 'Ver horarios', exact: true })
  ).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Editar horas', exact: true })).toHaveCount(0)
  await expect(teacherProfile.getByText('08:00', { exact: true }).first()).toBeVisible()
  await expect(teacherProfile.getByLabel('Puede aprobar reservas de la escuela')).toHaveCount(0)
  await teacherProfile.getByRole('button', { name: 'Editar perfil', exact: true }).click()
  await expect(teacherProfile.getByLabel('Puede aprobar reservas de la escuela')).toBeVisible()
  await teacherProfile.getByRole('button', { name: 'Listo', exact: true }).click()
  await expect(teacherProfile.getByLabel('Puede aprobar reservas de la escuela')).toHaveCount(0)
  await teacherProfile.getByRole('tab', { name: 'Seguimientos', exact: true }).click()
  const followUpsPanel = teacherProfile.getByRole('tabpanel', { name: 'Seguimientos' })
  await expect(followUpsPanel.getByText('Buen avance en técnica de respiración.')).toBeVisible()
  await expect(followUpsPanel.getByText('Pendiente', { exact: true })).toHaveCount(1)
  await expect(followUpsPanel.getByText('Comentario privado de otro profe.')).toHaveCount(0)
  await teacherProfile.getByRole('tab', { name: 'Horarios', exact: true }).click()
  await expect(teacherProfile.getByText('08:00', { exact: true }).first()).toBeVisible()
  await teacherProfile
    .getByRole('button', { name: new RegExp(`${selectedDate}.*08:00.*Profe 1`) })
    .click()
  const slotDetails = page.getByRole('dialog', { name: 'Horario seleccionado', exact: true })
  await expect(
    slotDetails.getByRole('button', { name: 'Seleccionar más horarios', exact: true })
  ).toBeVisible()
  await expect(slotDetails.getByRole('button', { name: 'Configurar', exact: true })).toBeVisible()
  await expect(slotDetails.getByRole('button', { name: 'Entreno', exact: true })).toBeVisible()
  await expect(slotDetails.getByRole('button', { name: 'Nota', exact: true })).toBeVisible()
  await slotDetails.getByRole('button', { name: 'Seleccionar más horarios', exact: true }).click()
  await teacherProfile
    .getByRole('button', { name: new RegExp(`${selectedDate}.*09:00.*Profe 1`) })
    .click()
  await teacherProfile.getByRole('button', { name: 'Configurar', exact: true }).click()
  const batchConfig = page.getByRole('dialog', {
    name: 'Configurar horarios seleccionados',
    exact: true,
  })

  await expect(batchConfig.getByRole('tab')).toHaveCount(0)
  await expect(batchConfig.getByText('Estado del horario', { exact: true })).toBeVisible()
  await expect(batchConfig.getByText('Tipo de clase', { exact: true })).toBeVisible()
  await expect(
    batchConfig.getByText('Profes de los horarios seleccionados', { exact: true })
  ).toBeVisible()
  await batchConfig.getByRole('button', { name: 'Grupal', exact: true }).click()
  await batchConfig.getByRole('button', { name: 'Bloqueada', exact: true }).click()
  await batchConfig.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(batchConfig).not.toBeVisible()
  const changed = slots(await agenda()).filter(
    (slot: { coachId: string }) => slot.coachId === teacherIds[1]
  )
  expect(changed).toHaveLength(2)
  expect(
    changed.every(
      (slot: { groupType: string; status: string }) =>
        slot.groupType === 'grupal' && slot.status === 'blocked'
    )
  ).toBe(true)
  await teacherProfile
    .getByRole('button', { name: new RegExp(`${selectedDate}.*08:00.*Profe 1`) })
    .click()
  await slotDetails.getByRole('button', { name: 'Seleccionar más horarios', exact: true }).click()
  await teacherProfile
    .getByRole('button', { name: new RegExp(`${selectedDate}.*09:00.*Profe 1`) })
    .click()
  await teacherProfile.getByRole('button', { name: 'Configurar', exact: true }).click()
  await batchConfig.getByRole('button', { name: 'Eliminar clases', exact: true }).click()
  const confirmation = page.getByRole('dialog', {
    name: 'Eliminar clases seleccionadas',
    exact: true,
  })
  await expect(
    confirmation.getByRole('heading', { name: 'Eliminar 2 clases', exact: true })
  ).toBeVisible()
  await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect(slots(await agenda())).toHaveLength(6)
  await batchConfig.getByRole('button', { name: 'Eliminar clases', exact: true }).click()
  await confirmation.getByRole('button', { name: 'Eliminar clases', exact: true }).click()
  await expect(confirmation).not.toBeVisible()
  const remaining = slots(await agenda())
  expect(remaining).toHaveLength(4)
  expect(remaining.some((slot: { coachId: string }) => slot.coachId === teacherIds[1])).toBe(false)
})
