import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../../lib/subscriptions/engine.ts', import.meta.url), 'utf8')
const module = { exports: {} }
const pricing = { NADAMAS_PRICING: { regularMonthly: 299, promotionalMonthly: 49, trialDays: 30 } }
new Function(
  'require',
  'exports',
  'module',
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
)(
  (name) => {
    if (name === '../pricing') return pricing
    throw new Error(`Unexpected dependency: ${name}`)
  },
  module.exports,
  module
)
const {
  newSchoolSubscription,
  subscriptionAccess,
  subscriptionMonthEnd,
  subscriptionPrice,
  SUBSCRIPTION_TRIAL_MS,
  SUBSCRIPTION_GRACE_MS,
} = module.exports
const now = Date.parse('2026-01-31T12:30:00Z')
test('trial expires at exact boundary and additional schools have no trial', () => {
  const first = newSchoolSubscription('s', 'u', true, now)
  assert.equal(subscriptionAccess(first, now + SUBSCRIPTION_TRIAL_MS - 1).fullAccess, true)
  assert.equal(subscriptionAccess(first, now + SUBSCRIPTION_TRIAL_MS).fullAccess, false)
  assert.equal(
    subscriptionAccess(newSchoolSubscription('s2', 'u', false, now), now).fullAccess,
    false
  )
})
test('renewal grace ends exactly and voluntary cancellation has no grace', () => {
  const sub = {
    ...newSchoolSubscription('s', 'u', false, now),
    periodStartedAt: now,
    periodEndsAt: now + 1000,
  }
  assert.equal(subscriptionAccess(sub, sub.periodEndsAt).state, 'grace')
  assert.equal(subscriptionAccess(sub, sub.periodEndsAt + SUBSCRIPTION_GRACE_MS).state, 'limited')
  assert.equal(
    subscriptionAccess({ ...sub, cancelAtPeriodEnd: true }, sub.periodEndsAt).state,
    'limited'
  )
})
test('reported transfer grants provisional access for first purchase and indefinitely pending review', () => {
  const sub = { ...newSchoolSubscription('s', 'u', false, now), provisionalOrderId: 'payment' }
  assert.equal(subscriptionAccess(sub, now + 365 * 86400000).state, 'pending_review')
  assert.equal(subscriptionAccess({ ...sub, provisionalOrderId: null }, now).fullAccess, false)
})
test('invalidating provisional access preserves another paid period or trial', () => {
  const trial = newSchoolSubscription('s', 'u', true, now)
  assert.equal(subscriptionAccess({ ...trial, provisionalOrderId: null }, now).state, 'trialing')
  const paid = { ...trial, trialEndsAt: now, periodEndsAt: now + 1000, provisionalOrderId: null }
  assert.equal(subscriptionAccess(paid, now).state, 'active')
})
test('promotion survives grace and provisional review but expires after lapse', () => {
  const sub = {
    ...newSchoolSubscription('s', 'u', false, now),
    promotionalCodeId: 'promo',
    periodEndsAt: now + 1000,
  }
  assert.equal(subscriptionPrice(sub, now + 1000), 4900)
  assert.equal(subscriptionPrice(sub, now + 1000 + SUBSCRIPTION_GRACE_MS), 29900)
  assert.equal(
    subscriptionPrice(
      { ...sub, provisionalOrderId: 'p', provisionalPriceCents: 4900 },
      now + 365 * 86400000
    ),
    4900
  )
})
test('monthly period clamps month end and preserves time', () => {
  assert.equal(subscriptionMonthEnd(now), Date.parse('2026-02-28T12:30:00Z'))
  assert.equal(
    subscriptionMonthEnd(Date.parse('2028-01-31T12:30:00Z')),
    Date.parse('2028-02-29T12:30:00Z')
  )
})

test('reactivation quoted at regular price cannot revive an expired promotion by reporting payment', () => {
  const sub = {
    ...newSchoolSubscription('s', 'u', false, now),
    promotionalCodeId: 'used',
    periodEndsAt: now - 4 * 86400000,
  }
  assert.equal(subscriptionPrice(sub, now), 29900)
  const pending = { ...sub, provisionalOrderId: 'reactivation', provisionalPriceCents: 29900 }
  assert.equal(subscriptionAccess(pending, now).fullAccess, true)
  assert.equal(subscriptionPrice(pending, now), 29900)
  assert.equal(
    subscriptionPrice({ ...pending, provisionalOrderId: null, provisionalPriceCents: null }, now),
    29900
  )
})

test('admin exemption overrides expiry and pending review without changing stored dates', () => {
  const sub = {
    ...newSchoolSubscription('s', 'u', true, now),
    paymentExempt: true,
    provisionalOrderId: 'pending',
  }
  const before = JSON.stringify(sub)
  assert.deepEqual(subscriptionAccess(sub, now + 400 * 86400000), {
    state: 'exempt',
    fullAccess: true,
    accessEndsAt: null,
  })
  assert.equal(subscriptionPrice(sub, now), 0)
  assert.equal(JSON.stringify(sub), before)
  assert.equal(
    subscriptionAccess(
      { ...sub, paymentExempt: false, provisionalOrderId: null },
      now + 400 * 86400000
    ).state,
    'limited'
  )
})
