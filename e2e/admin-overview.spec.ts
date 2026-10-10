import { expect, test } from '@playwright/test'

test('admin overview protects global data and explores schools, roles, profiles and both plan types', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000)
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  let available = false
  try {
    available = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!available, 'requiere emuladores y aplicación local')
  const suffix = `admin-panel-${Date.now()}`
  const paths: string[] = []
  const tokens: string[] = []
  function encode(value: unknown): unknown {
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
    return { stringValue: String(value) }
  }
  async function seed(path: string, data: Record<string, unknown>) {
    paths.push(path)
    const result = await fetch(`${root}/${path}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, encode(value)])
        ),
      }),
    })
    expect(result.ok).toBe(true)
  }
  async function account(label: string) {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `${label}-${suffix}@test.com`,
          password: 'local-test-password',
          returnSecureToken: true,
        }),
      }
    )
    expect(response.ok).toBe(true)
    const user = (await response.json()) as { localId: string; idToken: string; email: string }
    tokens.push(user.idToken)
    return user
  }
  try {
    const admin = await account('admin')
    const teacher = await account('teacher')
    await seed(`users/${admin.localId}`, {
      name: 'Administrador del panel',
      firstName: 'Admin',
      lastName: 'Panel',
      phone: '6691234567',
      profileCompletedAt: Date.now(),
      email: admin.email,
      roles: { admin: true, coach: false, athlete: true },
    })
    await seed(`users/${teacher.localId}`, {
      name: `Profe ${suffix}`,
      email: teacher.email,
      roles: { admin: false, coach: false, athlete: true },
    })
    await seed(`schools/${suffix}`, {
      name: `Escuela ${suffix}`,
      slug: suffix,
      directorId: admin.localId,
      isPublic: true,
    })
    await seed(`schoolMemberships/${suffix}_${admin.localId}`, {
      schoolId: suffix,
      userId: admin.localId,
      role: 'director',
      roles: ['director'],
      status: 'active',
    })
    await seed(`schoolMemberships/${suffix}_${teacher.localId}`, {
      schoolId: suffix,
      userId: teacher.localId,
      role: 'teacher',
      status: 'active',
    })
    await seed(`paymentProducts/${suffix}`, {
      scope: `school:${suffix}`,
      name: `Paquete ${suffix}`,
      mode: 'classes',
      priceCents: 110000,
      classes: 5,
      active: true,
    })
    for (let i = 0; i < 22; i++)
      await seed(`additionalProfiles/${suffix}-${i}`, {
        ownerId: admin.localId,
        name: `Adicional ${suffix} ${String(i).padStart(2, '0')}`,
      })

    expect((await request.get('/api/admin/overview')).status()).toBe(401)
    expect(
      (
        await request.get('/api/admin/overview', { headers: { authorization: 'Bearer invalid' } })
      ).status()
    ).toBe(401)
    expect(
      (
        await request.get('/api/admin/overview', {
          headers: { authorization: `Bearer ${teacher.idToken}` },
        })
      ).status()
    ).toBe(403)
    const response = await request.get('/api/admin/overview', {
      headers: { authorization: `Bearer ${admin.idToken}` },
    })
    expect(response.ok()).toBe(true)
    const snapshot = await response.json()
    expect(snapshot.schools.find((school: { id: string }) => school.id === suffix).coaches).toBe(1)
    expect(
      snapshot.people.find((person: { id: string }) => person.id === teacher.localId).roles
    ).toContain('coach')
    expect(JSON.stringify(snapshot)).not.toContain('6691234567')

    const otpRequest = await request.post('/api/auth/otp/request', { data: { email: admin.email } })
    expect(otpRequest.ok()).toBe(true)
    const otp = await fetch(`${root}/otpLoginCodes/${encodeURIComponent(admin.email)}`, {
      headers: { authorization: 'Bearer owner' },
    })
    const linkToken = (await otp.json()).fields.devLinkToken.stringValue
    paths.push(`otpLoginCodes/${encodeURIComponent(admin.email)}`)
    await page.goto(`/auth/link?email=${encodeURIComponent(admin.email)}&token=${linkToken}`)
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await page.waitForURL(/\/(athlete\/progress|admin\/home|dashboard)$/)
    let overviewRequests = 0
    page.on('request', (req) => {
      if (new URL(req.url()).pathname === '/api/admin/overview') overviewRequests++
    })
    await page.goto('/admin/home')
    await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).toBeEnabled()
    await page.getByRole('textbox', { name: 'Buscar escuelas' }).fill(suffix)
    await expect(
      page.getByRole('heading', { name: `Escuela ${suffix}`, exact: true })
    ).toBeVisible()
    const sections = page.getByRole('group', { name: 'Secciones del panel' })
    await sections.getByRole('button', { name: 'Personas', exact: true }).click()
    await page.getByRole('textbox', { name: 'Buscar personas' }).fill(suffix)
    await page
      .getByRole('group', { name: 'Filtrar personas por rol' })
      .getByRole('button', { name: 'Entrenador', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: `Profe ${suffix}`, exact: true })).toBeVisible()
    await sections.getByRole('button', { name: 'Perfiles adicionales', exact: true }).click()
    await page.getByRole('textbox', { name: 'Buscar perfiles adicionales' }).fill(suffix)
    await expect(page.getByText('22 resultados', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: `Adicional ${suffix} 21`, exact: true })
    ).toBeVisible()
    await sections.getByRole('button', { name: 'Planes y pagos', exact: true }).click()
    await page.getByRole('textbox', { name: 'Buscar planes y pagos' }).fill(suffix)
    await expect(
      page.getByRole('heading', { name: `Paquete ${suffix}`, exact: true })
    ).toBeVisible()
    await expect(page.getByText('5 clases · sin caducidad', { exact: true })).toBeVisible()
    await sections.getByRole('button', { name: 'Suscripción Nadamas', exact: true }).click()
    await expect(page.getByText('$49', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Oferta publicada · Cobro pendiente de integrar', { exact: true })
    ).toBeVisible()
    expect(overviewRequests).toBe(1)
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click()
    await expect.poll(() => overviewRequests).toBe(2)
    await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).toBeEnabled()
    await sections.getByRole('button', { name: 'Escuelas', exact: true }).click()
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      await page.screenshot({ path: `/tmp/nadamas-admin-${width}.png`, fullPage: true })
    }
  } finally {
    for (const path of paths.reverse())
      await fetch(`${root}/${path}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
    for (const idToken of tokens)
      await fetch(
        'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:delete?key=local-test',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      )
  }
})
