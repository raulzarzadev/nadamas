import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const SHOTS = '/private/tmp/claude-501/-Users-zarza-Documents-projects-nadamas/cac27305-4eea-4c23-ae5d-b01232a15e92/scratchpad/flow-agents/shots'
const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'

async function loginNew(page: Page, request: APIRequestContext, email: string) {
  expect((await request.post('/api/auth/otp/request', { data: { email } })).ok()).toBe(true)
  const otp = await (
    await fetch(`${root}/otpLoginCodes/${email}`, { headers: { authorization: 'Bearer owner' } })
  ).json()
  await page.goto(
    `/auth/link?email=${encodeURIComponent(email)}&token=${otp.fields.devLinkToken.stringValue}`
  )
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
}

async function onboardAsCoach(page: Page, request: APIRequestContext, email: string) {
  await loginNew(page, request, email)
  await page.waitForURL(/\/(welcome|athlete)/)
  await page.waitForTimeout(4000)
  // Intermittently a brand-new user stays on /athlete/progress instead of being sent to /welcome.
  if (!/welcome/.test(page.url())) await page.goto('/welcome')
  await page.getByRole('checkbox', { name: 'Soy entrenador', exact: true }).check()
  await page.getByRole('radio', { name: 'Por mi cuenta', exact: true }).check()
  await page.getByRole('button', { name: /Ver mis primeros pasos/ }).click()
  await expect(page.getByRole('heading', { name: 'Todo listo para empezar.' })).toBeVisible()
}

async function uidOf(email: string) {
  const r = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/nadamas-b1ecf/accounts:lookup',
    {
      method: 'POST',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ email: [email] }),
    }
  )
  return ((await r.json()).users[0] as { localId: string }).localId
}

async function addHours(page: Page, days: RegExp[], type: 'Particular' | 'Grupal', times: string[], half = false) {
  await page.getByRole('button', { name: /Agregar horario ahora|Editar horario/ }).first().click()
  const dlg = page.getByRole('dialog', { name: 'Editar horas' })
  for (const d of days) await dlg.getByRole('button', { name: d }).click()
  await dlg.getByRole('radio', { name: type }).check({ force: true })
  await dlg.getByRole('button', { name: 'Agregar horas', exact: true }).click()
  const picker = page.getByRole('dialog', { name: 'Agregar horas' })
  if (half) await picker.getByRole('button', { name: 'Mostrar medias horas' }).click()
  for (const t of times) await picker.getByRole('button', { name: t, exact: true }).click()
  await picker.getByRole('button', { name: /^Agregar \d+ horas?$/ }).click()
  await dlg.getByRole('button', { name: /^Agregar \d+ horarios?$/ }).click()
  await expect(dlg).not.toBeVisible()
}

test.describe('coach independiente publica horarios', () => {
  test.beforeEach(({ page }) => {
    page.setDefaultTimeout(20000)
  })

  test('agenda: horas particulares y grupales, medias horas, quitar', async ({ page, request }) => {
    test.setTimeout(180000)
    await page.setViewportSize({ width: 390, height: 844 })
    await onboardAsCoach(page, request, `coachpub-${crypto.randomUUID()}@test.com`)
    await page.goto('/coach/agenda')
    // Today is preselected; add Fri+Sat too. Half hours behind the eye toggle.
    await addHours(page, [/^Vie /, /^Sáb /], 'Particular', ['09:00', '09:30'], true)
    await expect(page.getByRole('button', { name: /09:30/ }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Editar horario' }).click()
    const dlg = page.getByRole('dialog', { name: 'Editar horas' })
    await dlg.getByRole('radio', { name: 'Grupal' }).check({ force: true })
    await dlg.getByRole('button', { name: 'Cancelar' }).click()
    await addHours(page, [/^Jue /, /^Vie /], 'Grupal', ['10:00'])
    await page.reload()
    await expect(page.getByText('10:00').first()).toBeVisible()
    // quitar
    await page.getByRole('button', { name: 'Editar horario' }).click()
    await dlg.getByRole('button', { name: 'Quitar', exact: true }).click()
    await expect(dlg.getByRole('button', { name: /^Quitar (estos \d+ horarios|este horario)$/ })).toBeVisible()
  })

  test('perfil: datos personales, bio de entrenador, compartir y calendario', async ({ page, request, context }) => {
    test.setTimeout(180000)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.setViewportSize({ width: 390, height: 844 })
    await onboardAsCoach(page, request, `coachpub-${crypto.randomUUID()}@test.com`)
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Editar', exact: true }).click()
    await page.getByPlaceholder('Cómo quieres que te vean').fill('Coach Pub')
    await page.getByPlaceholder('Escribe tus nombre(s)').fill('Carla')
    await page.getByRole('button', { name: /^Día:/ }).click()
    await page.getByRole('button', { name: '15', exact: true }).click()
    await page.getByRole('button', { name: /^Mes:/ }).click()
    await page.getByRole('button', { name: 'Mar', exact: true }).click()
    await page.getByRole('button', { name: /^Año:/ }).click()
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Años anteriores' }).click()
    await page.getByRole('button', { name: '1985', exact: true }).click()
    await page.waitForTimeout(7000)
    await page.reload()
    await expect(page.getByText('15 de marzo de 1985')).toBeVisible()
    await page.getByRole('tab', { name: 'De entrenador' }).click()
    await page.locator('textarea').first().fill('Entreno nadadores desde hace 10 años')
    await page.waitForTimeout(7000)
    await page.reload()
    await page.getByRole('tab', { name: 'De entrenador' }).click()
    await expect(page.locator('textarea').first()).toHaveValue(/10 años/)
    await page.getByRole('button', { name: 'Compartir perfil' }).click()
    await expect(page.getByText('Enlace copiado')).toBeVisible()
    await page.getByRole('button', { name: 'Suscribirme al calendario' }).click()
    await expect(page.getByRole('button', { name: 'Copiar link' })).toBeVisible()
  })

  test('entrenos: macro con machote, sesión del día persiste tras recargar', async ({ page, request }) => {
    test.setTimeout(180000)
    await page.setViewportSize({ width: 390, height: 844 })
    await onboardAsCoach(page, request, `coachpub-${crypto.randomUUID()}@test.com`)
    await page.goto('/coach/training')
    await page.getByRole('button', { name: 'Crear MACRO-ciclo', exact: true }).first().click()
    const wizard = page.getByRole('dialog', { name: 'Crear MACRO-ciclo', exact: true })
    await wizard.getByRole('checkbox', { name: 'Lun', exact: true }).check()
    await wizard.getByRole('checkbox', { name: 'Mié', exact: true }).check()
    await wizard.getByRole('button', { name: 'Continuar', exact: true }).click()
    await wizard.getByLabel('Título de la competencia', { exact: true }).fill('Nacional 2027')
    await wizard.getByRole('button', { name: 'Continuar', exact: true }).click()
    await wizard.getByRole('checkbox', { name: /Crear machote de 3/ }).check()
    await wizard.getByRole('button', { name: 'Crear MACRO-ciclo', exact: true }).click()
    await expect(wizard).not.toBeVisible()
    await page.getByRole('button', { name: 'Expandir todo' }).click()
    await page.getByRole('button', { name: 'lunes 2 de nov' }).first().click()
    const panel = page.getByRole('region', { name: 'Entrenos de la sesión' }).first()
    await panel.getByRole('button', { name: '+ Agregar sesión' }).click()
    const add = page.getByRole('dialog', { name: 'Agregar sesión' })
    await add.getByLabel('Nombre', { exact: true }).fill('Técnica de crol')
    await add.getByRole('button', { name: 'Agregar sesión', exact: true }).click()
    await panel.getByRole('button', { name: 'Editar', exact: true }).click()
    const ed = page.getByRole('dialog', { name: 'Editar sesión' })
    await ed.getByLabel('Nombre del bloque 1').fill('Calentamiento suave')
    await ed.getByRole('button', { name: 'Guardar sesión' }).click()
    await page.waitForTimeout(2500)
    await page.reload()
    await page.getByRole('button', { name: 'Expandir todo' }).click()
    await page.getByRole('button', { name: /lunes 2 de nov/ }).first().click()
    await expect(page.getByText('Calentamiento suave')).toBeVisible()
  })

  test('BUG: la pagina publica no expone el correo como nombre', async ({ page, request, browser }) => {
    test.setTimeout(180000)
    await page.setViewportSize({ width: 390, height: 844 })
    const email = `coachpub-${crypto.randomUUID()}@test.com`
    await onboardAsCoach(page, request, email)
    const uid = await uidOf(email)
    await page.goto('/coach/agenda')
    await addHours(page, [], 'Particular', ['17:00'])
    const anon = await browser.newContext()
    const ap = await anon.newPage()
    await ap.goto(`/coach/${uid}`)
    await expect(ap.getByText('17:00')).toBeVisible()
    await expect(ap.getByText(/coachpub-/)).toHaveCount(0)
    await anon.close()
  })

  test('BUG: nombre capturado en /profile se refleja en el editor de coach', async ({ page, request }) => {
    test.setTimeout(180000)
    await page.setViewportSize({ width: 390, height: 844 })
    await onboardAsCoach(page, request, `coachpub-${crypto.randomUUID()}@test.com`)
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Editar', exact: true }).click()
    await page.getByPlaceholder('Escribe tus nombre(s)').fill('Carla')
    await page.getByPlaceholder('Escribe tus apellido(s)').fill('Prueba')
    await page.waitForTimeout(7000)
    await page.goto('/coach/coach-profile')
    await expect(page.getByText('Estado del perfil')).toBeVisible()
    await expect(page.getByText('Falta nombre y apellidos')).toHaveCount(0)
  })

  test('editor completo permite subir documento de identidad', async ({ page, request }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width: 390, height: 844 })
    await onboardAsCoach(page, request, `coachpub-${crypto.randomUUID()}@test.com`)
    await page.goto('/coach/coach-profile')
    await expect(page.getByRole('button', { name: 'Solicitar verificación' })).toBeDisabled()
    await page.getByRole('button', { name: /Datos personales/ }).click()
    await expect(page.getByText('Documento de identidad').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Subir imagen' })).toBeVisible()
  })
})
