import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = readFileSync(
  new URL('../../lib/subscriptions/reminders.ts', import.meta.url),
  'utf8'
)
const module = { exports: {} }
new Function(
  'exports',
  'module',
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
)(module.exports, module)
const { subscriptionReminder } = module.exports
const day = 86400000,
  end = 30 * day
const sub = { schoolId: 'school', trialEndsAt: end }
test('reminders choose only the current milestone and use stable deadline keys', () => {
  assert.equal(subscriptionReminder(sub, end - 8 * day), null)
  assert.equal(subscriptionReminder(sub, end - 5 * day).milestone, 7)
  assert.equal(subscriptionReminder(sub, end - 2 * day).milestone, 3)
  assert.equal(subscriptionReminder(sub, end - day).milestone, 1)
  assert.equal(subscriptionReminder(sub, end).milestone, 0)
  assert.equal(subscriptionReminder(sub, end + 2 * day), null)
  assert.equal(
    subscriptionReminder(sub, end - day).id,
    subscriptionReminder(sub, end - day + 100).id
  )
})
test('pending manual review suppresses expiry warnings; paid period replaces trial deadline', () => {
  assert.equal(subscriptionReminder({ ...sub, provisionalOrderId: 'order' }, end), null)
  assert.equal(subscriptionReminder({ ...sub, periodEndsAt: end + day }, end).kind, 'renewal')
})
