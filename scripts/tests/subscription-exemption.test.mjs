import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, resolve = require) {
  const module = { exports: {} }
  new Function(
    'exports',
    'module',
    'require',
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
  )(module.exports, module, resolve)
  return module.exports
}
const engine = load('../../lib/subscriptions/engine.ts')
const now = Date.now()
function fixture(extra = {}, provider) {
  const sub = { ...engine.newSchoolSubscription('school', 'owner', false, now), ...extra }
  const records = new Map([
    ['schools/school', { createdBy: 'owner', name: 'Escuela' }],
    ['schoolSubscriptions/school', structuredClone(sub)],
  ])
  let next = 0
  const db = {
    collection(name) {
      return {
        doc(id = `auto${next++}`) {
          return { path: `${name}/${id}`, id }
        },
      }
    },
    async runTransaction(callback) {
      const pending = []
      const snap = (ref) => ({
        id: ref.id,
        exists: records.has(ref.path),
        data: () => structuredClone(records.get(ref.path)),
      })
      const tx = {
        get: async (ref) => snap(ref),
        getAll: async (...refs) => refs.map(snap),
        set: (ref, data) => pending.push(() => records.set(ref.path, structuredClone(data))),
        update: (ref, data) =>
          pending.push(() =>
            records.set(ref.path, { ...records.get(ref.path), ...structuredClone(data) })
          ),
        create: (ref, data) => pending.push(() => records.set(ref.path, structuredClone(data))),
      }
      const result = await callback(tx)
      for (const write of pending) write()
      return result
    },
  }
  const calls = []
  const store = load('../../lib/server/subscriptions/store.ts', (name) => {
    if (name === 'server-only') return {}
    if (name === '@/lib/server/firebase-admin') return { adminDb: db }
    if (name === '@/lib/subscriptions/engine') return engine
    if (name === './stripe-client')
      return {
        stripeRequest: async (path, params, _key, method) => {
          assert.notEqual(
            records.get('schoolSubscriptions/school').paymentExempt,
            true,
            'do not enable before provider succeeds'
          )
          calls.push({ path, params: params?.toString(), method })
          if (provider) return provider(path, params, records)
          return { id: 'cs_open', status: 'open' }
        },
      }
    return require(name)
  })
  return { store, calls, records, get: () => records.get('schoolSubscriptions/school'), sub }
}
test('enabling exemption first cancels Stripe renewal and expires open checkout, preserving periods and orders', async () => {
  const f = fixture({
    stripeSubscriptionId: 'sub_live',
    stripeCheckoutSessionId: 'cs_open',
    stripeCheckoutExpiresAt: now + 100000,
    periodStartedAt: now - 100,
    periodEndsAt: now + 100000,
    pendingOrderId: 'old',
  })
  await f.store.setSchoolPaymentExemption('school', true, 'Convenio especial', 'admin')
  assert.deepEqual(
    f.calls.map((call) => call.path),
    ['subscriptions/sub_live', 'checkout/sessions/cs_open', 'checkout/sessions/cs_open/expire']
  )
  assert.equal(f.calls[0].params, 'invoice_now=false&prorate=false')
  assert.equal(f.calls[0].method, 'DELETE')
  assert.equal(f.get().stripeSubscriptionId, null)
  assert.equal(f.get().paymentExempt, true)
  assert.equal(f.get().cancelAtPeriodEnd, true)
  assert.equal(f.get().stripeCheckoutSessionId, null)
  assert.equal(f.get().periodEndsAt, f.sub.periodEndsAt)
  assert.equal(f.get().pendingOrderId, 'old')
  assert.equal(f.get().exemptionUpdatedBy, 'admin')
  assert.equal(f.get().exemptionChangeId, null)
  assert.equal(
    [...f.records.values()].some((value) => value.action === 'school_payment_exempted'),
    true
  )
})
test('Stripe cancellation failure never enables exemption or falsely claims cancellation', async () => {
  const f = fixture({ stripeSubscriptionId: 'sub_live', paymentExempt: false }, () => {
    throw new Error('provider_down')
  })
  await assert.rejects(() => f.store.setSchoolPaymentExemption('school', true, 'Convenio', 'admin'))
  assert.equal(f.get().paymentExempt, false)
  assert.equal(f.get().cancelAtPeriodEnd, false)
  assert.equal(f.get().exemptionChangeId, null)
})
test('checkout expiration failure retains provider cancellation but does not enable exemption', async () => {
  const f = fixture(
    { stripeSubscriptionId: 'sub_live', stripeCheckoutSessionId: 'cs_open', paymentExempt: false },
    (path) => {
      if (path.endsWith('/expire')) throw new Error('provider_down')
      return { id: 'cs_open', status: 'open' }
    }
  )
  await assert.rejects(() => f.store.setSchoolPaymentExemption('school', true, 'Convenio', 'admin'))
  assert.equal(f.get().paymentExempt, false)
  assert.equal(f.get().cancelAtPeriodEnd, true)
})
test('removing exemption does not resume Stripe, create a trial or change paid dates', async () => {
  const f = fixture({
    paymentExempt: true,
    stripeSubscriptionId: 'sub_live',
    cancelAtPeriodEnd: true,
    periodEndsAt: now - 100,
  })
  await f.store.setSchoolPaymentExemption('school', false, 'Terminó convenio', 'admin')
  assert.equal(f.calls.length, 0)
  assert.equal(f.get().paymentExempt, false)
  assert.equal(f.get().cancelAtPeriodEnd, true)
  assert.equal(f.get().periodEndsAt, now - 100)
  assert.equal(f.get().trialEndsAt, null)
  assert.equal(engine.subscriptionAccess(f.get(), now).state, 'limited')
})
test('completed checkout blocks exemption until its payment has reconciled', async () => {
  const f = fixture({ stripeCheckoutSessionId: 'cs_complete', paymentExempt: false }, () => ({
    id: 'cs_complete',
    status: 'complete',
  }))
  await assert.rejects(
    () => f.store.setSchoolPaymentExemption('school', true, 'Convenio', 'admin'),
    (error) => error.code === 'checkout_completed'
  )
  assert.equal(f.get().paymentExempt, false)
  assert.equal(f.get().exemptionChangeId, null)
})
