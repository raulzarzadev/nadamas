import { expect, test } from '@playwright/test'
import {
  normalizeSchoolEventInput,
  type SchoolEvent,
  splitSchoolEvents,
} from '../lib/school-events'

const baseEvent = (id: string, date: string): SchoolEvent => ({
  id,
  schoolId: 's',
  date,
  time: null,
  title: id,
  description: '',
  photoUrl: null,
  links: [],
  visibility: 'public',
  createdBy: 'u',
  createdAt: 1,
  updatedAt: 1,
})

test('splitSchoolEvents uses the school timezone for today', () => {
  const now = Date.parse('2026-11-10T03:00:00Z')
  const events = [
    baseEvent('past-old', '2026-11-01'),
    baseEvent('past', '2026-11-08'),
    baseEvent('today', '2026-11-09'),
    baseEvent('later', '2026-12-01'),
  ]
  const { upcoming, past } = splitSchoolEvents(events, 'America/Mexico_City', now)
  expect(upcoming.map((event) => event.id)).toEqual(['today', 'later'])
  expect(past.map((event) => event.id)).toEqual(['past', 'past-old'])
})

test('normalizeSchoolEventInput validates fields', () => {
  const ok = () => true
  const base = { date: '2026-11-09', title: 'Torneo', visibility: 'public' }
  expect(
    normalizeSchoolEventInput({ ...base, links: [{ label: 'x', url: 'javascript:alert(1)' }] }, ok)
  ).toEqual({ ok: false, reason: 'links' })
  const six = Array.from({ length: 6 }, () => ({ label: 'x', url: 'https://a.com' }))
  expect(normalizeSchoolEventInput({ ...base, links: six }, ok)).toEqual({
    ok: false,
    reason: 'links',
  })
  expect(normalizeSchoolEventInput({ ...base, title: 'a' }, ok)).toEqual({
    ok: false,
    reason: 'title',
  })
  expect(normalizeSchoolEventInput({ ...base, visibility: 'secret' }, ok)).toEqual({
    ok: false,
    reason: 'visibility',
  })
  expect(normalizeSchoolEventInput({ ...base, date: '2026-13-45' }, ok)).toEqual({
    ok: false,
    reason: 'date',
  })
  expect(normalizeSchoolEventInput({ ...base, time: '25:00' }, ok)).toEqual({
    ok: false,
    reason: 'time',
  })
  expect(
    normalizeSchoolEventInput({ ...base, photoUrl: 'https://x.com/a.png' }, () => false)
  ).toEqual({
    ok: false,
    reason: 'photo',
  })
  expect(normalizeSchoolEventInput(base, ok)).toEqual({
    ok: true,
    value: {
      date: '2026-11-09',
      time: null,
      title: 'Torneo',
      description: '',
      photoUrl: null,
      links: [],
      visibility: 'public',
    },
  })
})

test('events API hides private events from non-members', async ({ request }) => {
  let ready = false
  try {
    ready = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!ready, 'requiere emuladores de Firebase')
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const schoolId = `events-${crypto.randomUUID()}`
  const otherSchoolId = `events-other-${crypto.randomUUID()}`
  const documents: string[] = []
  const signup = async () => {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `${crypto.randomUUID()}@test.com`,
          password: 'local-test-password',
          returnSecureToken: true,
        }),
      }
    )
    expect(response.ok).toBe(true)
    return response.json() as Promise<{ localId: string; idToken: string }>
  }
  const encode = (value: unknown): Record<string, unknown> => {
    if (typeof value === 'string') return { stringValue: value }
    if (typeof value === 'number') return { integerValue: String(value) }
    if (typeof value === 'boolean') return { booleanValue: value }
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } }
    return { nullValue: null }
  }
  const seed = async (path: string, values: Record<string, unknown>) => {
    documents.push(path)
    const response = await fetch(`${root}/${path}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({
        fields: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, encode(v)])),
      }),
    })
    expect(response.ok).toBe(true)
  }
  const [director, teacher, student, outsider] = await Promise.all([
    signup(),
    signup(),
    signup(),
    signup(),
  ])
  const auth = (user: { idToken: string }) => ({ authorization: `Bearer ${user.idToken}` })
  const path = `/api/schools/${schoolId}/events`
  try {
    for (const id of [schoolId, otherSchoolId])
      await seed(`schools/${id}`, {
        name: 'Escuela eventos',
        directorId: director.localId,
        isPublic: true,
      })
    const member = (user: { localId: string }, role: string) =>
      seed(`schoolMemberships/${schoolId}_${user.localId}`, {
        schoolId,
        userId: user.localId,
        role,
        status: 'active',
      })
    await member(director, 'director')
    await member(teacher, 'teacher')
    await member(student, 'student')

    const body = (title: string, visibility: string) => ({
      date: '2999-01-01',
      title,
      visibility,
    })
    const pub = await request.post(path, {
      headers: auth(director),
      data: body('Evento publico', 'public'),
    })
    expect(pub.status()).toBe(201)
    const priv = await request.post(path, {
      headers: auth(director),
      data: body('Evento privado', 'private'),
    })
    expect(priv.status()).toBe(201)
    const publicEvent = (await pub.json()).event as SchoolEvent
    const privateEvent = (await priv.json()).event as SchoolEvent
    documents.push(`schoolEvents/${publicEvent.id}`, `schoolEvents/${privateEvent.id}`)

    const titles = async (headers?: Record<string, string>) => {
      const response = await request.get(path, { headers })
      expect(response.ok()).toBe(true)
      return ((await response.json()).events as SchoolEvent[]).map((e) => e.title).sort()
    }
    expect(await titles()).toEqual(['Evento publico'])
    expect(await titles(auth(outsider))).toEqual(['Evento publico'])
    expect(await titles(auth(student))).toEqual(['Evento privado', 'Evento publico'])
    // The coordinator's uid never reaches visitors or members.
    for (const headers of [undefined, auth(outsider), auth(student)]) {
      const listed = (await (await request.get(path, { headers })).json()).events as object[]
      expect(listed.length).toBeGreaterThan(0)
      for (const event of listed) expect(event).not.toHaveProperty('createdBy')
    }

    const forbidden = await request.post(path, {
      headers: auth(teacher),
      data: body('Nope', 'public'),
    })
    expect(forbidden.status()).toBe(403)

    const crossSchool = await request.patch(`${path}/${publicEvent.id}`, {
      headers: auth(director),
      data: { ...body('Cambiado', 'public') },
    })
    expect(crossSchool.ok()).toBe(true)
    // Event of another school -> 404 when addressed through a different school.
    await seed(`schoolMemberships/${otherSchoolId}_${director.localId}`, {
      schoolId: otherSchoolId,
      userId: director.localId,
      role: 'director',
      status: 'active',
    })
    const wrong = await request.patch(`/api/schools/${otherSchoolId}/events/${publicEvent.id}`, {
      headers: auth(director),
      data: body('Hack', 'public'),
    })
    expect(wrong.status()).toBe(404)

    const removed = await request.delete(`${path}/${publicEvent.id}`, { headers: auth(director) })
    expect(removed.status()).toBe(200)
    expect(await titles(auth(student))).toEqual(['Evento privado'])
  } finally {
    for (const doc of documents)
      await fetch(`${root}/${doc}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
  }
})

test('client SDK rules deny reading and creating schoolEvents', async () => {
  let ready = false
  try {
    ready = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!ready, 'requiere emuladores de Firebase')
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const signup = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `${crypto.randomUUID()}@test.com`,
        password: 'local-test-password',
        returnSecureToken: true,
      }),
    }
  )
  const user = (await signup.json()) as { localId: string; idToken: string }
  const headers = { authorization: `Bearer ${user.idToken}`, 'content-type': 'application/json' }
  const id = `rules-${crypto.randomUUID()}`
  try {
    const seeded = await fetch(`${root}/schoolEvents/${id}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { visibility: { stringValue: 'private' } } }),
    })
    expect(seeded.ok).toBe(true)
    const read = await fetch(`${root}/schoolEvents/${id}`, { headers })
    expect(read.status).toBe(403)
    const created = await fetch(`${root}/schoolEvents?documentId=forged-${id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          userId: { stringValue: user.localId },
          schoolId: { stringValue: 'x' },
          visibility: { stringValue: 'public' },
        },
      }),
    })
    expect(created.status).toBe(403)
  } finally {
    for (const doc of [id, `forged-${id}`])
      await fetch(`${root}/schoolEvents/${doc}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
  }
})

test('el coordinador crea, edita y elimina un evento desde configuración', async ({ page }) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let available = false
  try {
    available = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!available, 'requiere emuladores de Firebase')
  const stamp = Date.now()
  const email = `school-events-ui-${stamp}@test.com`
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  let schoolId: string | undefined
  let uid: string | undefined
  const uploaded: string[] = []
  const eventIds: string[] = []
  try {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Aceptar política y continuar' }).click()
    await page.getByLabel('Correo', { exact: true }).fill(email)
    await page.getByRole('button', { name: 'Recibir código', exact: true }).click()
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.includes('/login'))
    await page.goto('/school/create')
    await page.getByLabel('Nombre de la escuela').fill(`Eventos ${stamp}`)
    const image = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 200
      const context = canvas.getContext('2d')
      if (!context) throw new Error('CANVAS_UNAVAILABLE')
      context.fillStyle = '#00aa00'
      context.fillRect(0, 0, 400, 200)
      return canvas.toDataURL('image/png').split(',')[1]
    })
    const file = { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') }
    await page.locator('input[type=file]').setInputFiles(file)
    await page.getByRole('button', { name: 'Usar imagen', exact: true }).click()
    const created = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/schools') && response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Crear escuela', exact: true }).click()
    const { school } = await (await created).json()
    schoolId = school.id
    uid = school.directorId
    uploaded.push(school.logoUrl)

    await page.goto('/school/settings')
    await expect(page.getByRole('heading', { name: 'Eventos', exact: true })).toBeVisible({
      timeout: 30000,
    })
    await expect(page.getByText('Publica tu próximo evento', { exact: true })).toBeVisible()

    const card = page
      .locator('section', { has: page.getByRole('heading', { name: 'Eventos', exact: true }) })
      .last()
    await card.getByRole('button', { name: 'Nuevo evento' }).click()
    await card.getByLabel('Fecha', { exact: true }).fill('2999-05-20')
    await card.getByLabel('Hora (opcional)').fill('08:30')
    await card.getByLabel('Título', { exact: true }).fill('Travesía La Paz')
    await card.getByLabel('Descripción', { exact: true }).fill('Nado en aguas abiertas')
    await card.getByRole('button', { name: 'Agregar enlace' }).click()
    await card.getByLabel('Texto del enlace 1').fill('Cómo llegar')
    await card.getByLabel('URL del enlace 1').fill('https://maps.google.com/?q=la+paz')
    await card.getByLabel('Público', { exact: true }).check()
    const posted = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/schools/${schoolId}/events`) &&
        response.request().method() === 'POST'
    )
    await card.getByRole('button', { name: 'Guardar evento' }).click()
    const createdEvent = await posted
    expect(createdEvent.status()).toBe(201)
    eventIds.push((await createdEvent.json()).event.id)

    const upcoming = card.getByRole('region', { name: 'Próximos' })
    await expect(upcoming.getByText('Travesía La Paz')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

    await upcoming.getByRole('button', { name: 'Editar' }).click()
    await card.getByLabel('Título', { exact: true }).fill('Travesía La Paz 2')
    await card.getByRole('button', { name: 'Guardar evento' }).click()
    await expect(upcoming.getByText('Travesía La Paz 2')).toBeVisible()

    await upcoming.getByRole('button', { name: 'Eliminar' }).click()
    await upcoming.getByRole('button', { name: 'Confirmar eliminación' }).click()
    await expect(page.getByText('Travesía La Paz 2')).toHaveCount(0)

    // Switching from editing one event to another resets the photo picker.
    for (const [date, title] of [
      ['2999-06-01', 'Evento A'],
      ['2999-06-02', 'Evento B'],
    ]) {
      await card.getByRole('button', { name: 'Nuevo evento' }).click()
      await expect(card.getByLabel('Fecha', { exact: true })).toBeFocused()
      await card.getByLabel('Fecha', { exact: true }).fill(date)
      await card.getByLabel('Título', { exact: true }).fill(title)
      const saved = page.waitForResponse(
        (response) =>
          response.url().endsWith(`/api/schools/${schoolId}/events`) &&
          response.request().method() === 'POST'
      )
      await card.getByRole('button', { name: 'Guardar evento' }).click()
      eventIds.push((await (await saved).json()).event.id)
      await expect(upcoming.getByText(title)).toBeVisible()
    }
    const photoInput = card.locator('input[type=file]')
    const selectedFiles = () =>
      photoInput.evaluate((input) => (input as HTMLInputElement).files?.length ?? 0)
    await upcoming.getByRole('button', { name: 'Editar' }).nth(0).click()
    await expect(card.getByLabel('Título', { exact: true })).toHaveValue('Evento A')
    await photoInput.setInputFiles(file)
    expect(await selectedFiles()).toBe(1)
    await upcoming.getByRole('button', { name: 'Editar' }).nth(1).click()
    await expect(card.getByLabel('Título', { exact: true })).toHaveValue('Evento B')
    await expect(card.getByLabel('Fecha', { exact: true })).toBeFocused()
    expect(await selectedFiles()).toBe(0)
    await card.getByRole('button', { name: 'Cancelar', exact: true }).click()
  } finally {
    for (const url of uploaded.filter(Boolean)) {
      const parsed = new URL(url)
      await fetch(`${parsed.origin}${parsed.pathname}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
    }
    for (const path of [
      `otpLoginCodes/${encodeURIComponent(email)}`,
      ...eventIds.map((id) => `schoolEvents/${id}`),
      ...(schoolId ? [`schools/${schoolId}`, `schoolAgendaUpdates/${schoolId}`] : []),
      ...(uid
        ? [
            `users/${uid}`,
            `schoolMemberships/${schoolId}_${uid}`,
            `schoolProfiles/${schoolId}_${uid}`,
          ]
        : []),
    ]) {
      await fetch(`${root}/${path}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
    }
  }
})
