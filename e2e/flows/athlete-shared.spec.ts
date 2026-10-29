import { type APIRequestContext, type Browser, expect, type Page, test } from '@playwright/test'

const SHOTS =
  '/private/tmp/claude-501/-Users-zarza-Documents-projects-nadamas/cac27305-4eea-4c23-ae5d-b01232a15e92/scratchpad/flow-agents/shots'
const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
const authLookup =
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/nadamas-b1ecf/accounts:lookup'
const NOT_AVAILABLE = 'Este entreno no está disponible o el enlace ya no es válido.'
const admin = { authorization: 'Bearer owner', 'content-type': 'application/json' }

test.use({ viewport: { width: 390, height: 844 } })

async function loginAs(page: Page, request: APIRequestContext, email: string) {
  expect((await request.post('/api/auth/otp/request', { data: { email } })).ok()).toBe(true)
  const otp = await (
    await fetch(`${root}/otpLoginCodes/${email}`, { headers: { authorization: 'Bearer owner' } })
  ).json()
  await page.goto(
    `/auth/link?email=${encodeURIComponent(email)}&token=${otp.fields.devLinkToken.stringValue}`
  )
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await page.waitForURL(/\/athlete\/(bookings|progress)$/)
}

async function uidOf(email: string) {
  const response = await fetch(authLookup, {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({ email: [email] }),
  })
  return ((await response.json()).users[0] as { localId: string }).localId
}

async function planIdOf(authorUid: string) {
  const plans = (
    await (await fetch(`${root}/trainingPlans?pageSize=1000`, { headers: admin })).json()
  ).documents as Array<{ name: string; fields: { userId: { stringValue: string } } }>
  return plans
    .find((doc) => doc.fields.userId?.stringValue === authorUid)
    ?.name.split('/')
    .pop() as string
}

type FsValue = Record<string, unknown>
function toFs(value: unknown): FsValue {
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') return { integerValue: String(value) }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFs) } }
  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(value as object).map(([k, v]) => [k, toFs(v)])),
    },
  }
}

const localDate = (offsetDays: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function createMacro(page: Page, title: string) {
  await page.getByRole('button', { name: /^(Crear mi primer (MACRO-ciclo|macrociclo)|Crear entreno)$/i }).click()
  const wizard = page.getByRole('dialog', { name: 'Crear MACRO-ciclo', exact: true })
  await wizard.getByRole('checkbox', { name: 'Lun', exact: true }).check()
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click()
  await wizard.getByLabel('Título de la competencia', { exact: true }).fill(title)
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click()
  await wizard.getByRole('button', { name: 'Crear MACRO-ciclo', exact: true }).click()
  await expect(wizard).not.toBeVisible()
}

const workout = (id: string, title: string) => ({
  id,
  title,
  observations: 'Buena técnica en los giros',
  blocks: [
    {
      id: `${id}-b1`,
      title: 'Calentamiento',
      repetitions: 3,
      series: [
        {
          id: `${id}-s1`,
          repetitions: 4,
          distanceMeters: 100,
          intervalType: 'interval',
          exercise: 'Libre',
          material: '',
          interval: '1:30',
        },
        {
          id: `${id}-s2`,
          repetitions: 1,
          distanceMeters: 200,
          intervalType: 'interval',
          exercise: 'Espalda suave',
          material: '',
          interval: '4:00',
        },
      ],
    },
  ],
})

// macro > meso > micro with sessions today, +2 and -2 days, each with a structured workout.
async function seedPlan(planId: string, title: string, visibility: 'public' | 'private') {
  const start = localDate(-14)
  const end = localDate(42)
  const base = { goal: '', content: '', startDate: start, endDate: end }
  const cycles = [
    { ...base, id: 'macro-e', parentId: null, type: 'macro', title, goal: 'Base aeróbica', sessionWeekdays: [0, 1, 2, 3, 4, 5, 6] },
    { ...base, id: 'meso-a', parentId: 'macro-e', type: 'meso', title: 'Volumen', endDate: localDate(14) },
    { ...base, id: 'meso-b', parentId: 'macro-e', type: 'meso', title: 'Intensidad', startDate: localDate(15) },
    {
      ...base,
      id: 'micro-a',
      parentId: 'meso-a',
      type: 'micro',
      title: 'Semana 1',
      endDate: localDate(14),
      objectiveDates: [localDate(0), localDate(2), localDate(-2)],
      objectiveTitles: ['Sesión hoy', 'Sesión próxima', 'Sesión pasada'],
      objectives: ['Nado continuo', '', ''],
      objectiveWorkouts: {
        '0': [workout('w0', 'Entreno de hoy A')],
        '1': [workout('w1', 'Entreno próximo')],
        '2': [workout('w2', 'Entreno pasado')],
      },
    },
  ]
  const summary = {
    title,
    goal: 'Base aeróbica',
    content: '',
    startDate: start,
    endDate: end,
    sessionWeekdays: [0, 1, 2, 3, 4, 5, 6],
    authorName: 'Coach Seed',
    authorPhoto: '',
    authorRole: 'coach',
  }
  const response = await fetch(
    `${root}/trainingPlans/${planId}?updateMask.fieldPaths=cycles&updateMask.fieldPaths=summary&updateMask.fieldPaths=visibility`,
    {
      method: 'PATCH',
      headers: admin,
      body: JSON.stringify({
        fields: { cycles: toFs(cycles), summary: toFs(summary), visibility: toFs(visibility) },
      }),
    }
  )
  expect(response.ok).toBe(true)
}

async function coachWithPlan(
  browser: Browser,
  request: APIRequestContext,
  visibility: 'public' | 'private'
) {
  const suffix = crypto.randomUUID()
  const title = `Plan compartido ${suffix.slice(0, 8)}`
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const page = await context.newPage()
  page.setDefaultTimeout(30000)
  const email = `coach-${suffix}@test.com`
  await loginAs(page, request, email)
  await page.goto('/athlete/training')
  await createMacro(page, `Temp ${suffix}`)
  await page.reload()
  const planId = await planIdOf(await uidOf(email))
  expect(planId).toBeTruthy()
  await seedPlan(planId, title, visibility)
  return { context, page, planId, title }
}

async function freshAthlete(browser: Browser, request: APIRequestContext) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.setDefaultTimeout(30000)
  await loginAs(page, request, `swimmer-${crypto.randomUUID()}@test.com`)
  return { context, page }
}

test('public link: logged out -> login -> lands back on plan', async ({ browser, request }) => {
  test.setTimeout(120000)
  const coach = await coachWithPlan(browser, request, 'public')
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  page.setDefaultTimeout(30000)
  await page.goto(`/athlete/training/plans/${coach.planId}`)
  await page.waitForURL(/\/login\?redirectTo=/)
  await page.screenshot({ path: `${SHOTS}/athlete-shared-logged-out-login.png` })
  await page.getByRole('button', { name: 'Aceptar política y continuar' }).click()
  await page.getByLabel('Correo', { exact: true }).fill(`cold-${crypto.randomUUID()}@test.com`)
  await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL(`**/athlete/training/plans/${coach.planId}`)
  await expect(page.getByRole('heading', { name: coach.title })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Suscribirme', exact: true })).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/athlete-shared-preview.png`, fullPage: true })
  await coach.context.close()
  await context.close()
})

test('subscribe -> Entrenos tab read-only, today, bars, navigation, block view', async ({
  browser,
  request,
}) => {
  test.setTimeout(150000)
  const coach = await coachWithPlan(browser, request, 'public')
  const { page, context } = await freshAthlete(browser, request)
  await page.goto(`/athlete/training/plans/${coach.planId}`)
  await expect(page.getByRole('heading', { name: coach.title })).toBeVisible()
  await page.getByRole('button', { name: 'Suscribirme', exact: true }).click()
  await expect(page.getByText('Suscrito', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Ver entreno de hoy' }).click()
  await page.waitForURL(`**/athlete/training?plan=${coach.planId}`)
  await expect(page.getByRole('heading', { name: 'Entreno de hoy', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Agregar serie', exact: true })).toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/athlete-shared-today.png`, fullPage: true })

  // structure bars + hollow Hoy marker above the heading
  const bars = page.getByRole('img', { name: /^Estructura del entreno/ })
  await expect(bars).toBeVisible()
  await expect(bars.getByText('Hoy', { exact: true })).toBeVisible()
  const barsBox = await bars.boundingBox()
  const headingBox = await page.getByRole('heading', { name: 'Entreno de hoy', exact: true }).boundingBox()
  expect(barsBox!.y).toBeLessThan(headingBox!.y)

  // read-only block view
  const section = page.getByRole('region', { name: 'Entreno de hoy A' })
  await expect(section).toBeVisible()
  await expect(section.getByText('3×', { exact: true })).toBeVisible()
  await expect(section.getByText(/4×\s*100 m/)).toBeVisible()
  // block distance 3*(4*100+200)=1800 m, in italics
  const dist = section.getByText('1.800 m')
  await expect(dist).toBeVisible()
  expect(await dist.evaluate((el) => getComputedStyle(el).fontStyle)).toBe('italic')
  await page.screenshot({ path: `${SHOTS}/athlete-shared-blocks.png`, fullPage: true })

  // navigation
  await page.getByRole('button', { name: /^Próximo/ }).click()
  await expect(page.getByRole('region', { name: 'Entreno próximo' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver a hoy' }).click()
  await page.getByRole('button', { name: /^Último/ }).click()
  await expect(page.getByRole('region', { name: 'Entreno pasado' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver a hoy' }).click()

  // desktop spot check
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.screenshot({ path: `${SHOTS}/athlete-shared-desktop.png`, fullPage: true })

  // Entrenos tab (without ?plan) lists the chip; today summary should not show an empty state wrongly
  await page.goto('/athlete/training')
  const chip = page.getByRole('button', { name: `Suscrito: ${coach.title}`, exact: true })
  await expect(chip).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/athlete-shared-tab-default.png`, fullPage: true })
  await expect(page.getByRole('region', { name: 'Entreno de hoy A' })).toBeVisible()
  await coach.context.close()
  await context.close()
})

test('private invite: works, regenerated link stops, plan deleted while viewing', async ({
  browser,
  request,
}) => {
  test.setTimeout(150000)
  const coach = await coachWithPlan(browser, request, 'private')
  await coach.page.reload()
  await coach.page.getByRole('button', { name: coach.title, exact: true }).click()
  await coach.page.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(coach.page.getByText('Enlace copiado')).toBeVisible()
  const oldUrl = ((await coach.page.evaluate(() => navigator.clipboard.readText())).split('\n').pop()) as string

  const swimmer = await freshAthlete(browser, request)
  await swimmer.page.goto(oldUrl)
  await swimmer.page.getByRole('button', { name: 'Suscribirme', exact: true }).click()
  await expect(swimmer.page.getByText('Suscrito', { exact: true })).toBeVisible()
  // reopening the same invite after subscribing
  await swimmer.page.goto(oldUrl)
  await expect(swimmer.page.getByText('Suscrito', { exact: true })).toBeVisible()
  await swimmer.page.getByRole('button', { name: 'Dejar de seguir', exact: true }).click()
  await swimmer.page.goto(oldUrl)
  await expect(swimmer.page.getByRole('button', { name: 'Suscribirme', exact: true })).toBeVisible()

  await coach.page.getByRole('button', { name: 'Generar nuevo enlace', exact: true }).click()
  await coach.page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect(coach.page.getByText(/Enlace nuevo listo/)).toBeVisible()
  await swimmer.page.goto(oldUrl)
  await expect(swimmer.page.getByText(NOT_AVAILABLE)).toBeVisible()
  await swimmer.page.screenshot({ path: `${SHOTS}/athlete-shared-regenerated.png` })

  // subscribed swimmer: old token is irrelevant (already subscribed); then plan deleted
  await coach.page.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(coach.page.getByText('Enlace copiado')).toBeVisible()
  const newUrl = ((await coach.page.evaluate(() => navigator.clipboard.readText())).split('\n').pop()) as string
  await swimmer.page.goto(newUrl)
  await swimmer.page.getByRole('button', { name: 'Suscribirme', exact: true }).click()
  await expect(swimmer.page.getByText('Suscrito', { exact: true })).toBeVisible()
  await swimmer.page.goto(`/athlete/training?plan=${coach.planId}`)
  await expect(swimmer.page.getByRole('heading', { name: 'Entreno de hoy', exact: true })).toBeVisible()
  expect((await fetch(`${root}/trainingPlans/${coach.planId}`, { method: 'DELETE', headers: admin })).ok).toBe(true)
  await swimmer.page.reload()
  await expect(swimmer.page.getByRole('region', { name: 'Entrenamiento' })).toBeVisible()
  await expect(swimmer.page.getByRole('main').getByRole('alert')).toHaveCount(0)
  await swimmer.page.screenshot({ path: `${SHOTS}/athlete-shared-deleted.png`, fullPage: true })
  // deleted plan link directly
  await swimmer.page.goto(`/athlete/training/plans/${coach.planId}`)
  await expect(swimmer.page.getByText(NOT_AVAILABLE)).toBeVisible()
  await coach.context.close()
  await swimmer.context.close()
})

test('share preview metadata for plan URL', async ({ browser, request }) => {
  test.setTimeout(90000)
  const pub = await coachWithPlan(browser, request, 'public')
  const html = await (await request.get(`/athlete/training/plans/${pub.planId}`)).text()
  const meta = (prop: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`))?.[1]
  console.log('OG', {
    title: meta('og:title'),
    desc: meta('og:description'),
    image: meta('og:image'),
    twitter: meta('twitter:card'),
  })
  expect(meta('og:title')).toContain('Coach Seed')
  expect(meta('og:description')).toContain(pub.title)
  const image = meta('og:image')
  expect(image).toBeTruthy()
  expect(image).toMatch(/^https?:\/\//)
  const privHtml = await (await request.get(`/athlete/training/plans/${pub.planId}?invite=x`)).text()
  expect(privHtml).toContain('og:title')
  const img = await request.get(new URL(image as string).pathname)
  expect(img.ok()).toBe(true)
  await pub.context.close()
})
