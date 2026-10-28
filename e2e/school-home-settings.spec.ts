import { expect, test } from '@playwright/test'
import { normalizeHomeSections } from '../lib/school-home'

test('normaliza las secciones de la home', () => {
  expect(normalizeHomeSections(['gallery', 'events'])).toEqual(['gallery', 'events'])
  expect(normalizeHomeSections(['events', 'events'])).toBeNull()
  expect(normalizeHomeSections(['hero'])).toBeNull()
  expect(normalizeHomeSections([])).toEqual([])
  expect(normalizeHomeSections('x')).toBeNull()
})

test('la API de ajustes de la home valida y limita por rol', async () => {
  let ready = false
  try {
    ready = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!ready, 'requiere emuladores de Firebase')
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const schoolId = `home-${crypto.randomUUID()}`
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
        fields: Object.fromEntries(
          Object.entries(values).map(([key, value]) => [key, encode(value)])
        ),
      }),
    })
    expect(response.ok).toBe(true)
  }
  const director = await signup()
  const teacher = await signup()
  const url = `http://localhost:3000/api/schools/${schoolId}/home-settings`
  const patch = (token: string | null, body: unknown) =>
    fetch(url, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  const storageUrl = (n: number) =>
    `http://127.0.0.1:9199/v0/b/nadamas-b1ecf.appspot.com/o/g${n}.png?alt=media`
  try {
    await seed(`schools/${schoolId}`, { name: 'Escuela home', directorId: director.localId })
    await seed(`schoolMemberships/${schoolId}_${director.localId}`, {
      schoolId,
      userId: director.localId,
      role: 'director',
      status: 'active',
    })
    await seed(`schoolMemberships/${schoolId}_${teacher.localId}`, {
      schoolId,
      userId: teacher.localId,
      role: 'teacher',
      status: 'active',
    })
    const ok = await patch(director.idToken, {
      customColor: '#7c3aed',
      homeSections: ['gallery', 'events'],
    })
    expect(ok.status).toBe(200)
    const { school } = await ok.json()
    expect(school.customColor).toBe('#7c3aed')
    expect(school.homeSections).toEqual(['gallery', 'events'])
    expect((await patch(director.idToken, { coverUrl: 'https://evil.com/x.png' })).status).toBe(400)
    expect((await patch(director.idToken, { customColor: 'red' })).status).toBe(400)
    expect((await patch(director.idToken, { homeSections: ['hero'] })).status).toBe(400)
    const many = Array.from({ length: 25 }, (_, i) => storageUrl(i))
    expect((await patch(director.idToken, { galleryUrls: many })).status).toBe(400)
    const good = await patch(director.idToken, { galleryUrls: many.slice(0, 2) })
    expect(good.status).toBe(200)
    expect((await good.json()).school.gallery).toHaveLength(2)
    expect((await patch(teacher.idToken, { customColor: '#7c3aed' })).status).toBe(403)
    expect((await patch(null, { customColor: '#7c3aed' })).status).toBe(401)
  } finally {
    for (const doc of documents)
      await fetch(`${root}/${doc}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
  }
})
