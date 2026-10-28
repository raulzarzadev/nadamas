import { expect, type Page, test } from '@playwright/test'
import { addDays, format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { formatSchoolDay } from '../lib/school-home'

const TIMEZONE = 'America/Mexico_City'
const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'

test('formatSchoolDay speaks Spanish in the school timezone', () => {
  // 2026-11-09 03:00Z is still Nov 8 in Mexico City.
  const now = Date.parse('2026-11-09T03:00:00Z')
  expect(formatSchoolDay('2026-11-08', '17:00', TIMEZONE, now)).toBe('hoy 17:00')
  expect(formatSchoolDay('2026-11-09', '16:00', TIMEZONE, now)).toBe('mañana 16:00')
  expect(formatSchoolDay('2026-11-09', null, TIMEZONE, now)).toBe('mañana')
  expect(formatSchoolDay('2026-11-14', null, TIMEZONE, now)).toBe('sáb 14 nov')
  expect(formatSchoolDay('2026-11-14', '09:30', TIMEZONE, now)).toBe('sáb 14 nov 09:30')
})

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

function fixture() {
  const documents: string[] = []
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
  const signup = async (email: string) => {
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
  const cleanup = () =>
    Promise.all(
      documents.map((doc) =>
        fetch(`${root}/${doc}`, { method: 'DELETE', headers: { authorization: 'Bearer owner' } })
      )
    )
  const school = async (schoolId: string, directorId: string, extra: Record<string, unknown>) =>
    seed(`schools/${schoolId}`, {
      name: 'Escuela Delfines',
      slug: schoolId,
      description: 'Natación para toda la familia',
      directorId,
      createdBy: directorId,
      timezone: TIMEZONE,
      isPublic: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...extra,
    })
  const event = (schoolId: string, id: string, values: Record<string, unknown>) =>
    seed(`schoolEvents/${id}`, {
      schoolId,
      time: '19:00',
      description: '',
      photoUrl: null,
      links: [],
      createdBy: 'director',
      createdAt: 1,
      updatedAt: 1,
      ...values,
    })
  return { documents, seed, signup, cleanup, school, event }
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

const noHorizontalScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)

test('visitor sees public events and join button; member sees personal dashboard', async ({
  page,
}) => {
  test.setTimeout(90000)
  test.skip(!(await emulatorsReady()), 'requiere emuladores de Firebase')
  const f = fixture()
  const id = crypto.randomUUID().slice(0, 8)
  const schoolId = `pubhome-${id}`
  const emptyId = `pubhome-empty-${id}`
  const email = `pubhome-member-${id}@test.com`
  const today = formatInTimeZone(Date.now(), TIMEZONE, 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(`${today}T12:00:00`), 1), 'yyyy-MM-dd')
  try {
    const member = await f.signup(email)
    await f.school(schoolId, 'director-x', {
      gallery: [
        {
          id: 'g1',
          url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E',
          createdAt: 1,
        },
      ],
    })
    await f.school(emptyId, 'director-x', {})
    await f.event(schoolId, `${schoolId}-pub`, {
      date: tomorrow,
      title: 'Travesía pública',
      visibility: 'public',
    })
    await f.event(schoolId, `${schoolId}-priv`, {
      date: tomorrow,
      title: 'Junta privada de papás',
      visibility: 'private',
    })
    await f.seed(`users/${member.localId}`, { email, nickname: 'Raúl Zarza' })
    await f.seed(`schoolMemberships/${schoolId}_${member.localId}`, {
      schoolId,
      userId: member.localId,
      role: 'student',
      status: 'active',
    })
    await f.seed(`schoolStudents/${schoolId}_sofia`, {
      schoolId,
      name: 'Sofía',
      studentUserId: member.localId,
      status: 'active',
    })
    await f.seed(`bookings/${schoolId}-next`, {
      schoolId,
      athleteId: `${schoolId}_sofia`,
      coachId: 'director-x',
      locationName: 'Alberca Olímpica',
      date: tomorrow,
      startTime: '17:00',
      endTime: '18:00',
      status: 'confirmed',
      schoolClassTitle: 'Grupo avanzado',
    })

    await page.setViewportSize({ width: 320, height: 640 })
    // (a) visitor
    await page.goto(`/school/${schoolId}`)
    await expect(page.getByText('Travesía pública')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Solicitar unirme al equipo' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Galería' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver eventos pasados' })).toHaveAttribute(
      'href',
      `/school/${schoolId}/events`
    )
    expect(await page.content()).not.toContain('Junta privada de papás')
    await noHorizontalScroll(page)

    await page.goto(`/school/${emptyId}`)
    await expect(page.getByRole('link', { name: 'Solicitar unirme al equipo' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Próximos eventos' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Galería' })).toHaveCount(0)

    // (b) member
    await page.goto('/login')
    await login(page, email)
    await page.goto(`/school/${schoolId}`)
    await expect(page.getByText('Hola, Raúl')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Próximos entrenos' })).toBeVisible()
    await expect(page.getByText('Sofía · mañana 17:00')).toBeVisible()
    await expect(page.getByText('Grupo avanzado · Alberca Olímpica')).toBeVisible()
    await expect(page.getByText('Junta privada de papás')).toBeVisible()
    await expect(page.getByText('Privado', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Galería' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Solicitar unirme al equipo' })).toHaveCount(0)
    await noHorizontalScroll(page)
  } finally {
    await f.cleanup()
  }
})

test('signed-out join goes through login and sends the request', async ({ page }) => {
  test.setTimeout(90000)
  test.skip(!(await emulatorsReady()), 'requiere emuladores de Firebase')
  const f = fixture()
  const id = crypto.randomUUID().slice(0, 8)
  const schoolId = `pubjoin-${id}`
  const email = `pubjoin-${id}@test.com`
  try {
    const joiner = await f.signup(email)
    await f.seed(`users/${joiner.localId}`, { email, nickname: 'Nuevo' })
    await f.school(schoolId, 'director-x', {})
    f.documents.push(`schoolAccessRequests/${schoolId}_${joiner.localId}`)
    await page.goto(`/school/${schoolId}`)
    await page.getByRole('link', { name: 'Solicitar unirme al equipo' }).click()
    await page.waitForURL((url) => url.pathname === '/login')
    expect(page.url()).toContain('join%3D1')
    await login(page, email)
    await page.waitForURL((url) => url.pathname === `/school/${schoolId}`)
    await expect(page.getByText('Solicitud enviada')).toBeVisible()
    const stored = await fetch(`${root}/schoolAccessRequests/${schoolId}_${joiner.localId}`, {
      headers: { authorization: 'Bearer owner' },
    })
    expect((await stored.json()).fields.status.stringValue).toBe('pending')
  } finally {
    await f.cleanup()
  }
})
