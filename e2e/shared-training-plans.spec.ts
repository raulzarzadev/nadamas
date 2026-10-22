import { type APIRequestContext, expect, type Page, test } from '@playwright/test'

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
