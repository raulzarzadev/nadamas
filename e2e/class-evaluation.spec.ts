import { expect, test } from '@playwright/test'
import {
  canEvaluateBooking,
  parseClassEvaluation,
  publicClassEvaluation,
} from '../lib/class-evaluation'

const completed = { date: '2026-09-30', endTime: '10:00', status: 'confirmed' }
const evaluation = {
  rating: 4,
  topics: ['technique', 'confidence'],
  publicComment: ' Buena clase ',
  privateComment: ' Necesito más práctica ',
}

test('solo permite clases terminadas, confirmadas y sin inasistencia registrada', () => {
  // Mazatlán es UTC-7: las 10:00 locales son las 17:00 UTC.
  expect(canEvaluateBooking(completed, Date.parse('2026-09-30T16:59:00Z'))).toBe(false)
  expect(canEvaluateBooking(completed, Date.parse('2026-09-30T17:01:00Z'))).toBe(true)
  expect(
    canEvaluateBooking({ ...completed, status: 'cancelled' }, Date.parse('2026-10-01T00:00:00Z'))
  ).toBe(false)
  expect(
    canEvaluateBooking({ ...completed, status: 'pending' }, Date.parse('2026-10-01T00:00:00Z'))
  ).toBe(false)
  expect(
    canEvaluateBooking({ ...completed, attended: false }, Date.parse('2026-10-01T00:00:00Z'))
  ).toBe(false)
  expect(canEvaluateBooking({ ...completed, date: 'invalid' })).toBe(false)
})

test('valida estrellas, múltiples temas y límites de comentarios', () => {
  expect(parseClassEvaluation(evaluation)).toEqual({
    ...evaluation,
    publicComment: 'Buena clase',
    privateComment: 'Necesito más práctica',
  })
  for (const rating of [0, 6, 2.5, '5', null])
    expect(parseClassEvaluation({ ...evaluation, rating })).toBeNull()
  for (const topics of [[], ['unknown'], null])
    expect(parseClassEvaluation({ ...evaluation, topics })).toBeNull()
  expect(parseClassEvaluation({ ...evaluation, privateComment: 'a'.repeat(2001) })).toBeNull()
  expect(parseClassEvaluation({ ...evaluation, publicComment: 'a'.repeat(2001) })).toBeNull()
  expect(
    parseClassEvaluation({ ...evaluation, topics: ['technique', 'technique'] })?.topics
  ).toEqual(['technique'])
  expect(
    parseClassEvaluation({ ...evaluation, publicComment: '', privateComment: '' })
  ).not.toBeNull()
})

test('la proyección pública excluye comentarios privados y datos personales', () => {
  const data = {
    ...evaluation,
    topics: ['technique'] as const,
    coachId: 'coach',
    date: completed.date,
    updatedAt: 1,
    id: 'booking',
    athleteId: 'secret',
    email: 'private@example.com',
  }
  const result = publicClassEvaluation('booking', { ...data, topics: [...data.topics] })
  expect(result).not.toHaveProperty('privateComment')
  expect(result).not.toHaveProperty('athleteId')
  expect(result).not.toHaveProperty('email')
  expect(result.publicComment).toBe(evaluation.publicComment)
})

test('guarda una evaluación propia, permite editarla y protege el comentario privado', async ({
  request,
  baseURL,
}) => {
  const emulator = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  let available = false
  try {
    available = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!available, 'requiere los emuladores de Firebase y la aplicación local')
  const signup = async () => {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true }),
      }
    )
    return response.json() as Promise<{ localId: string; idToken: string }>
  }
  const athlete = await signup()
  const coach = await signup()
  const id = `evaluation-test-${Date.now()}`
  const seed = async (status: string, date: string) => {
    const fields = Object.fromEntries(
      Object.entries({
        id,
        coachId: coach.localId,
        athleteId: athlete.localId,
        status,
        date,
        startTime: '09:00',
        endTime: '10:00',
      }).map(([key, value]) => [key, { stringValue: value }])
    )
    const response = await fetch(`${emulator}/bookings/${id}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
    expect(response.ok).toBe(true)
  }
  const save = (token: string, data = evaluation) =>
    request.put(`/api/bookings/${id}/evaluation`, {
      headers: { authorization: `Bearer ${token}` },
      data,
    })
  try {
    await seed('confirmed', '2020-01-01')
    expect((await save(coach.idToken)).status()).toBe(404)
    expect((await save(athlete.idToken)).status()).toBe(200)
    const publicResult = await request.get(`/api/public/coaches/${coach.localId}/evaluations`)
    const publicData = (await publicResult.json()).evaluations
    expect(publicData).toHaveLength(1)
    expect(publicData[0]).not.toHaveProperty('privateComment')
    expect(JSON.stringify(publicData)).not.toContain('Necesito más práctica')
    const privateResult = await request.get('/api/coach/evaluations', {
      headers: { authorization: `Bearer ${coach.idToken}` },
    })
    expect((await privateResult.json()).evaluations[0].privateComment).toBe('Necesito más práctica')
    const outsider = await request.get('/api/coach/evaluations', {
      headers: { authorization: `Bearer ${athlete.idToken}` },
    })
    expect((await outsider.json()).evaluations).toHaveLength(0)
    expect((await save(athlete.idToken, { ...evaluation, rating: 5 })).status()).toBe(200)
    const own = await request.get('/api/bookings', {
      headers: { authorization: `Bearer ${athlete.idToken}` },
    })
    expect(
      (await own.json()).bookings.find((booking: { id: string }) => booking.id === id).evaluation
        .rating
    ).toBe(5)
    await seed('cancelled', '2020-01-01')
    expect((await save(athlete.idToken)).status()).toBe(409)
    await seed('confirmed', '2099-01-01')
    expect((await save(athlete.idToken)).status()).toBe(409)
    expect(
      (await request.put(`/api/bookings/${id}/evaluation`, { data: evaluation })).status()
    ).toBe(401)
    expect(
      (
        await request.put(`${baseURL}/api/bookings/${id}/evaluation`, {
          headers: { authorization: 'Bearer invalid' },
          data: evaluation,
        })
      ).status()
    ).toBe(401)
  } finally {
    await Promise.all(
      ['bookings', 'classEvaluations', 'privateClassEvaluations'].map((collection) =>
        fetch(`${emulator}/${collection}/${id}`, {
          method: 'DELETE',
          headers: { authorization: 'Bearer owner' },
        })
      )
    )
    await Promise.all(
      [athlete, coach].map((user) =>
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

test('evalúa una clase desde el historial en móvil y conserva los datos al editar', async ({
  page,
  request,
}) => {
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  let available = false
  try {
    available = (await fetch('http://127.0.0.1:8080')).ok
  } catch {}
  test.skip(!available, 'requiere los emuladores de Firebase y la aplicación local')
  const email = `evaluation-ui-${Date.now()}@test.com`
  const signup = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'local-test-password', returnSecureToken: true }),
    }
  )
  const user = (await signup.json()) as { localId: string; idToken: string }
  const id = `evaluation-ui-${user.localId}`
  const data = {
    id,
    athleteId: user.localId,
    coachId: 'coach-raul',
    coachName: 'Coach de prueba',
    athleteName: 'Alumno de prueba',
    date: '2020-01-01',
    startTime: '09:00',
    endTime: '10:00',
    status: 'confirmed',
    groupType: 'particular',
  }
  const fields = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, { stringValue: value }])
  )
  const seed = await fetch(`${root}/bookings/${id}`, {
    method: 'PATCH',
    headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  expect(seed.ok).toBe(true)
  try {
    const otpRequest = await request.post('/api/auth/otp/request', { data: { email } })
    expect(otpRequest.ok()).toBe(true)
    const otp = await fetch(`${root}/otpLoginCodes/${encodeURIComponent(email)}`, {
      headers: { authorization: 'Bearer owner' },
    })
    const token = (await otp.json()).fields.devLinkToken.stringValue
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/auth/link?email=${encodeURIComponent(email)}&token=${token}`)
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await page.waitForURL('**/athlete/bookings')
    await page.getByRole('button', { name: /Clases pasadas/ }).click()
    await page.getByRole('button', { name: 'Evaluar clase', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Evaluar clase' })).toBeVisible()
    await page.getByRole('radio', { name: '5 estrellas', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Técnica', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Confianza', exact: true }).check()
    await page.getByLabel('Comentario público').fill('Muy buena clase')
    await page.getByLabel('Comentario privado al profe').fill('Quiero practicar respiración')
    await page.screenshot({ path: '/tmp/nadamas-class-evaluation-mobile.png', fullPage: true })
    await page.route('**/api/bookings/*/evaluation', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'technical secret should not be shown' }),
      })
    )
    await page.getByRole('button', { name: 'Guardar evaluación' }).click()
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
    await expect(page.getByLabel('Comentario privado al profe')).toHaveValue(
      'Quiero practicar respiración'
    )
    await expect(page.getByRole('dialog')).not.toContainText('technical secret')
    await page.unroute('**/api/bookings/*/evaluation')
    await page.getByRole('button', { name: 'Guardar evaluación' }).click()
    await expect(page.getByText('Evaluación guardada.', { exact: true })).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: /Clases pasadas/ }).click()
    await page.getByRole('button', { name: 'Editar evaluación' }).click()
    await expect(page.getByRole('radio', { name: '5 estrellas', exact: true })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Técnica', exact: true })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Confianza', exact: true })).toBeChecked()
    await expect(page.getByLabel('Comentario privado al profe')).toHaveValue(
      'Quiero practicar respiración'
    )
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Editar evaluación' })).toBeFocused()
  } finally {
    await Promise.all(
      ['bookings', 'classEvaluations', 'privateClassEvaluations'].map((collection) =>
        fetch(`${root}/${collection}/${id}`, {
          method: 'DELETE',
          headers: { authorization: 'Bearer owner' },
        })
      )
    )
    await fetch(`${root}/users/${user.localId}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer owner' },
    })
    await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:delete?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken: user.idToken }),
      }
    )
  }
})
