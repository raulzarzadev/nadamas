import { expect, test } from '@playwright/test'

test('el subdominio fija la escuela, su marca y los permisos de cada modo', async ({
  page,
  request,
}) => {
  test.setTimeout(90000)
  let available = false
  try {
    available = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!available, 'requiere emuladores de Firebase')
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const email = `tenant-${Date.now()}@test.com`
  const signup = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'local-test-password', returnSecureToken: true }),
    }
  )
  const { localId: uid } = await signup.json()
  const ids = [`tenant-a-${uid}`, `tenant-b-${uid}`]
  const slugs = [`tenant-a-${Date.now()}`, `tenant-b-${Date.now()}`]
  const docs: string[] = []
  const encode = (value: unknown): Record<string, unknown> => {
    if (value === null) return { nullValue: null }
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
    if (typeof value === 'object')
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, item]) => [
              key,
              encode(item),
            ])
          ),
        },
      }
    if (typeof value === 'boolean') return { booleanValue: value }
    if (typeof value === 'number') return { integerValue: String(value) }
    return { stringValue: value }
  }
  const seed = async (collection: string, id: string, data: Record<string, unknown>) => {
    docs.push(`${collection}/${id}`)
    const response = await fetch(`${root}/${collection}/${id}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, encode(value)])
        ),
      }),
    })
    expect(response.ok).toBe(true)
  }
  const login = async (origin: string) => {
    await page.goto(`${origin}/login`)
    const policy = page.getByRole('button', { name: 'Aceptar política y continuar' })
    if (await policy.count()) await policy.click()
    await page.getByLabel('Correo', { exact: true }).fill(email)
    await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.includes('/login'))
  }
  try {
    await seed('users', uid, {
      email,
      firstName: 'Coach',
      lastName: 'Prueba',
      nickname: 'Coach Prueba',
      roles: { athlete: true, coach: true, admin: false },
    })
    await seed('coaches', uid, { bio: 'Coach de prueba', classOfferings: [] })
    for (let index = 0; index < 2; index++) {
      await seed('schools', ids[index], {
        name: index ? 'Otra escuela' : 'Escuela Zeta',
        slug: slugs[index],
        directorId: index ? uid : 'other-director',
        createdBy: uid,
        description: 'Escuela de prueba',
        timezone: 'America/Mexico_City',
        isPublic: true,
        palette: index ? 'forest' : 'coral',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      await seed('schoolMemberships', `${ids[index]}_${uid}`, {
        schoolId: ids[index],
        userId: uid,
        role: index ? 'director' : 'teacher',
        roles: index ? ['director', 'teacher'] : ['teacher'],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      await seed('schoolCoachOfferings', `${ids[index]}_${uid}`, {
        schoolId: ids[index],
        coachId: uid,
        classOfferings: [
          {
            id: `offer-${index}`,
            mode: 'fixed',
            groupType: 'particular',
            placeName: 'Alberca',
            currency: 'MXN',
            unit: 'clase',
            schedules: [
              {
                id: 'hour',
                startTime: index ? '19:00' : '16:00',
                endTime: index ? '20:00' : '17:00',
                timeMode: 'fixed',
                days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
                availabilityMode: 'dates',
                availableDates: [new Date().toISOString().slice(0, 10)],
              },
            ],
          },
        ],
      })
    }
    const origin = `http://${slugs[0]}.localhost:3000`
    await page.setViewportSize({ width: 320, height: 844 })
    await login(origin)
    await page.evaluate((otherId) => {
      localStorage.setItem('nadamas.coachSelection', 'personal')
      localStorage.setItem('nadamas.schoolId', otherId)
      localStorage.setItem('nadamas.athleteSelection', otherId)
    }, ids[1])
    await page.goto(`${origin}/coach/agenda`)
    await expect(page.getByRole('heading', { name: 'Horarios', exact: true })).toBeVisible()
    await expect(page.getByText('16:00', { exact: true })).toBeVisible()
    await expect(page.getByText('19:00', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Seleccionar escuela' })).toHaveCount(0)
    await expect(page.locator('header').getByText('Escuela Zeta', { exact: true })).toBeVisible()
    await expect(page).toHaveTitle('Escuela Zeta')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
    await expect(page.locator('link[rel="icon"]').last()).toHaveAttribute('href', '/tenant-icon')
    await expect(page.locator('link[rel="icon"][href="/tenant-icon"]')).toHaveCount(1)
    expect(
      await page
        .locator('main')
        .evaluate((element) => getComputedStyle(element).getPropertyValue('--c-ocean').trim())
    ).toBe('#641c2b')
    const icon = await request.get(`${origin}/tenant-icon`)
    expect(icon.ok()).toBe(true)
    expect(icon.headers()['content-type']).toContain('image/svg+xml')
    expect(await icon.text()).toContain('#641c2b')
    const manifest = await request.get(`${origin}/tenant-manifest`)
    expect((await manifest.json()).name).toBe('Escuela Zeta')
    await page.goto(`${origin}/athlete/find-coach`)
    await expect(page.getByRole('navigation', { name: 'Seleccionar escuela' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Ver horarios' })).toHaveAttribute(
      'href',
      `/athlete/coach/${uid}?schoolId=${ids[0]}`
    )
    await page.goto(`${origin}/coach/${uid}`)
    await expect(page).toHaveURL(new RegExp(`/athlete/coach/${uid}`))
    await expect(page.getByText('16:00', { exact: true })).toBeVisible()
    await page.goto(`${origin}/school/classes`)
    await expect(page.getByText('No tienes acceso a este modo en esta escuela.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Agregar o quitar horas' })).toHaveCount(0)
    await login('http://localhost:3000')
    await page.goto('http://localhost:3000/coach/agenda')
    await expect(page.getByRole('navigation', { name: 'Seleccionar escuela' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Míos', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Escuela Zeta', exact: true }).click()
    await expect(page.getByText('16:00', { exact: true })).toBeVisible()
  } finally {
    docs.push(`otpLoginCodes/${encodeURIComponent(email)}`)
    for (const path of docs)
      await fetch(`${root}/${path}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
    await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/nadamas-b1ecf/accounts:delete',
      {
        method: 'POST',
        headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
        body: JSON.stringify({ localId: uid }),
      }
    )
  }
})
