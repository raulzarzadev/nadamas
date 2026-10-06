import { expect, test } from '@playwright/test'

test('el acceso requiere aprobación y conserva el rol de entrenador', async ({ request }) => {
  let ready = false
  try {
    ready = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!ready, 'requiere emuladores de Firebase')
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const schoolId = `access-${crypto.randomUUID()}`
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
  const athlete = await signup()
  const headers = { authorization: `Bearer ${athlete.idToken}` }
  const directorHeaders = { authorization: `Bearer ${director.idToken}` }
  const path = `/api/schools/${schoolId}/access-requests`
  const id = `${schoolId}_${athlete.localId}`
  const read = async (doc: string) => {
    const response = await fetch(`${root}/${doc}`, { headers: { authorization: 'Bearer owner' } })
    return response.json()
  }
  try {
    await seed(`schools/${schoolId}`, { name: 'Escuela de prueba', directorId: director.localId })
    await seed(`schoolMemberships/${schoolId}_${director.localId}`, {
      schoolId,
      userId: director.localId,
      role: 'director',
      status: 'active',
    })
    await seed(`schoolMemberships/${id}`, {
      schoolId,
      userId: athlete.localId,
      role: 'teacher',
      status: 'active',
    })
    await seed(`users/${athlete.localId}`, {
      nickname: 'Nadador',
      firstName: 'Privado',
      lastName: 'Privado',
    })
    documents.push(`schoolAccessRequests/${id}`, `schoolStudents/${id}`)
    const sent = await request.post(path, { headers })
    expect(sent.ok(), await sent.text()).toBe(true)
    expect(await sent.json()).toMatchObject({ request: { name: 'Nadador', status: 'pending' } })
    const first = await read(`schoolAccessRequests/${id}`)
    await request.post(path, { headers })
    expect((await read(`schoolAccessRequests/${id}`)).fields.createdAt).toEqual(
      first.fields.createdAt
    )
    expect((await read(`schoolMemberships/${id}`)).fields.roles).toBeUndefined()
    const unauthorized = await request.patch(path, {
      headers,
      data: { userId: athlete.localId, status: 'approved' },
    })
    expect(unauthorized.status()).toBe(403)
    expect((await request.get(`${path}?review=true`, { headers })).status()).toBe(403)
    const approved = await request.patch(path, {
      headers: directorHeaders,
      data: { userId: athlete.localId, status: 'approved' },
    })
    expect(approved.ok(), await approved.text()).toBe(true)
    const member = (await read(`schoolMemberships/${id}`)).fields
    expect(member.role.stringValue).toBe('teacher')
    expect(
      member.roles.arrayValue.values.map((value: { stringValue: string }) => value.stringValue)
    ).toEqual(['teacher', 'student'])
    expect((await read(`schoolStudents/${id}`)).fields.studentUserId.stringValue).toBe(
      athlete.localId
    )
    expect(await (await request.get(path, { headers })).json()).toMatchObject({
      request: { status: 'approved' },
    })
  } finally {
    for (const doc of documents)
      await fetch(`${root}/${doc}`, {
        method: 'DELETE',
        headers: { authorization: 'Bearer owner' },
      })
  }
})
