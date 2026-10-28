import { expect, test } from '@playwright/test'
import { addDays, format, startOfWeek } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'America/Mexico_City'

test('member home returns per-profile next class and week attendance', async ({ request }) => {
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
        fields: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, encode(v)])),
      }),
    })
    expect(response.ok).toBe(true)
  }
  const [director, guardian, outsider, emailOnly] = await Promise.all([
    signup(),
    signup(),
    signup(),
    signup(),
  ])
  const auth = (user: { idToken: string }) => ({ authorization: `Bearer ${user.idToken}` })
  const path = `/api/schools/${schoolId}/home`
  const today = formatInTimeZone(Date.now(), TIMEZONE, 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(`${today}T12:00:00`), 1), 'yyyy-MM-dd')
  const monday = format(
    startOfWeek(new Date(`${today}T12:00:00`), { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  )
  const booking = (id: string, athleteId: string, values: Record<string, unknown>): Promise<void> =>
    seed(`bookings/${id}`, {
      schoolId,
      athleteId,
      coachId: director.localId,
      locationName: 'Alberca Norte',
      ...values,
    })
  try {
    await seed(`schools/${schoolId}`, {
      name: 'Escuela home',
      slug: schoolId,
      description: 'Desc',
      directorId: director.localId,
      timezone: TIMEZONE,
      isPublic: true,
    })
    await seed(`schoolMemberships/${schoolId}_${director.localId}`, {
      schoolId,
      userId: director.localId,
      role: 'director',
      status: 'active',
    })
    await seed(`schoolMemberships/${schoolId}_${guardian.localId}`, {
      schoolId,
      userId: guardian.localId,
      role: 'student',
      status: 'active',
    })
    await seed(`schoolMemberships/${schoolId}_${emailOnly.localId}`, {
      schoolId,
      userId: emailOnly.localId,
      role: 'student',
      status: 'active',
    })
    await seed(`users/${emailOnly.localId}`, { email: 'raulzarza.dev@example.com' })
    await seed(`users/${guardian.localId}`, { nickname: 'Mamá Ana' })
    for (const [id, name] of [
      ['s-ana', 'Ana'],
      ['s-beto', 'Beto'],
    ])
      await seed(`schoolStudents/${schoolId}_${id}`, {
        schoolId,
        name,
        guardianIds: [guardian.localId],
        status: 'active',
      })
    const anaId = `${schoolId}_s-ana`
    await booking('b-next', anaId, {
      date: tomorrow,
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
      schoolClassTitle: 'Nado libre',
    })
    await booking('b-taken', anaId, {
      date: monday,
      startTime: '00:00',
      endTime: '00:05',
      status: 'confirmed',
      attended: true,
    })
    await booking('b-absent', anaId, {
      date: monday,
      startTime: '00:10',
      endTime: '00:15',
      status: 'confirmed',
      noShow: true,
    })

    const response = await request.get(path, { headers: auth(guardian) })
    expect(response.ok(), await response.text()).toBe(true)
    const home = await response.json()
    expect(home.school).toMatchObject({ id: schoolId, name: 'Escuela home', slug: schoolId })
    expect(home.school.palette).toBeTruthy()
    expect(home.school.homeSections).toEqual(['events', 'gallery', 'contacts'])
    expect(home.greetingName).toBe('Mamá')
    expect(home.profiles).toHaveLength(1)
    expect(home.profiles[0]).toMatchObject({
      studentId: anaId,
      name: 'Ana',
      nextClass: { title: 'Nado libre', date: tomorrow, startTime: '09:00', pending: false },
      week: { taken: 1, total: 2 },
    })

    await booking('b-pending', anaId, {
      date: tomorrow,
      startTime: '07:00',
      endTime: '08:00',
      status: 'pending',
    })
    const pending = await (await request.get(path, { headers: auth(guardian) })).json()
    expect(pending.profiles[0].nextClass).toMatchObject({ startTime: '07:00', pending: true })

    const anonymous = await request.get(path, { headers: auth(emailOnly) })
    expect((await anonymous.json()).greetingName).toBe('')
    expect((await request.get(path, { headers: auth(outsider) })).status()).toBe(403)
    expect((await request.get(path)).status()).toBe(401)
  } finally {
    await Promise.all(
      documents.map((doc) =>
        fetch(`${root}/${doc}`, { method: 'DELETE', headers: { authorization: 'Bearer owner' } })
      )
    )
  }
})
