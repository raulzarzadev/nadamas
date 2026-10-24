import { type APIRequestContext, type Browser, expect, type Page, test } from '@playwright/test'

const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
const authLookup =
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/nadamas-b1ecf/accounts:lookup'

// Same OTP dev-link login used by e2e/payments.spec.ts, against the local emulators only.
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

async function createMacro(page: Page, title: string) {
  await page.getByRole('button', { name: /Crear mi primer (MACRO-ciclo|macrociclo)/i }).click()
  const wizard = page.getByRole('dialog', { name: 'Crear MACRO-ciclo', exact: true })
  await wizard.getByRole('checkbox', { name: 'Lun', exact: true }).check()
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click()
  await wizard.getByLabel('Título de la competencia', { exact: true }).fill(title)
  await wizard.getByRole('button', { name: 'Continuar', exact: true }).click()
  await wizard.getByRole('button', { name: 'Crear MACRO-ciclo', exact: true }).click()
  await expect(wizard).not.toBeVisible()
}

test('entrenos: atleta crea su macrociclo desde la pestaña Entrenos', async ({ page, request }) => {
  test.setTimeout(60000)
  page.setDefaultTimeout(30000)
  const title = `Temporada atleta ${crypto.randomUUID()}`
  await loginAs(page, request, `entrenos-${crypto.randomUUID()}@test.com`)
  await page
    .getByRole('link', { name: 'Entrenos', exact: true })
    .locator('visible=true')
    .first()
    .click()
  await page.waitForURL('**/athlete/training')
  await createMacro(page, title)
  await page.reload()
  await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible()
})

test('entrenos: plan suscrito aparece como chip de solo lectura', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(90000)
  page.setDefaultTimeout(30000)
  const suffix = crypto.randomUUID()
  const title = `Plan ajeno ${suffix}`
  const authorEmail = `author-${suffix}@test.com`
  const followerEmail = `follower-${suffix}@test.com`

  const authorContext = await browser.newContext()
  const authorPage = await authorContext.newPage()
  authorPage.setDefaultTimeout(30000)
  await loginAs(authorPage, request, authorEmail)
  await authorPage.goto('/athlete/training')
  await createMacro(authorPage, title)
  await authorPage.reload()
  await expect(authorPage.getByRole('button', { name: title, exact: true })).toBeVisible()
  await authorContext.close()

  await loginAs(page, request, followerEmail)
  async function uidOf(email: string) {
    const response = await fetch(authLookup, {
      method: 'POST',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ email: [email] }),
    })
    return ((await response.json()).users[0] as { localId: string }).localId
  }
  const authorUid = await uidOf(authorEmail)
  const followerUid = await uidOf(followerEmail)
  const plans = (
    await (
      await fetch(`${root}/trainingPlans?pageSize=1000`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
  ).documents as Array<{ name: string; fields: { userId: { stringValue: string } } }>
  const planId = plans
    .find((doc) => doc.fields.userId?.stringValue === authorUid)
    ?.name.split('/')
    .pop() as string
  expect(planId).toBeTruthy()

  const seeded = await fetch(`${root}/trainingPlanSubscriptions/${planId}_${followerUid}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({
      fields: {
        planId: { stringValue: planId },
        uid: { stringValue: followerUid },
        ownerId: { stringValue: authorUid },
        name: { stringValue: 'Autor' },
        photo: { stringValue: '' },
        via: { stringValue: 'public' },
        createdAt: { integerValue: String(Date.now()) },
      },
    }),
  })
  expect(seeded.ok).toBe(true)

  await page.goto('/athlete/training')
  const chip = page.getByRole('button', { name: `Suscrito: ${title}`, exact: true })
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(page.getByRole('heading', { name: 'Entreno de hoy' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Agregar serie', exact: true })).toHaveCount(0)
})

test('entrenos: hacer público un macrociclo se conserva al recargar', async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(60000)
  page.setDefaultTimeout(30000)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await loginAs(page, request, `visibility-${crypto.randomUUID()}@test.com`)
  await page.goto('/athlete/training')
  await createMacro(page, `Temporada pública ${crypto.randomUUID()}`)
  await page.reload()
  await page.getByRole('button', { name: /^Temporada pública/ }).click()
  const toggle = page.getByRole('switch', { name: 'Público' })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await page.reload()
  await page.getByRole('button', { name: /^Temporada pública/ }).click()
  await expect(page.getByRole('switch', { name: 'Público' })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await page.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(page.getByText('Enlace copiado')).toBeVisible()
})

type FsValue = Record<string, unknown>
function toFs(value: unknown): FsValue {
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') return { integerValue: String(value) }
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

async function uidOf(email: string) {
  const response = await fetch(authLookup, {
    method: 'POST',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ email: [email] }),
  })
  return ((await response.json()).users[0] as { localId: string }).localId
}

async function planIdOf(authorUid: string) {
  const plans = (
    await (
      await fetch(`${root}/trainingPlans?pageSize=1000`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
  ).documents as Array<{ name: string; fields: { userId: { stringValue: string } } }>
  return plans
    .find((doc) => doc.fields.userId?.stringValue === authorUid)
    ?.name.split('/')
    .pop() as string
}

// Replaces the plan's cycles with macro > meso > micro that has a workout scheduled today.
async function seedScheduledPlan(planId: string, title: string) {
  const start = localDate(-7)
  const end = localDate(28)
  const base = { goal: '', content: '', startDate: start, endDate: end }
  const cycles = [
    {
      ...base,
      id: 'macro-e2e',
      parentId: null,
      type: 'macro',
      title,
      goal: 'Construir base aeróbica',
      sessionWeekdays: [0, 1, 2, 3, 4, 5, 6],
    },
    {
      ...base,
      id: 'meso-e2e',
      parentId: 'macro-e2e',
      type: 'meso',
      title: 'Bloque de volumen',
      goal: 'Volumen controlado',
    },
    {
      ...base,
      id: 'micro-e2e',
      parentId: 'meso-e2e',
      type: 'micro',
      title: 'Semana 1',
      objectiveDates: [localDate(0)],
      objectiveTitles: ['Sesión base'],
      objectives: ['Nado continuo'],
      objectiveWorkouts: { '0': ['4x100 libre'] },
    },
  ]
  const summary = {
    title,
    goal: 'Construir base aeróbica',
    content: '',
    startDate: start,
    endDate: end,
    sessionWeekdays: [0, 1, 2, 3, 4, 5, 6],
    authorName: 'Autor Base',
    authorPhoto: '',
    authorRole: 'athlete',
  }
  const response = await fetch(
    `${root}/trainingPlans/${planId}?updateMask.fieldPaths=cycles&updateMask.fieldPaths=summary`,
    {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { cycles: toFs(cycles), summary: toFs(summary) } }),
    }
  )
  expect(response.ok).toBe(true)
}

test('entrenos: otro atleta encuentra un entreno público, se suscribe y ve el entreno de hoy', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(120000)
  page.setDefaultTimeout(30000)
  const suffix = crypto.randomUUID()
  const title = `Base aeróbica ${suffix}`
  const authorEmail = `author-${suffix}@test.com`

  const authorContext = await browser.newContext()
  const authorPage = await authorContext.newPage()
  authorPage.setDefaultTimeout(30000)
  await loginAs(authorPage, request, authorEmail)
  await authorPage.goto('/athlete/training')
  await createMacro(authorPage, `Temporal ${suffix}`)
  await authorPage.reload()
  await expect(authorPage.getByRole('button', { name: `Temporal ${suffix}` })).toBeVisible()
  const planId = await planIdOf(await uidOf(authorEmail))
  expect(planId).toBeTruthy()
  await seedScheduledPlan(planId, title)
  await authorPage.reload()
  await authorPage.getByRole('button', { name: title, exact: true }).click()
  await authorPage.getByRole('switch', { name: 'Público' }).click()
  await expect(authorPage.getByRole('switch', { name: 'Público' })).toHaveAttribute(
    'aria-checked',
    'true'
  )

  // Athlete B finds the public plan through search (listPublic as a non-owner).
  await loginAs(page, request, `follower-${suffix}@test.com`)
  await page.goto('/athlete/search')
  await page.getByRole('group').getByText('Escuelas', { exact: true }).click()
  await page.getByRole('group').getByText('Profes', { exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Entrenos', exact: true })).toBeChecked()
  await page.getByRole('searchbox').fill(title.toUpperCase().replace('Ó', 'O'))
  await page.getByRole('link', { name: new RegExp(title) }).click()
  await page.waitForURL(`**/athlete/training/plans/${planId}`)
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Entreno de ejemplo' })).toBeVisible()
  // Replay the subscribe request as the same user: a second subscribe must not count twice.
  let subscribeCalls = 0
  await page.route(`**/api/training-plans/${planId}/subscription`, async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    subscribeCalls++
    await route.fetch()
    subscribeCalls++
    return route.fulfill({ response: await route.fetch() })
  })
  await page.getByRole('button', { name: 'Suscribirme', exact: true }).click()
  await expect.poll(() => subscribeCalls).toBe(2)
  await expect(page.getByText('Suscrito', { exact: true })).toBeVisible()

  // Subscribing is idempotent: the reloaded preview counts exactly one subscriber.
  await page.reload()
  await expect(page.getByText('Suscrito', { exact: true })).toBeVisible()
  await expect(page.getByText('1 suscriptor', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Suscribirme', exact: true })).toHaveCount(0)

  await page.getByRole('link', { name: 'Ver entreno de hoy' }).click()
  await page.waitForURL(`**/athlete/training?plan=${planId}`)
  await expect(
    page.getByRole('button', { name: `Suscrito: ${title}`, exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Entreno de hoy' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)

  // The author sees owner controls, never Suscribirme.
  await authorPage.goto(`/athlete/training/plans/${planId}`)
  await expect(authorPage.getByRole('switch', { name: 'Público' })).toBeVisible()
  await expect(authorPage.getByRole('button', { name: 'Suscribirme', exact: true })).toHaveCount(0)
  await authorContext.close()

  await page.getByRole('button', { name: 'Dejar de seguir', exact: true }).click()
  await expect(page.getByRole('button', { name: `Suscrito: ${title}`, exact: true })).toHaveCount(0)
})

const NOT_AVAILABLE = 'Este entreno no está disponible o el enlace ya no es válido.'

// Athlete A creates a macro named `title`, leaves it private and returns A's page.
async function authorWithPlan(browser: Browser, request: APIRequestContext, title: string) {
  const context = await browser.newContext()
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const page = await context.newPage()
  page.setDefaultTimeout(30000)
  const email = `author-${crypto.randomUUID()}@test.com`
  await loginAs(page, request, email)
  await page.goto('/athlete/training')
  await createMacro(page, title)
  await page.reload()
  await page.getByRole('button', { name: title, exact: true }).click()
  return { context, page, planId: await planIdOf(await uidOf(email)) }
}

async function copiedInviteUrl(page: Page) {
  await page.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(page.getByText('Enlace copiado')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  // The copied text is the invitation line followed by the link.
  expect(text).toMatch(/^¡Te invito a seguir mi entrenamiento «.+» en nadamas! Únete aquí:\n/)
  return text.split('\n').pop() as string
}

async function freshAthlete(browser: Browser, request: APIRequestContext, prefix: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(30000)
  await loginAs(page, request, `${prefix}-${crypto.randomUUID()}@test.com`)
  return { context, page }
}

test('entrenos: invitación privada', async ({ browser, request }) => {
  test.setTimeout(120000)
  const title = `Privado ${crypto.randomUUID()}`
  const author = await authorWithPlan(browser, request, title)
  const url = await copiedInviteUrl(author.page)
  expect(url).toContain(`/athlete/training/plans/${author.planId}?invite=`)

  const guest = await freshAthlete(browser, request, 'guest')
  await guest.page.goto(url.split('?')[0])
  await expect(guest.page.getByText(NOT_AVAILABLE)).toBeVisible()
  await expect(guest.page.getByRole('button', { name: 'Suscribirme', exact: true })).toHaveCount(0)

  await guest.page.goto(url)
  await guest.page.getByRole('button', { name: 'Suscribirme', exact: true }).click()
  await expect(guest.page.getByText('Suscrito', { exact: true })).toBeVisible()
  // The token is stripped from the address bar once subscribed.
  await expect(guest.page).toHaveURL(`/athlete/training/plans/${author.planId}`)
  await author.context.close()
  await guest.context.close()
})

test('entrenos: enlace regenerado deja de funcionar', async ({ browser, request }) => {
  test.setTimeout(120000)
  const title = `Regenerado ${crypto.randomUUID()}`
  const author = await authorWithPlan(browser, request, title)
  const oldUrl = await copiedInviteUrl(author.page)
  // A plain Compartir after a reload reuses the token instead of revoking earlier links.
  await author.page.reload()
  await author.page.getByRole('button', { name: title, exact: true }).click()
  expect(await copiedInviteUrl(author.page)).toBe(oldUrl)
  const early = await freshAthlete(browser, request, 'early')
  await early.page.goto(oldUrl)
  await expect(early.page.getByRole('button', { name: 'Suscribirme', exact: true })).toBeVisible()
  await early.context.close()
  await author.page.getByRole('button', { name: 'Generar nuevo enlace', exact: true }).click()
  await expect(author.page.getByText('Los enlaces anteriores dejarán de funcionar.')).toBeVisible()
  await author.page.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect(author.page.getByText(/Enlace nuevo listo/)).toBeVisible()
  const newUrl = await copiedInviteUrl(author.page)
  expect(newUrl).not.toBe(oldUrl)

  const other = await freshAthlete(browser, request, 'late')
  await other.page.goto(oldUrl)
  await expect(other.page.getByText(NOT_AVAILABLE)).toBeVisible()
  await expect(other.page.getByRole('button', { name: 'Suscribirme', exact: true })).toHaveCount(0)
  await other.page.goto(newUrl)
  await expect(other.page.getByRole('button', { name: 'Suscribirme', exact: true })).toBeVisible()
  await author.context.close()
  await other.context.close()
})

test('entrenos: quitar suscriptor', async ({ browser, request }) => {
  test.setTimeout(120000)
  const title = `Quitar ${crypto.randomUUID()}`
  const author = await authorWithPlan(browser, request, title)
  const url = await copiedInviteUrl(author.page)
  const follower = await freshAthlete(browser, request, 'follower')
  await follower.page.goto(url)
  await follower.page.getByRole('button', { name: 'Suscribirme', exact: true }).click()
  await expect(follower.page.getByText('Suscrito', { exact: true })).toBeVisible()
  await follower.page.goto('/athlete/training')
  await expect(
    follower.page.getByRole('button', { name: `Suscrito: ${title}`, exact: true })
  ).toBeVisible()

  await author.page.reload()
  await author.page.getByRole('button', { name: title, exact: true }).click()
  await author.page.getByRole('button', { name: '1 suscriptor', exact: true }).click()
  const sheet = author.page.getByRole('dialog', { name: 'Suscriptores' })
  await sheet.getByRole('button', { name: /^Quitar/ }).click()
  await expect(sheet.getByText('Aún no hay suscriptores.')).toBeVisible()

  await follower.page.reload()
  await expect(follower.page.getByRole('region', { name: 'Entrenamiento' })).toBeVisible()
  await expect(
    follower.page.getByRole('button', { name: `Suscrito: ${title}`, exact: true })
  ).toHaveCount(0)
  await expect(follower.page.getByRole('main').getByRole('alert')).toHaveCount(0)
  await author.context.close()
  await follower.context.close()
})

test('entrenos: entreno borrado no rompe la pestaña', async ({ browser, request }) => {
  test.setTimeout(120000)
  const title = `Borrado ${crypto.randomUUID()}`
  const author = await authorWithPlan(browser, request, title)
  await author.page.getByRole('switch', { name: 'Público' }).click()
  await expect(author.page.getByRole('switch', { name: 'Público' })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  const follower = await freshAthlete(browser, request, 'orphan')
  await follower.page.goto(`/athlete/training/plans/${author.planId}`)
  await follower.page.getByRole('button', { name: 'Suscribirme', exact: true }).click()
  await expect(follower.page.getByText('Suscrito', { exact: true })).toBeVisible()
  await follower.page.goto('/athlete/training')
  await expect(
    follower.page.getByRole('button', { name: `Suscrito: ${title}`, exact: true })
  ).toBeVisible()

  const removed = await fetch(`${root}/trainingPlans/${author.planId}`, {
    method: 'DELETE',
    headers: { authorization: 'Bearer owner' },
  })
  expect(removed.ok).toBe(true)

  await follower.page.reload()
  await expect(follower.page.getByRole('region', { name: 'Entrenamiento' })).toBeVisible()
  await expect(
    follower.page.getByRole('button', { name: `Suscrito: ${title}`, exact: true })
  ).toHaveCount(0)
  await expect(follower.page.getByRole('main').getByRole('alert')).toHaveCount(0)
  await author.context.close()
  await follower.context.close()
})

test('entrenos: abrir invitación sin sesión', async ({ browser, request }) => {
  test.setTimeout(120000)
  const author = await authorWithPlan(browser, request, `Sin sesión ${crypto.randomUUID()}`)
  const url = await copiedInviteUrl(author.page)

  const context = await browser.newContext()
  const page = await context.newPage()
  page.setDefaultTimeout(30000)
  await page.goto(url)
  await page.waitForURL(/\/login\?redirectTo=/)
  expect(decodeURIComponent(page.url())).toContain('invite=')
  await page.getByRole('button', { name: 'Aceptar política y continuar' }).click()
  await page.getByLabel('Correo', { exact: true }).fill(`cold-${crypto.randomUUID()}@test.com`)
  await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL(/\/athlete\/training\/plans\/.+invite=/)
  await expect(page.getByRole('button', { name: 'Suscribirme', exact: true })).toBeVisible()
  await author.context.close()
  await context.close()
})

test('entrenos: reglas niegan lectura privada y escritura de subscriberCount', async () => {
  const signUp = async (email: string) => {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=any',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'password-123', returnSecureToken: true }),
      }
    )
    const body = (await response.json()) as { idToken: string; localId: string }
    expect(body.idToken).toBeTruthy()
    return body
  }
  const suffix = crypto.randomUUID()
  const author = await signUp(`rules-author-${suffix}@test.com`)
  const stranger = await signUp(`rules-stranger-${suffix}@test.com`)
  const planId = `rules-${suffix}`
  // Seed through the emulator admin bypass; the assertions below use real user tokens.
  const seeded = await fetch(`${root}/trainingPlans/${planId}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({
      fields: {
        userId: { stringValue: author.localId },
        visibility: { stringValue: 'private' },
        cycles: { arrayValue: { values: [{ mapValue: { fields: {} } }] } },
      },
    }),
  })
  expect(seeded.ok).toBe(true)

  const read = await fetch(`${root}/trainingPlans/${planId}`, {
    headers: { authorization: `Bearer ${stranger.idToken}` },
  })
  expect(read.status).toBe(403)

  const write = await fetch(
    `${root}/trainingPlans/${planId}?updateMask.fieldPaths=subscriberCount`,
    {
      method: 'PATCH',
      headers: { authorization: `Bearer ${author.idToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { subscriberCount: { integerValue: '99' } } }),
    }
  )
  expect(write.status).toBe(403)
})
