import assert from 'node:assert/strict'
import * as crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

function load(file, dependencies = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'module', 'exports', code)(
    (id) => {
      if (id === 'server-only') return {}
      if (!(id in dependencies)) throw new Error(`Unexpected dependency ${id}`)
      return dependencies[id]
    },
    module,
    module.exports
  )
  return module.exports
}
const model = load('../../lib/marketing.ts')
function fixture() {
  const rows = {
    users: { a: { email: 'A@example.com', name: 'Ana' } },
    marketingPreferences: {},
    marketingSuppressions: {},
  }
  const db = {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => ({ exists: !!rows[name][id], data: () => rows[name][id] }),
        set: async (value) => {
          rows[name][id] = value
        },
      }),
      get: async () => ({
        docs: Object.entries(rows[name]).map(([id, value]) => ({ id, data: () => value })),
      }),
    }),
  }
  const store = load('../../lib/server/marketing/store.ts', {
    'node:crypto': crypto,
    '@/lib/marketing': model,
    '@/lib/server/firebase-admin': {
      adminDb: db,
      adminAuth: { verifyIdToken: async () => ({ uid: 'a' }) },
    },
    '@/lib/server/school-access': { getBearerToken: () => 'token' },
  })
  return { rows, store }
}
test('unknown consent never authorizes marketing; HTML is escaped', () => {
  assert.equal(model.normalizeMarketingStatus(true), 'pending')
  assert.equal(model.normalizeMarketingStatus(undefined), 'pending')
  assert.equal(model.escapeMarketingHtml('<script>"&'), '&lt;script&gt;&quot;&amp;')
})
test('only explicit consent for the current email permits sending; suppression wins', async () => {
  const { rows, store } = fixture()
  assert.equal((await store.recipient('a')).eligible, false)
  rows.marketingPreferences.a = { email: 'a@example.com', status: 'subscribed' }
  assert.equal((await store.recipient('a')).eligible, true)
  await store.suppressEmail('A@example.com', 'test')
  assert.equal((await store.recipient('a')).status, 'unsubscribed')
  assert.equal((await store.listRecipients())[0].eligible, false)
  rows.users.a.email = 'new@example.com'
  assert.equal((await store.recipient('a')).status, 'pending')
})
test('disabled accounts and non-admin callers cannot send', async () => {
  const { rows, store } = fixture()
  rows.marketingPreferences.a = { email: 'a@example.com', status: 'subscribed' }
  rows.users.a.accountDisabled = true
  assert.equal((await store.recipient('a')).eligible, false)
  assert.equal(await store.marketingCaller(new Request('https://nadamas.app'), true), null)
})
test('unsubscribe signatures reject tampering; marketing never falls back to transactional sender', () => {
  const before = { ...process.env }
  try {
    process.env.MARKETING_UNSUBSCRIBE_SECRET = 'x'.repeat(40)
    process.env.BREVO_MARKETING_API_KEY = 'test'
    process.env.MARKETING_DOMAIN_VERIFIED = 'true'
    process.env.MARKETING_SENDER_EMAIL = 'hola@nadamas.app'
    const { store } = fixture()
    assert.equal(store.marketingConfig().ready, false)
    process.env.MARKETING_SENDER_EMAIL = 'novedades@marketing.nadamas.app'
    assert.equal(store.marketingConfig().ready, true)
    const token = store.unsubscribeToken('A@example.com')
    assert.equal(store.readUnsubscribeToken(token), 'a@example.com')
    assert.equal(store.readUnsubscribeToken(`x${token}`), null)
    assert.equal(store.readUnsubscribeToken(`${token}.extra`), null)
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key]
    Object.assign(process.env, before)
  }
})

test('campaign endpoint rejects non-admin access and unconfigured senders before any delivery', async () => {
  let authorized = false
  let writes = 0
  const next = { NextResponse: { json: (body, init) => Response.json(body, init) } }
  const route = load('../../app/api/admin/marketing/route.ts', {
    'next/server': next,
    '@/lib/analytics/server': { reportServerError: () => {} },
    '@/lib/marketing': model,
    '@/lib/server/firebase-admin': {
      adminDb: {
        collection: () => {
          writes++
          throw new Error('must not write')
        },
      },
    },
    '@/lib/server/marketing/store': {
      marketingCaller: async () => (authorized ? { uid: 'admin' } : null),
      marketingConfig: () => ({ ready: false }),
    },
  })
  const request = () =>
    new Request('https://nadamas.app/api/admin/marketing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        subject: 'Novedades',
        content: 'Hola',
        userIds: ['a'],
      }),
    })
  assert.equal((await route.POST(request())).status, 403)
  authorized = true
  assert.equal((await route.POST(request())).status, 409)
  assert.equal(writes, 0)
})

test('unsubscribe GET is scanner-safe and POST records the suppression', async () => {
  let suppressions = 0
  const route = load('../../app/api/marketing/unsubscribe/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/analytics/server': { reportServerError: () => {} },
    '@/lib/marketing': model,
    '@/lib/server/marketing/store': {
      readUnsubscribeToken: (token) => (token === 'valid' ? 'a@example.com' : null),
      suppressEmail: async () => {
        suppressions++
      },
    },
  })
  assert.equal(
    (await route.GET(new Request('https://nadamas.app/api/marketing/unsubscribe?token=valid')))
      .status,
    200
  )
  assert.equal(suppressions, 0)
  assert.equal(
    (
      await route.POST(
        new Request('https://nadamas.app/api/marketing/unsubscribe?token=valid', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: 'List-Unsubscribe=One-Click',
        })
      )
    ).status,
    200
  )
  assert.equal(suppressions, 1)
  assert.equal(
    (
      await route.POST(
        new Request('https://nadamas.app/api/marketing/unsubscribe?token=invalid', {
          method: 'POST',
        })
      )
    ).status,
    400
  )
  assert.equal(suppressions, 1)
})
