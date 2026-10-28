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
