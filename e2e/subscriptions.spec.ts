import { expect, test } from '@playwright/test'

test('suscripción: prueba única, códigos por escuela, acceso provisional y revisión idempotente', async ({
  request,
}) => {
  test.setTimeout(90000)
  const root = 'http://127.0.0.1:8080/v1/projects/nadamas-b1ecf/databases/(default)/documents'
  const suffix = crypto.randomUUID().slice(0, 8)
  function encode(value: unknown): unknown {
    if (typeof value === 'string') return { stringValue: value }
    if (typeof value === 'number') return { integerValue: String(value) }
    if (typeof value === 'boolean') return { booleanValue: value }
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
  async function seed(path: string, value: Record<string, unknown>) {
    const response = await fetch(`${root}/${path}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({
        fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])),
      }),
    })
    expect(response.ok).toBe(true)
  }
  async function account(name: string, admin = false) {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `${name}-${suffix}@test.com`,
          password: 'local-test-password',
          returnSecureToken: true,
        }),
      }
    )
    const result = (await response.json()) as { localId: string; idToken: string }
    await seed(`users/${result.localId}`, { roles: { athlete: true, coach: true, admin } })
    return result
  }
  const owner = await account('owner'),
    outsider = await account('outsider'),
    admin = await account('admin', true)
  const headers = (user = owner) => ({ authorization: `Bearer ${user.idToken}` })
  const adminPost = (data: object, user = admin) =>
    request.post('/api/subscriptions/admin', { headers: headers(user), data })
  const makeSchool = async (name: string, user = owner) => {
    const response = await request.post('/api/schools', {
      headers: headers(user),
      data: {
        name: `Escuela ${name}`,
        slug: `sub-${name}-${suffix}`,
        description: 'Escuela de prueba de suscripciones',
        timezone: 'America/Mazatlan',
      },
    })
    expect(response.ok(), await response.text()).toBe(true)
    return (await response.json()).school.id as string
  }
  const schoolId = await makeSchool('primera'),
    secondId = await makeSchool('segunda')
  const snapshot = async (id = schoolId, user = owner) => {
    const response = await request.get(`/api/subscriptions?schoolId=${id}`, {
      headers: headers(user),
    })
    expect(response.ok(), await response.text()).toBe(true)
    return response.json()
  }
  expect((await snapshot()).access.state).toBe('trialing')
  expect((await snapshot(secondId)).access.state).toBe('limited')
  expect(
    (
      await request.get(`/api/subscriptions?schoolId=${schoolId}`, { headers: headers(outsider) })
    ).status()
  ).toBe(403)
  expect(
    (
      await adminPost(
        {
          action: 'settings',
          settings: { bank: 'Banco prueba', holder: 'Nadamas', account: '12345678', clabe: '' },
        },
        owner
      )
    ).status()
  ).toBe(403)
  expect(
    (
      await adminPost({
        action: 'settings',
        settings: { bank: 'Banco prueba', holder: 'Nadamas', account: '12345678', clabe: '' },
      })
    ).ok()
  ).toBe(true)
  const code = `TEST-${suffix}`
  expect((await adminPost({ action: 'createCode', schoolId: secondId, code })).ok()).toBe(true)
  const post = (data: object, id = secondId) =>
    request.post('/api/subscriptions', { headers: headers(), data: { ...data, schoolId: id } })
  expect((await post({ action: 'redeemCode', code }, schoolId)).status()).toBe(409)
  expect((await post({ action: 'redeemCode', code })).ok()).toBe(true)
  expect((await snapshot(secondId)).priceCents).toBe(4900)
  const created = await post({ action: 'createTransfer' })
  expect(created.ok(), await created.text()).toBe(true)
  const order = (await created.json()).order
  expect(order.amountCents).toBe(4900)
  const again = await post({ action: 'createTransfer' })
  expect((await again.json()).order.reference).toBe(order.reference)
  expect((await snapshot(secondId)).access.fullAccess).toBe(false)
  expect((await post({ action: 'reportTransfer', orderId: order.id })).ok()).toBe(true)
  expect((await snapshot(secondId)).access.state).toBe('pending_review')
  expect((await post({ action: 'reportTransfer', orderId: order.id })).ok()).toBe(true)
  expect(
    (await adminPost({ action: 'review', orderId: order.id, status: 'invalidated' })).ok()
  ).toBe(true)
  expect((await snapshot(secondId)).access.fullAccess).toBe(false)
  expect((await post({ action: 'reportTransfer', orderId: order.id })).status()).toBe(409)
  expect((await post({ action: 'createTransfer' })).status()).toBe(409)
  expect((await adminPost({ action: 'releasePayment', schoolId: secondId })).ok()).toBe(true)
  const next = await post({ action: 'createTransfer' })
  expect(next.ok(), await next.text()).toBe(true)
  const nextOrder = (await next.json()).order
  expect(nextOrder.reference).not.toBe(order.reference)
  expect((await post({ action: 'reportTransfer', orderId: nextOrder.id })).ok()).toBe(true)
  const receivedAt = Date.now()
  expect(
    (
      await adminPost({ action: 'review', orderId: nextOrder.id, status: 'confirmed', receivedAt })
    ).ok()
  ).toBe(true)
  const active = await snapshot(secondId)
  expect(active.access.state).toBe('active')
  expect(active.priceCents).toBe(4900)
  expect(
    (
      await adminPost({ action: 'review', orderId: nextOrder.id, status: 'confirmed', receivedAt })
    ).ok()
  ).toBe(true)
  expect((await snapshot(secondId)).subscription.periodEndsAt).toBe(
    active.subscription.periodEndsAt
  )
  expect((await post({ action: 'redeemCode', code })).status()).toBe(409)
  expect((await post({ action: 'cancel' })).ok()).toBe(true)
  expect((await snapshot(secondId)).subscription.cancelAtPeriodEnd).toBe(true)
  expect((await post({ action: 'resume' })).ok()).toBe(true)
  expect((await snapshot(secondId)).subscription.cancelAtPeriodEnd).toBe(false)
  // Concurrent creation can grant only one trial for the same owner.
  const concurrentOwner = await account('concurrent')
  const concurrentSchools = await Promise.all([
    makeSchool('concurrenta', concurrentOwner),
    makeSchool('concurrentb', concurrentOwner),
  ])
  const concurrentStates = await Promise.all(
    concurrentSchools.map(async (id) => (await snapshot(id, concurrentOwner)).access.state)
  )
  expect(concurrentStates.sort()).toEqual(['limited', 'trialing'])

  // The API rejects writes after trial expiry, but reported transfers restore normal work.
  const first = await snapshot()
  await seed(`schoolSubscriptions/${schoolId}`, {
    ...first.subscription,
    trialEndsAt: Date.now() - 1,
  })
  const blocked = await request.post(`/api/schools/${schoolId}/students/quick`, {
    headers: headers(),
    data: { name: 'Alumno bloqueado' },
  })
  expect(blocked.status()).toBe(403)
  expect((await blocked.json()).code).toBe('subscription_required')
  const restore = await post({ action: 'createTransfer' }, schoolId)
  const restoreOrder = (await restore.json()).order
  expect((await post({ action: 'reportTransfer', orderId: restoreOrder.id }, schoolId)).ok()).toBe(
    true
  )
  expect(
    (
      await request.post(`/api/schools/${schoolId}/students/quick`, {
        headers: headers(),
        data: { name: 'Alumno permitido' },
      })
    ).status()
  ).toBe(201)

  // Delayed review of an on-time bank receipt preserves the promotional price.
  const graceEnd = Date.now() - 86400000
  const oldEnd = graceEnd - 3 * 86400000
  await seed(`schoolSubscriptions/${secondId}`, {
    ...active.subscription,
    periodStartedAt: oldEnd - 30 * 86400000,
    periodEndsAt: oldEnd,
    pendingOrderId: nextOrder.id,
    provisionalOrderId: nextOrder.id,
  })
  await seed(`subscriptionOrders/${nextOrder.id}`, {
    ...nextOrder,
    status: 'reported',
    createdAt: oldEnd - 86400000,
    reportedAt: oldEnd + 1000,
  })
  expect((await snapshot(secondId)).access.state).toBe('pending_review')
  expect(
    (
      await adminPost({
        action: 'review',
        orderId: nextOrder.id,
        status: 'confirmed',
        receivedAt: graceEnd - 1000,
      })
    ).ok()
  ).toBe(true)
  expect((await snapshot(secondId)).priceCents).toBe(4900)

  // Card checkout requires authentication and never silently activates an unconfigured provider.
  expect(
    (
      await request.post('/api/subscriptions/card', { data: { schoolId, action: 'checkout' } })
    ).status()
  ).toBe(401)
  if (!(await snapshot()).cardAvailable) {
    const card = await request.post('/api/subscriptions/card', {
      headers: headers(),
      data: { schoolId, action: 'checkout' },
    })
    expect(card.status()).toBe(409)
    expect((await card.json()).code).toBe('card_unavailable')
  }
  const fake = await request.post('/api/subscriptions/webhook', {
    headers: { 'stripe-signature': 't=1,v1=invalid' },
    data: { id: 'evt_fake', type: 'invoice.paid', data: { object: { id: 'in_fake' } } },
  })
  expect([400, 503]).toContain(fake.status())
  const abandoned = await post({ action: 'createTransfer' })
  const abandonedOrder = (await abandoned.json()).order
  expect((await post({ action: 'cancelTransfer', orderId: abandonedOrder.id })).ok()).toBe(true)
  expect((await post({ action: 'cancelTransfer', orderId: abandonedOrder.id })).ok()).toBe(true)
  expect((await snapshot(secondId)).subscription.pendingOrderId).toBeNull()
  expect(
    (
      await adminPost({
        action: 'review',
        orderId: abandonedOrder.id,
        status: 'confirmed',
        receivedAt: Date.now(),
      })
    ).status()
  ).toBe(409)
  expect(
    (await post({ action: 'cancelTransfer', orderId: restoreOrder.id }, schoolId)).status()
  ).toBe(409)
})
