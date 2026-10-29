import { expect, test } from '@playwright/test'

test('first login configures combined profiles, persists choices and keeps admin permissions protected', async ({
  page,
  request,
}) => {
  test.setTimeout(90000)
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const suffix = crypto.randomUUID()
  function encode(value: unknown): unknown {
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
  const email = `welcome-${suffix}@test.com`
  const signup = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'local-test-password', returnSecureToken: true }),
    }
  )
  const account = (await signup.json()) as { localId: string; idToken: string }
  const headers = { authorization: `Bearer ${account.idToken}` }
  await seed(`users/${account.localId}`, {
    email,
    roles: { athlete: true, coach: false, admin: false },
    firstName: 'María',
  })
  try {
    expect(
      (await request.post('/api/onboarding', { data: { interests: ['swimmer'] } })).status()
    ).toBe(401)
    expect(
      (await request.post('/api/onboarding', { headers, data: { interests: ['admin'] } })).status()
    ).toBe(400)
    expect(
      (
        await request.post('/api/onboarding', {
          headers,
          data: { interests: ['coach'], coachContext: 'wrong' },
        })
      ).status()
    ).toBe(400)
    expect((await request.post('/api/auth/otp/request', { data: { email } })).ok()).toBe(true)
    const otp = await fetch(`${root}/otpLoginCodes/${email}`, {
      headers: { authorization: 'Bearer owner' },
    })
    const token = (await otp.json()).fields.devLinkToken.stringValue
    await page.goto(`/auth/link?email=${encodeURIComponent(email)}&token=${token}`)
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await page.waitForURL('**/welcome')
    await expect(page.getByRole('heading', { name: 'Vamos a configurar tu perfil.' })).toBeVisible()
    const submit = page.getByRole('button', { name: 'Ver mis primeros pasos' })
    await expect(submit).toBeDisabled()
    await page.getByRole('checkbox', { name: 'Soy nadador', exact: true }).check()
    await page.setViewportSize({ width: 320, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(submit).toBeInViewport()
    await page.screenshot({ path: '/tmp/nadamas-welcome-mobile.png', fullPage: true })
    await submit.click()
    await expect(page.getByRole('heading', { name: 'Todo listo para empezar.' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Buscar un profe/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Encontrar una escuela/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Elegir un entreno/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Como entrenador' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Cambiar mis opciones' }).click()
    await page.getByRole('checkbox', { name: 'Soy entrenador', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Coordino una escuela', exact: true }).check()
    await page.getByRole('radio', { name: 'De ambas formas', exact: true }).check()
    await submit.click()
    await expect(page.getByRole('heading', { name: 'Un perfil. Todas tus facetas.' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Como nadador' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Como entrenador' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Como coordinador' })).toBeVisible()
    await page.goto('/school/payments')
    await expect(page.getByRole('heading', { name: 'Configura tu escuela' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Crear escuela', exact: true })).toHaveAttribute(
      'href',
      '/school/create'
    )
    await expect(
      page.getByText('Busca una escuela o un entrenador para ver sus planes y tus pagos.')
    ).toHaveCount(0)
    await expect(page.getByText('Configurar un plan de pago', { exact: true })).toBeVisible()
    await expect(page.getByText('Crear los horarios de clases', { exact: true })).toBeVisible()
    await expect(page.getByText('Agregar profes y alumnos', { exact: true })).toBeVisible()
    await page.screenshot({ path: '/tmp/nadamas-coordinator-no-school.png', fullPage: true })
    await page.getByRole('link', { name: 'Crear escuela', exact: true }).click()
    await page.getByLabel('Nombre de la escuela', { exact: true }).fill(`Escuela regreso ${suffix}`)
    const creation = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/schools' &&
        response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Crear escuela', exact: true }).click()
    expect((await creation).ok()).toBe(true)
    await expect(page).toHaveURL(/\/school\/create\?created=/)
    await expect(
      page.getByRole('heading', { name: `Escuela regreso ${suffix}`, exact: true })
    ).toBeVisible()
    await page.getByRole('link', { name: 'Configurar mi primer plan de pago', exact: true }).click()
    await expect(page).toHaveURL(/\/school\/payments$/)
    await page.setViewportSize({ width: 1440, height: 1000 })
    const sidebar = page.locator('[data-app-sidebar]')
    await expect(
      sidebar.getByRole('link', { name: `Escuela regreso ${suffix}, inicio`, exact: true })
    ).toBeVisible()
    await expect(sidebar.getByRole('img', { name: 'nadamas.app', exact: true })).toHaveCount(0)
    await page.setViewportSize({ width: 320, height: 900 })
    await expect(
      page
        .locator('header')
        .getByRole('link', { name: `Escuela regreso ${suffix}, inicio`, exact: true })
    ).toBeVisible()
    await page.goBack()
    await expect(
      page.getByRole('heading', { name: `Escuela regreso ${suffix}`, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Crea tu escuela', exact: true })).toHaveCount(0)
    await page.reload()
    await expect(
      page.getByRole('heading', { name: `Escuela regreso ${suffix}`, exact: true })
    ).toBeVisible()
    await page.getByRole('link', { name: 'Crear otra escuela', exact: true }).click()
    await expect(page).toHaveURL(/\/school\/create\?new=1$/)
    await expect(page.getByRole('heading', { name: 'Crea tu escuela', exact: true })).toBeVisible()
    await page.goBack()
    await expect(
      page.getByRole('heading', { name: `Escuela regreso ${suffix}`, exact: true })
    ).toBeVisible()
    await page.goto('/welcome')
    await expect(page.getByRole('heading', { name: 'Como coordinador' })).toBeVisible()
    const snapshot = await request.get('/api/onboarding', { headers })
    const saved = (await snapshot.json()).onboarding
    expect(saved.interests).toEqual(['swimmer', 'coach', 'coordinator'])
    expect(saved.coachContext).toBe('both')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Como coordinador' })).toBeVisible()
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.screenshot({ path: '/tmp/nadamas-welcome-combined-desktop.png', fullPage: true })
    expect(
      (
        await request.post('/api/onboarding', {
          headers,
          data: { interests: ['swimmer'], roles: { admin: true } },
        })
      ).ok()
    ).toBe(true)
    const profile = await fetch(`${root}/users/${account.localId}`, {
      headers: { authorization: 'Bearer owner' },
    })
    const fields = (await profile.json()).fields
    expect(fields.roles.mapValue.fields.admin.booleanValue).toBe(false)
    expect(fields.roles.mapValue.fields.coach.booleanValue).toBe(true)
    await page.getByRole('link', { name: /Buscar un profe/ }).click()
    await expect(page).toHaveURL(/\/athlete\/search$/)
    await page.goto('/dashboard')
    await page.waitForURL('**/athlete/schedule')
    await expect(page).not.toHaveURL(/welcome/)
  } finally {
    for (const path of [`users/${account.localId}`, `otpLoginCodes/${email}`])
      await fetch(`${root}/${path}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
    await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:delete?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken: account.idToken }),
      }
    )
  }
})

test('new Google emulator account reaches welcome without remaining on the loading skeleton', async ({
  page,
}) => {
  test.setTimeout(45000)
  await page.goto('/login')
  await page.getByRole('button', { name: 'Aceptar política y continuar' }).click()
  const popupReady = page.waitForEvent('popup')
  await page.getByRole('button', { name: 'Continuar con Google' }).click()
  const popup = await popupReady
  await popup.getByText('Add new account', { exact: true }).click()
  await popup.getByRole('button', { name: 'Auto-generate user information' }).click()
  await popup.getByRole('button', { name: 'Sign in with Google.com' }).click()
  await page.waitForURL('**/welcome', { timeout: 20000 })
  await expect(page.getByRole('heading', { name: 'Vamos a configurar tu perfil.' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Soy nadador', exact: true })).toBeVisible()
  await page.screenshot({ path: '/tmp/nadamas-google-welcome.png', fullPage: false })
})
