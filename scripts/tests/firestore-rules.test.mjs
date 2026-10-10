import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'

const host = process.env.FIRESTORE_EMULATOR_HOST
const enabled = Boolean(host)
test('Firestore rules: allowed queries, private data and role isolation', {
  skip: !enabled,
}, async (t) => {
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/, 'Only local emulators may be tested')
  const root = `http://${host}/v1/projects/nadamas-b1ecf/databases/(default)/documents`
  const suffix = randomUUID(),
    fixtures = [],
    authTokens = []
  const encode = (value) =>
    value === null
      ? { nullValue: null }
      : typeof value === 'boolean'
        ? { booleanValue: value }
        : typeof value === 'number'
          ? { integerValue: String(value) }
          : typeof value === 'object'
            ? {
                mapValue: {
                  fields: Object.fromEntries(
                    Object.entries(value).map(([key, item]) => [key, encode(item)])
                  ),
                },
              }
            : { stringValue: value }
  const document = (value) => ({
    fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])),
  })
  async function write(path, data, token = 'owner') {
    if (!fixtures.includes(path)) fixtures.push(path)
    return fetch(`${root}/${path}`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(document(data)),
    })
  }
  async function account(label, admin = false, profile = true) {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `${label}-${suffix}@test.com`,
          password: 'local-test-password',
          returnSecureToken: true,
        }),
      }
    )
    assert.equal(response.status, 200)
    const user = await response.json()
    authTokens.push(user.idToken)
    if (profile)
      assert.equal(
        (
          await write(`users/${user.localId}`, {
            userId: user.localId,
            roles: { athlete: true, coach: false, admin },
          })
        ).status,
        200
      )
    return { uid: user.localId, token: user.idToken }
  }
  async function read(path, token) {
    return fetch(`${root}/${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
  }
  async function query(collection, field, value, token) {
    return fetch(`${root}:runQuery`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: {
            fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: encode(value) },
          },
        },
      }),
    })
  }
  const owner = await account('owner'),
    outsider = await account('outsider'),
    admin = await account('admin', true)
  try {
    await t.test('notification queries work for recipient/actor and deny other users', async () => {
      const path = `notifications/${suffix}`
      assert.equal(
        (await write(path, { recipientId: owner.uid, actorId: admin.uid, userId: owner.uid }))
          .status,
        200
      )
      assert.equal(
        (await query('notifications', 'recipientId', owner.uid, owner.token)).status,
        200
      )
      assert.equal((await query('notifications', 'actorId', admin.uid, admin.token)).status, 200)
      assert.equal(
        (await query('notifications', 'recipientId', owner.uid, outsider.token)).status,
        403
      )
      assert.equal((await read(path, outsider.token)).status, 403)
      assert.equal(
        (await write(path, { recipientId: outsider.uid, userId: outsider.uid }, outsider.token))
          .status,
        403
      )
    })
    await t.test('authenticated clients cannot read or forge server-only collections', async () => {
      for (const collection of [
        'otpLoginCodes',
        'paymentSettings',
        'paymentProducts',
        'paymentAccounts',
        'paymentOrders',
        'paymentMovements',
        'paymentReservations',
        'paymentParticipants',
        'schoolScheduleAssignments',
        'schoolStudentComments',
        'schoolClassNotes',
        'agendaStudentRecords',
        'bookings',
        'studentLabels',
        'studentLabelAssignments',
        'coachStudentProgressEntries',
        'athleteIdentityRegistry',
        'pushSubscriptions',
        'calendarFeeds',
        'slugs',
      ]) {
        const path = `${collection}/${suffix}`
        assert.equal((await write(path, { userId: owner.uid, scope: suffix })).status, 200)
        assert.equal((await read(path, owner.token)).status, 403, collection)
        assert.equal(
          (await query(collection, 'scope', suffix, owner.token)).status,
          403,
          collection
        )
        assert.equal(
          (await write(path, { userId: owner.uid, scope: suffix }, owner.token)).status,
          403,
          collection
        )
      }
    })
    await t.test(
      'profile reads and coach enablement work without self-granting admin',
      async () => {
        assert.equal((await query('users', 'userId', owner.uid, owner.token)).status, 200)
        assert.equal(
          (
            await write(
              `users/${owner.uid}`,
              { userId: owner.uid, roles: { athlete: true, coach: true, admin: false } },
              owner.token
            )
          ).status,
          200
        )
        assert.equal(
          (
            await write(
              `users/${owner.uid}`,
              { userId: owner.uid, roles: { athlete: true, coach: true, admin: true } },
              owner.token
            )
          ).status,
          403
        )
        assert.equal(
          (
            await write(
              `users/${owner.uid}`,
              { userId: owner.uid, roles: { athlete: true, coach: true, admin: true } },
              admin.token
            )
          ).status,
          200
        )
        const fresh = await account('fresh', false, false)
        assert.equal(
          (
            await write(
              `users/${fresh.uid}`,
              { userId: fresh.uid, roles: { admin: true } },
              fresh.token
            )
          ).status,
          403
        )
      }
    )
    await t.test('public entries use the same field as the client query', async () => {
      assert.equal(
        (
          await write(`entries/public-${suffix}`, {
            userId: outsider.uid,
            options: { isPublic: true },
          })
        ).status,
        200
      )
      assert.equal(
        (
          await write(`entries/private-${suffix}`, {
            userId: outsider.uid,
            options: { isPublic: false },
          })
        ).status,
        200
      )
      assert.equal((await query('entries', 'options.isPublic', true)).status, 200)
      assert.equal((await read(`entries/private-${suffix}`)).status, 403)
    })
    await t.test('legacy owner queries and coach private reviews retain permissions', async () => {
      assert.equal(
        (await write(`records/${suffix}`, { userId: outsider.uid, athleteId: suffix })).status,
        200
      )
      assert.equal((await query('records', 'athleteId', suffix, outsider.token)).status, 200)
      const path = `coaches/${outsider.uid}/private/profile`
      assert.equal((await write(path, { userId: outsider.uid })).status, 200)
      assert.equal((await read(path, outsider.token)).status, 200)
      assert.equal((await read(path, admin.token)).status, 200)
      const third = await account('third')
      assert.equal((await read(path, third.token)).status, 403)
      assert.equal(
        (await write(`coaches/${outsider.uid}`, { userId: third.uid }, third.token)).status,
        403
      )
    })
  } finally {
    await Promise.all(
      authTokens.map((idToken) =>
        fetch(
          'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:delete?key=local-test',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }
        )
      )
    )
    await Promise.all(
      fixtures.map((path) =>
        fetch(`${root}/${path}`, { method: 'DELETE', headers: { authorization: 'Bearer owner' } })
      )
    )
  }
})
