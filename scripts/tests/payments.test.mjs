import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(new URL('../../lib/payments/engine.ts', import.meta.url), 'utf8')
const module = { exports: {} }
new Function(
  'exports',
  'module',
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
)(module.exports, module)
const {
  addMonths,
  activateGrant,
  reserveGrant,
  changeGrantUsage,
  settleGrant,
  paymentAvailable,
  validateProduct,
  paymentWeek,
} = module.exports
const config = {
  classesEnabled: true,
  periodsEnabled: false,
  cancellationHours: 24,
  timezone: 'America/Mazatlan',
}
const product = (extra = {}) =>
  validateProduct(
    { name: 'Paquete', mode: 'classes', priceCents: 110000, classes: 5, ...extra },
    'product'
  )
const grant = (p = product()) =>
  activateGrant('grant', p, Date.parse('2026-01-31T18:00:00Z'), config.timezone)
test('activation-relative months clamp month ends and leap years', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29')
  assert.equal(grant(product({ mode: 'period', months: 1, perWeek: 2 })).endsBefore, '2026-02-28')
  assert.equal(paymentWeek('2026-02-01'), '2026-01-26')
})
test('held credits cannot be reused and settlement is idempotent', () => {
  const g = grant(product({ classes: 1 })),
    account = { grants: [g] }
  assert.equal(reserveGrant(account, '2026-02-02', config, false), g)
  changeGrantUsage(g, '2026-02-02', 1, 0)
  assert.equal(paymentAvailable(account, '2026-02-02'), 0)
  assert.throws(() => reserveGrant(account, '2026-02-02', config, false))
  const hold = { date: '2026-02-02', grantId: g.id, state: 'reserved' }
  assert.equal(settleGrant(account, hold, 'consume', false), true)
  assert.equal(settleGrant(account, hold, 'consume', false), false)
  assert.equal(g.used, 1)
  assert.equal(g.reserved, 0)
})
test('timely cancellation refunds; late cancellation consumes', () => {
  for (const late of [false, true]) {
    const g = grant(),
      account = { grants: [g] }
    changeGrantUsage(g, '2026-02-02', 1, 0)
    const hold = { date: '2026-02-02', grantId: g.id, state: 'reserved' }
    settleGrant(account, hold, 'release', late)
    assert.equal(paymentAvailable(account, '2026-02-02'), late ? 4 : 5)
    assert.equal(hold.state, late ? 'consumed' : 'released')
  }
})
test('daily, weekly and period limits include reservations and respect validity', () => {
  const g = grant(product({ mode: 'period', months: 1, perDay: 1, perWeek: 2, perPeriod: 3 })),
    account = { grants: [g] },
    settings = { ...config, classesEnabled: false, periodsEnabled: true }
  const reserve = (date) => {
    const selected = reserveGrant(account, date, settings, false)
    changeGrantUsage(selected, date, 1, 0)
  }
  reserve('2026-02-02')
  assert.throws(() => reserve('2026-02-02'))
  reserve('2026-02-03')
  assert.throws(() => reserve('2026-02-04'))
  reserve('2026-02-09')
  assert.throws(() => reserve('2026-02-16'))
  assert.throws(() => reserve('2026-02-28'))
  assert.throws(() => reserve('2026-01-30'))
})
test('plans have priority and package fallback is automatic', () => {
  const plan = grant(product({ mode: 'period', months: 1, perPeriod: 1 })),
    pack = grant()
  pack.id = 'pack'
  const account = { grants: [pack, plan] },
    settings = { ...config, periodsEnabled: true }
  assert.equal(reserveGrant(account, '2026-02-02', settings, false), plan)
  changeGrantUsage(plan, '2026-02-02', 1, 0)
  assert.equal(reserveGrant(account, '2026-02-02', settings, false), pack)
  assert.equal(reserveGrant(account, '2026-02-02', settings, true), pack)
})
test('invalid money, limits and empty plans are rejected', () => {
  for (const extra of [
    { priceCents: -1 },
    { priceCents: 1.5 },
    { classes: 0 },
    { mode: 'period', months: 1 },
    { mode: 'period', months: 25, perDay: 1 },
    { perWeek: -1 },
  ])
    assert.throws(() => product(extra))
})

test('closed transactions retry atomically while permission errors propagate', async () => {
  const code = ts.transpileModule(
    readFileSync(new URL('../../lib/server/payments/transaction.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText
  let attempts = 0,
    commits = 0
  const retryModule = { exports: {} }
  const adminDb = {
    runTransaction: async (callback) => {
      if (++attempts === 1)
        throw Object.assign(new Error('Transaction is invalid or closed.'), { code: 3 })
      const result = await callback({})
      commits++
      return result
    },
  }
  new Function('require', 'exports', 'module', code)(
    (id) => (id === 'server-only' ? {} : { adminDb }),
    retryModule.exports,
    retryModule
  )
  assert.equal(await retryModule.exports.runPaymentTransaction(async () => 42), 42)
  assert.equal(attempts, 2)
  assert.equal(commits, 1)
  attempts = 0
  adminDb.runTransaction = async () => {
    attempts++
    throw Object.assign(new Error('denied'), { code: 7 })
  }
  await assert.rejects(() => retryModule.exports.runPaymentTransaction(async () => 42), { code: 7 })
  assert.equal(attempts, 1)
})

test('booking without balance requires opt-in and still uses available credits', () => {
  const account = { grants: [] }
  assert.throws(() => reserveGrant(account, '2026-02-02', config, false), {
    code: 'payment_required',
  })
  const settings = { ...config, allowBookingWithoutBalance: true }
  assert.equal(reserveGrant(account, '2026-02-02', settings, false), null)
  const g = grant()
  assert.equal(reserveGrant({ grants: [g] }, '2026-02-02', settings, false), g)
  assert.equal(
    reserveGrant(
      { grants: [g] },
      '2027-02-02',
      { ...settings, classesEnabled: false, periodsEnabled: true },
      false
    ),
    null
  )
})
