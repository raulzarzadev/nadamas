import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const nativeRequire = createRequire(import.meta.url)
function load(file, requireMock = nativeRequire) {
  const module = { exports: {} }
  new Function(
    'require',
    'exports',
    'module',
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
  )(requireMock, module.exports, module)
  return module.exports
}
const engine = load('../../lib/subscriptions/engine.ts')
const start = 1793188800,
  end = 1795867200
const base = () => ({
  schoolId: 'school',
  ownerId: 'owner',
  trialStartedAt: null,
  trialEndsAt: null,
  periodStartedAt: null,
  periodEndsAt: null,
  cancelAtPeriodEnd: false,
  promotionalCodeId: null,
  promotionalGrantedAt: null,
  pendingOrderId: null,
  provisionalOrderId: null,
  createdAt: 1,
  updatedAt: 1,
})
const live = (price = 29900) => ({
  id: 'sub_school',
  status: 'active',
  customer: 'cus_school',
  cancel_at_period_end: false,
  metadata: { schoolId: 'school', ...(price === 4900 ? { promotionalCodeId: 'promo' } : {}) },
  items: {
    data: [
      {
        id: 'si_school',
        current_period_start: start,
        current_period_end: end,
        price: { unit_amount: price, currency: 'mxn' },
      },
    ],
  },
  latest_invoice: {
    id: 'in_school',
    paid: true,
    amount_paid: price,
    currency: 'mxn',
    status: 'paid',
    lines: { data: [{ amount: price, period: { start, end } }] },
    status_transitions: { paid_at: start },
  },
})
const event = (id = 'evt_paid', created = start, type = 'invoice.paid') => ({
  id,
  created,
  type,
  data: {
    object: {
      id: type.startsWith('customer.subscription.') ? 'sub_school' : 'in_school',
      subscription: 'sub_school',
    },
  },
})
function harness(subscription = base(), provider = live(), promo) {
  const docs = new Map([['schoolSubscriptions/school', structuredClone(subscription)]])
  if (promo) docs.set('subscriptionCodes/promo', structuredClone(promo))
  const writes = []
  const ref = (collection, id) => ({ id, path: `${collection}/${id}` })
  const db = {
    collection: (collection) => ({ doc: (id) => ref(collection, id || `audit${writes.length}`) }),
    runTransaction: async (callback) => {
      const queued = []
      const snapshot = (r) => ({
        exists: docs.has(r.path),
        data: () => structuredClone(docs.get(r.path)),
      })
      const tx = {
        get: async (r) => snapshot(r),
        getAll: async (...refs) => refs.map(snapshot),
        update: (r, patch) => queued.push([r, patch, true]),
        create: (r, value) => {
          assert.equal(docs.has(r.path), false)
          queued.push([r, value, false])
        },
        set: (r, value) => queued.push([r, value, false]),
      }
      const result = await callback(tx)
      for (const [r, value, merge] of queued) {
        docs.set(r.path, merge ? { ...docs.get(r.path), ...value } : value)
        writes.push(r.path)
      }
      return result
    },
  }
  const requireMock = (name) => {
    if (name === 'server-only') return {}
    if (name === '@/lib/server/firebase-admin') return { adminDb: db }
    if (name === '@/lib/subscriptions/engine') return engine
    if (name === './store') return { subscriptionRef: (id) => ref('schoolSubscriptions', id) }
    if (name === './stripe-client')
      return { stripeConfigured: () => true, stripeRequest: async () => structuredClone(provider) }
    return nativeRequire(name)
  }
  return {
    ...load('../../lib/server/subscriptions/card.ts', requireMock),
    docs,
    writes,
    subscription: () => docs.get('schoolSubscriptions/school'),
  }
}
const promo = (extra = {}) => ({
  id: 'promo',
  schoolId: 'school',
  active: true,
  expiresAt: null,
  redeemedAt: null,
  ...extra,
})

test('verified paid invoice grants exactly its paid period and duplicate delivery adds no writes', async () => {
  const h = harness()
  await h.handleStripeEvent(event())
  assert.equal(h.subscription().periodStartedAt, start * 1000)
  assert.equal(h.subscription().periodEndsAt, end * 1000)
  assert.equal(h.subscription().stripeCustomerId, 'cus_school')
  const count = h.writes.length
  await h.handleStripeEvent(event())
  assert.equal(h.writes.length, count)
})
test('pending invoice and checkout completion never mark a period paid', async () => {
  const provider = live()
  provider.latest_invoice.paid = false
  provider.latest_invoice.status = 'open'
  provider.latest_invoice.amount_paid = 0
  const h = harness(base(), provider)
  await h.handleStripeEvent(event('evt_pending', start, 'checkout.session.completed'))
  assert.equal(h.subscription().periodEndsAt, null)
  assert.equal(h.subscription().periodStartedAt, null)
})
test('an older paid period cannot shorten a newer paid period', async () => {
  const h = harness({
    ...base(),
    periodStartedAt: end * 1000,
    periodEndsAt: (end + 2678400) * 1000,
  })
  await h.handleStripeEvent(event())
  assert.equal(h.subscription().periodStartedAt, end * 1000)
  assert.equal(h.subscription().periodEndsAt, (end + 2678400) * 1000)
})
test('stale event cannot restore canceled renewal from an older provider snapshot', async () => {
  const h = harness({
    ...base(),
    stripeSubscriptionId: 'sub_school',
    stripeLastEventCreated: end,
    cancelAtPeriodEnd: true,
    periodEndsAt: end * 1000,
  })
  await h.handleStripeEvent(event('evt_stale', start))
  assert.equal(h.subscription().cancelAtPeriodEnd, true)
})
test('paid invoice for a different period cannot activate the provider current period', async () => {
  const provider = live()
  provider.latest_invoice.lines.data[0].period = { start: start - 2678400, end: start }
  const h = harness(base(), provider)
  await h.handleStripeEvent(event()).catch(() => {})
  assert.equal(h.subscription().periodEndsAt, null)
})
test('paid amount must match subscription price, never accept 49 for a 299 invoice', async () => {
  const provider = live()
  provider.latest_invoice.amount_paid = 4900
  const h = harness(base(), provider)
  await h.handleStripeEvent(event()).catch(() => {})
  assert.equal(h.subscription().periodEndsAt, null)
})
test('a new discounted subscription requires a valid school-bound promotional code', async () => {
  for (const code of [
    undefined,
    promo({ schoolId: 'another-school' }),
    promo({ active: false }),
    promo({ expiresAt: 1 }),
    promo({ redeemedAt: 1, redeemedOrderId: 'old' }),
  ]) {
    const h = harness({ ...base(), promotionalCodeId: 'promo' }, live(4900), code)
    await h.handleStripeEvent(event()).catch(() => {})
    assert.equal(h.subscription().periodEndsAt, null)
  }
})
test('valid first promotional payment consumes its code exactly once', async () => {
  const h = harness({ ...base(), promotionalCodeId: 'promo' }, live(4900), promo())
  await h.handleStripeEvent(event())
  assert.equal(h.subscription().periodEndsAt, end * 1000)
  assert.equal(h.subscription().promotionalCodeId, 'promo')
  assert.equal(h.docs.get('subscriptionCodes/promo').redeemedOrderId, 'in_school')
})
test('deactivating a consumed code does not silently remove the existing subscriber benefit', async () => {
  const h = harness(
    {
      ...base(),
      stripeSubscriptionId: 'sub_school',
      promotionalCodeId: 'promo',
      promotionalGrantedAt: start * 1000,
      periodEndsAt: start * 1000,
    },
    live(4900),
    promo({ active: false, redeemedAt: start - 100, redeemedOrderId: 'in_previous' })
  )
  await h.handleStripeEvent(event())
  assert.equal(h.subscription().periodEndsAt, end * 1000)
  assert.equal(h.subscription().promotionalCodeId, 'promo')
})

test('a discounted renewal paid after grace cannot regain the lost promotional benefit', async () => {
  const provider = live(4900)
  provider.latest_invoice.status_transitions.paid_at = start + 3 * 24 * 3600 + 1
  const h = harness(
    {
      ...base(),
      stripeSubscriptionId: 'sub_school',
      promotionalCodeId: 'promo',
      promotionalGrantedAt: (start - 2678400) * 1000,
      periodStartedAt: (start - 2678400) * 1000,
      periodEndsAt: start * 1000,
    },
    provider,
    promo({ redeemedAt: start - 2678400, redeemedOrderId: 'in_previous' })
  )
  await assert.rejects(h.handleStripeEvent(event()), /STRIPE_PROMO_LAPSED/)
  assert.equal(h.subscription().periodEndsAt, start * 1000)
})
test('a discounted renewal paid within grace is honored even when webhook review happens later', async () => {
  const provider = live(4900)
  provider.latest_invoice.status_transitions.paid_at = start + 2 * 24 * 3600
  const h = harness(
    {
      ...base(),
      stripeSubscriptionId: 'sub_school',
      promotionalCodeId: 'promo',
      promotionalGrantedAt: (start - 2678400) * 1000,
      periodStartedAt: (start - 2678400) * 1000,
      periodEndsAt: start * 1000,
    },
    provider,
    promo({ redeemedAt: start - 2678400, redeemedOrderId: 'in_previous' })
  )
  await h.handleStripeEvent(event())
  assert.equal(h.subscription().periodEndsAt, end * 1000)
})
test('a code valid at checkout retains its quoted price if it expires before the paid event is processed', async () => {
  const now = Date.now()
  const h = harness(
    {
      ...base(),
      promotionalCodeId: 'promo',
      stripeCheckoutCreatedAt: now - 10000,
      stripeCheckoutPriceCents: 4900,
      stripeCheckoutPromotionalCodeId: 'promo',
    },
    live(4900),
    promo({ expiresAt: now - 1000 })
  )
  await h.handleStripeEvent(event())
  assert.equal(h.subscription().periodEndsAt, end * 1000)
  assert.equal(h.docs.get('subscriptionCodes/promo').redeemedOrderId, 'in_school')
})
test('canceled provider state cannot restore an old subscription pointer already cleared locally', async () => {
  const provider = live()
  provider.status = 'canceled'
  const h = harness({ ...base(), periodEndsAt: end * 1000, cancelAtPeriodEnd: true }, provider)
  await h.handleStripeEvent(event('evt_deleted', end, 'customer.subscription.deleted'))
  assert.equal(h.subscription().stripeSubscriptionId, undefined)
  assert.equal(h.subscription().periodEndsAt, end * 1000)
})
