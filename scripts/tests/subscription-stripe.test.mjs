import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(
  new URL('../../lib/server/subscriptions/stripe-client.ts', import.meta.url),
  'utf8'
)
const module = { exports: {} }
new Function(
  'exports',
  'module',
  'require',
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
)(module.exports, module, require)
const { verifyStripeEvent } = module.exports
const secret = 'test-webhook-secret',
  now = Date.parse('2026-10-28T12:00:00Z'),
  time = now / 1000
const body = JSON.stringify({
  id: 'evt_test',
  type: 'invoice.paid',
  data: { object: { id: 'in_test' } },
})
const sign = (t = time, b = body) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${b}`).digest('hex')}`
test('Stripe only accepts signed raw payloads within five minutes', () => {
  assert.equal(verifyStripeEvent(body, sign(), secret, now).id, 'evt_test')
  assert.throws(() => verifyStripeEvent(`${body} `, sign(), secret, now))
  assert.throws(() => verifyStripeEvent(body, sign(time - 301), secret, now))
  assert.throws(() => verifyStripeEvent(body, sign(time + 301), secret, now))
  assert.throws(() => verifyStripeEvent(body, sign(), 'wrong', now))
  assert.throws(() => verifyStripeEvent(body, `t=${time},v1=00`, secret, now))
})
test('Stripe signature rotation accepts any valid v1 and rejects malformed events', () => {
  assert.equal(
    verifyStripeEvent(body, `${sign()},v1=${'0'.repeat(64)}`, secret, now).id,
    'evt_test'
  )
  const invalid = JSON.stringify({ id: 'evt_bad', type: 'invoice.paid' })
  assert.throws(() => verifyStripeEvent(invalid, sign(time, invalid), secret, now))
})
