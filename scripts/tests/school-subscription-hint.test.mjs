import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const module = { exports: {} }
new Function(
  'exports',
  'module',
  ts.transpileModule(readFileSync('lib/school-subscription-hint.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
)(module.exports, module)
const { schoolSubscriptionHint } = module.exports
const now = Date.now(),
  day = 86400000
test('free label counts actual remaining days instead of a fixed promotional number', () => {
  assert.equal(
    schoolSubscriptionHint({ state: 'trialing', accessEndsAt: now + 15 * day }, now),
    'Gratuita · quedan 15 días'
  )
  assert.equal(
    schoolSubscriptionHint({ state: 'trialing', accessEndsAt: now + 30 * day }, now),
    'Gratuita · quedan 30 días'
  )
  assert.equal(
    schoolSubscriptionHint({ state: 'trialing', accessEndsAt: now + 1000 }, now),
    'Gratuita · queda 1 día'
  )
  assert.equal(
    schoolSubscriptionHint({ state: 'trialing', accessEndsAt: now - 1 }, now),
    'Prueba finalizada'
  )
})
test('paid and exempt states never advertise a free trial', () => {
  assert.equal(schoolSubscriptionHint({ state: 'active' }, now), 'Activa')
  assert.equal(schoolSubscriptionHint({ state: 'exempt' }, now), 'Exenta de pago')
  assert.equal(schoolSubscriptionHint({ state: 'limited' }, now), 'Acceso limitado')
})
