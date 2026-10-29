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
  return (await response.json()) as { localId: string }
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

async function seedSchool(options: { teachers: number; students: number }) {
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
  return { schoolId, email }
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
