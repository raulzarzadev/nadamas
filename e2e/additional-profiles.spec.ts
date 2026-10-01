import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { validProfileBirthDate } from '../lib/additional-profile'

test('valida nacimientos de adultos y menores sin aceptar fechas imposibles', () => {
  expect(validProfileBirthDate('1980-01-01')).toBe(true)
  expect(validProfileBirthDate('2020-01-01')).toBe(true)
  for (const value of ['2025-02-30', '2099-01-01', 'invalid', '2020-1-1'])
    expect(validProfileBirthDate(value)).toBe(false)
})

test('los Adicionales pertenecen a su cuenta y se vinculan a la escuela sin rol tutor', async ({
  request,
  page,
}) => {
  let available = false
  try {
    available = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!available, 'requiere emuladores de Firebase y aplicación local')
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const signup = async () => {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `additional-${crypto.randomUUID()}@test.com`,
          password: 'local-test-password',
          returnSecureToken: true,
        }),
      }
    )
    return response.json() as Promise<{ localId: string; idToken: string; email: string }>
  }
  const owner = await signup()
  const outsider = await signup()
  const schoolId = `additional-test-${owner.localId}`
  const headers = { authorization: `Bearer ${owner.idToken}` }
  const otherHeaders = { authorization: `Bearer ${outsider.idToken}` }
  const created: Array<[string, string]> = []
  const seed = async (collection: string, id: string, values: Record<string, string | number>) => {
    created.push([collection, id])
    const fields = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [
        k,
        typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v },
      ])
    )
    expect(
      (
        await fetch(`${root}/${collection}/${id}`, {
          method: 'PATCH',
          headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
          body: JSON.stringify({ fields }),
        })
      ).ok
    ).toBe(true)
  }
  try {
    expect(
      (await request.post('/api/additional-profiles', { data: { name: 'Sin acceso' } })).status()
    ).toBe(401)
    const profiles = []
    for (const [name, birthDate] of [
      ['Persona adulta', '1980-01-01'],
      ['Persona menor', '2020-01-01'],
    ]) {
      const response = await request.post('/api/additional-profiles', {
        headers,
        data: { name, birthDate, gender: 'otro' },
      })
      expect(response.status()).toBe(201)
      const profile = (await response.json()).profile
      created.push(['additionalProfiles', profile.id])
      profiles.push(profile)
    }
    expect(
      (await (await request.get('/api/additional-profiles', { headers })).json()).profiles
    ).toHaveLength(2)
    expect(
      (await (await request.get('/api/additional-profiles', { headers: otherHeaders })).json())
        .profiles
    ).toHaveLength(0)
    await seed('schools', schoolId, {
      name: 'Escuela prueba',
      directorId: outsider.localId,
      timezone: 'America/Mexico_City',
    })
    await seed('schoolMemberships', `${schoolId}_${outsider.localId}`, {
      schoolId,
      userId: outsider.localId,
      role: 'director',
      status: 'active',
    })
    expect(
      (
        await request.post(`/api/schools/${schoolId}/invitations`, {
          headers: otherHeaders,
          data: { email: owner.email, role: 'guardian' },
        })
      ).status()
    ).toBe(400)
    for (const profile of profiles) {
      const token = `token-${profile.id}`
      await seed('schoolInvitations', token, {
        id: token,
        schoolId,
        email: owner.email,
        role: 'student',
        status: 'pending',
        expiresAt: Date.now() + 60000,
        tokenHash: createHash('sha256').update(token).digest('hex'),
      })
      expect(
        (
          await request.post(`/api/school-invitations/${token}`, {
            headers,
            data: { additionalProfileId: profile.id },
          })
        ).status()
      ).toBe(200)
      created.push(['schoolStudents', `${schoolId}_${profile.id}`])
    }
    created.push(
      ['schoolMemberships', `${schoolId}_${owner.localId}`],
      ['schoolProfiles', `${schoolId}_${owner.localId}`]
    )
    const students = (
      await (await request.get(`/api/schools/${schoolId}/students`, { headers })).json()
    ).students
    expect(students).toHaveLength(2)
    expect(students.map((s: { name: string }) => s.name).sort()).toEqual([
      'Persona adulta',
      'Persona menor',
    ])
    const token = `foreign-${schoolId}`
    await seed('schoolInvitations', token, {
      id: token,
      schoolId,
      email: outsider.email,
      role: 'student',
      status: 'pending',
      expiresAt: Date.now() + 60000,
      tokenHash: createHash('sha256').update(token).digest('hex'),
    })
    expect(
      (
        await request.post(`/api/school-invitations/${token}`, {
          headers: otherHeaders,
          data: { additionalProfileId: profiles[0].id },
        })
      ).status()
    ).toBe(400)
    expect(
      (await request.post('/api/auth/otp/request', { data: { email: owner.email } })).ok()
    ).toBe(true)
    const otp = await (
      await fetch(`${root}/otpLoginCodes/${encodeURIComponent(owner.email)}`, {
        headers: { authorization: 'Bearer owner' },
      })
    ).json()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(
      `/auth/link?email=${encodeURIComponent(owner.email)}&token=${otp.fields.devLinkToken.stringValue}`
    )
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await page.waitForURL('**/athlete/bookings')
    await page.goto('/profile')
    const section = page.getByRole('region', { name: 'Adicionales', exact: true })
    await expect(section.getByText('Persona adulta', { exact: true })).toBeVisible()
    await expect(section.getByText('Persona menor', { exact: true })).toBeVisible()
    await page.screenshot({ path: '/tmp/nadamas-additional-mobile.png', fullPage: true })
    created.push(['otpLoginCodes', encodeURIComponent(owner.email)], ['users', owner.localId])
    const ownToken = `minor-${schoolId}`
    await seed('schoolInvitations', ownToken, {
      id: ownToken,
      schoolId,
      email: owner.email,
      role: 'student',
      status: 'pending',
      expiresAt: Date.now() + 60000,
      tokenHash: createHash('sha256').update(ownToken).digest('hex'),
    })
    expect(
      (
        await request.post(`/api/school-invitations/${ownToken}`, {
          headers,
          data: { name: 'Menor', birthDate: '2020-01-01', gender: 'otro' },
        })
      ).status()
    ).toBe(400)
    await page.goto(`/school/invitations/${ownToken}`)
    await page.getByLabel('¿Para quién es la invitación?').selectOption(profiles[1].id)
    await expect(page.getByLabel('Nombre completo', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Aceptar invitación', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Todo listo', exact: true })).toBeVisible()
  } finally {
    await Promise.all(
      created.map(([collection, id]) =>
        fetch(`${root}/${collection}/${id}`, {
          method: 'DELETE',
          headers: { authorization: 'Bearer owner' },
        })
      )
    )
    await Promise.all(
      [owner, outsider].map((user) =>
        fetch(
          'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:delete?key=local-test',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ idToken: user.idToken }),
          }
        )
      )
    )
  }
})
