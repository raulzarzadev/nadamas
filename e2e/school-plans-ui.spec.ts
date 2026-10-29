import { expect, type Page, test } from '@playwright/test'

const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
const BASIC_MESSAGE =
  'Llegaste al límite de tu plan Básico (5 profes / 100 alumnos). Contáctanos para un plan personalizado.'

const encode = (value: unknown): Record<string, unknown> => {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') return { integerValue: String(value) }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, encode(v)])
      ),
    },
  }
}

async function emulatorsReady() {
  try {
    return (await fetch('http://127.0.0.1:8080')).ok
  } catch {
    return false
  }
}

async function seed(path: string, values: Record<string, unknown>) {
  const response = await fetch(`${root}/${path}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, encode(v)])),
    }),
  })
  expect(response.ok).toBe(true)
}

async function signup(email: string) {
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'local-test-password', returnSecureToken: true }),
    }
  )
  expect(response.ok).toBe(true)
  return (await response.json()) as { localId: string; idToken: string }
}

async function login(page: Page, email: string) {
  const policy = page.getByRole('button', { name: 'Aceptar política y continuar' })
  const emailField = page.getByLabel('Correo', { exact: true })
  await policy.or(emailField).first().waitFor()
  if (await policy.count()) await policy.click()
  await emailField.fill(email)
  await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'))
}

async function seedSchool(options: { teachers: number; students: number; isPublic?: boolean }) {
  const id = crypto.randomUUID().slice(0, 8)
  const schoolId = `plansui-${id}`
  const email = `plansui-${id}@test.com`
  const director = await signup(email)
  const now = Date.now()
  await seed(`users/${director.localId}`, {
    email,
    nickname: 'Directora Plan',
    roles: { athlete: true, coach: true, admin: false },
  })
  await seed(`schools/${schoolId}`, {
    name: 'Escuela Plan',
    slug: schoolId,
    directorId: director.localId,
    createdBy: director.localId,
    timezone: 'America/Mexico_City',
    isPublic: options.isPublic ?? false,
    createdAt: now,
    updatedAt: now,
  })
  await seed(`schoolMemberships/${schoolId}_${director.localId}`, {
    schoolId,
    userId: director.localId,
    role: 'director',
    roles: ['director'],
    status: 'active',
  })
  await seed(`schoolSubscriptions/${schoolId}`, {
    schoolId,
    ownerId: director.localId,
    trialStartedAt: now,
    trialEndsAt: now + 20 * 86400000,
    periodStartedAt: null,
    periodEndsAt: null,
    cancelAtPeriodEnd: false,
    promotionalCodeId: null,
    promotionalGrantedAt: null,
    pendingOrderId: null,
    provisionalOrderId: null,
    createdAt: now,
    updatedAt: now,
  })
  for (let i = 0; i < options.teachers; i++)
    await seed(`schoolMemberships/${schoolId}_t${i}`, {
      schoolId,
      userId: `t${i}`,
      role: 'teacher',
      roles: ['teacher'],
      status: 'active',
    })
  for (let i = 0; i < options.students; i++)
    await seed(`schoolStudents/${schoolId}_s${i}`, {
      schoolId,
      name: `Alumno ${i}`,
      status: 'active',
      studentUserId: `s${i}`,
    })
  return { schoolId, email, directorToken: director.idToken, directorId: director.localId }
}

test('/precio shows the Básico and Personalizado plans without "todos sus profesores"', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/precio')
  await expect(page.getByText('Hasta 5 profes y 100 alumnos')).toBeVisible()
  await expect(page.getByText(/Prueba de 30 días/).first()).toBeVisible()
  await expect(page.getByText('Más de 5 profes o 100 alumnos')).toBeVisible()
  await expect(page.getByText('Precio a la medida')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Contáctanos' })).toHaveAttribute('href', '/contacto')
  expect(await page.content()).not.toMatch(/todos sus profesores|todos tus profesores/i)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('a school at 100/100 students sees the Básico limit notice with a contact link', async ({
  page,
}) => {
  test.setTimeout(180000)
  test.skip(!(await emulatorsReady()), 'requiere emuladores de Firebase')
  const { email } = await seedSchool({ teachers: 0, students: 100 })
  await page.goto('/login')
  await login(page, email)
  await page.goto('/school/students')
  await page.getByRole('button', { name: /^Agregar/ }).click()
  await page.getByRole('textbox', { name: 'Nombre completo' }).fill('Alumno Extra')
  await page.getByRole('button', { name: 'Hoy' }).click()
  await page.getByRole('button', { name: 'Guardar atleta' }).click()
  const alert = page.getByRole('alert').filter({ hasText: BASIC_MESSAGE })
  await expect(alert).toBeVisible()
  await expect(alert.getByRole('link', { name: 'Contáctanos' })).toHaveAttribute(
    'href',
    '/contacto'
  )
})

test('subscription screen shows plan usage', async ({ page }) => {
  test.setTimeout(120000)
  test.skip(!(await emulatorsReady()), 'requiere emuladores de Firebase')
  const { email, schoolId } = await seedSchool({ teachers: 2, students: 3 })
  await page.goto('/login')
  await login(page, email)
  await page.goto(`/school/subscription?schoolId=${schoolId}`)
  await expect(page.getByText('2 de 5 profes')).toBeVisible()
  await expect(page.getByText('3 de 100 alumnos')).toBeVisible()
  await expect(page.getByText('Plan Básico')).toBeVisible()
})

test('subscription screen at 101/100 shows the over-limit notice with a contact link', async ({
  page,
}) => {
  test.setTimeout(180000)
  test.skip(!(await emulatorsReady()), 'requiere emuladores de Firebase')
  const { email, schoolId } = await seedSchool({ teachers: 0, students: 101 })
  await page.goto('/login')
  await login(page, email)
  await page.goto(`/school/subscription?schoolId=${schoolId}`)
  await expect(page.getByText('101 de 100 alumnos')).toBeVisible()
  const notice = page.getByRole('status').filter({
    hasText:
      'Tu escuela supera los límites del plan Básico. Contáctanos para un plan personalizado.',
  })
  await expect(notice).toBeVisible()
  await expect(notice.getByRole('link', { name: 'Contáctanos' })).toHaveAttribute(
    'href',
    '/contacto'
  )
})

test('an athlete requesting a class at 100/100 is told to let the school know', async ({
  page,
  request,
}) => {
  test.setTimeout(180000)
  test.skip(!(await emulatorsReady()), 'requiere emuladores de Firebase')
  // 99 seeded swimmers + the athlete's own seat = 100/100; enrolling her child needs a 101st.
  const { schoolId, directorToken, directorId } = await seedSchool({
    teachers: 0,
    students: 99,
    isPublic: true,
  })
  const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
  const schedule = await request.post(`/api/schools/${schoolId}/teachers/${directorId}/schedule`, {
    headers: { authorization: `Bearer ${directorToken}` },
    data: {
      classOfferings: [
        {
          id: `plan-${schoolId}`,
          mode: 'fixed',
          placeName: 'Alberca',
          groupType: 'particular',
          currency: 'MXN',
          unit: 'clase',
          schedules: [
            {
              id: 'plan-hour',
              startTime: '16:00',
              endTime: '17:00',
              timeMode: 'fixed',
              days: [
                ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][
                  new Date(`${date}T12:00:00`).getDay()
                ],
              ],
              availabilityMode: 'dates',
              availableDates: [date],
            },
          ],
        },
      ],
    },
  })
  expect(schedule.status(), await schedule.text()).toBe(200)
  const athleteEmail = `plansui-athlete-${crypto.randomUUID().slice(0, 8)}@test.com`
  const athlete = await signup(athleteEmail)
  await seed(`users/${athlete.localId}`, {
    email: athleteEmail,
    nickname: 'Nadadora Nueva',
    roles: { athlete: true, coach: false, admin: false },
  })
  await seed(`schoolMemberships/${schoolId}_${athlete.localId}`, {
    schoolId,
    userId: athlete.localId,
    role: 'student',
    roles: ['student'],
    status: 'active',
  })
  await seed(`schoolStudents/${schoolId}_${athlete.localId}`, {
    schoolId,
    name: 'Nadadora Nueva',
    status: 'active',
    studentUserId: athlete.localId,
    accountParticipant: true,
    managerIds: [athlete.localId],
    guardianIds: [athlete.localId],
  })
  const child = await request.post('/api/additional-profiles', {
    headers: { authorization: `Bearer ${athlete.idToken}` },
    data: { name: 'Hija Nueva', birthDate: '2018-01-01', gender: 'otro' },
  })
  expect(child.status(), await child.text()).toBe(201)
  await page.goto('/login')
  await login(page, athleteEmail)
  await page.goto(`/athlete/search/school/${schoolId}/schedule?date=${date}`)
  await page.getByRole('button', { name: /· 16:00 · Directora Plan/ }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Solicitar horario' })
  await dialog.getByRole('checkbox', { name: 'Nadadora Nueva (yo)' }).uncheck()
  await dialog.getByRole('checkbox', { name: /Hija Nueva/ }).check()
  const sent = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/schools/${schoolId}/class-requests`) &&
      response.request().method() === 'POST'
  )
  await dialog.getByRole('button', { name: 'Enviar solicitud', exact: true }).click()
  const response = await sent
  expect(response.status(), await response.text()).toBe(409)
  expect((await response.json()).code).toBe('plan_limit_reached')
  await expect(
    dialog.getByText('La escuela llegó al límite de su plan. Avísale a la escuela.', {
      exact: false,
    })
  ).toBeVisible()
})
