import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const module = { exports: {} }
new Function(
  'exports',
  'module',
  ts.transpileModule(
    readFileSync(new URL('../../lib/subscription-mutation-policy.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText
)(module.exports, module)
const { schoolMutationRequiresSubscription, newReservationSchoolIds } = module.exports
const event = (action, studentId = 'student', scope = 'school:one') => ({
  action,
  studentId,
  scope,
})

test('limited school retains reading, attendance, cancellation and reschedule routes', () => {
  for (const path of ['students', 'classes', 'agenda', 'class-requests'])
    assert.equal(schoolMutationRequiresSubscription('GET', `/api/schools/one/${path}`), false)
  for (const [method, path] of [
    ['POST', 'attendance'],
    ['POST', 'agenda/reassign'],
    ['POST', 'reservations/cancel'],
    ['PATCH', 'classes/old'],
    ['DELETE', 'classes/old/students/student'],
  ])
    assert.equal(schoolMutationRequiresSubscription(method, `/api/schools/one/${path}`), false)
})
test('new school operations require access independently of actor role', () => {
  for (const path of [
    'students',
    'students/quick',
    'classes',
    'class-requests',
    'invitations',
    'agenda/assignments',
    'teachers/coach/schedule',
    'classes/old/students',
  ])
    assert.equal(schoolMutationRequiresSubscription('POST', `/api/schools/one/${path}`), true)
  assert.equal(schoolMutationRequiresSubscription('PUT', '/api/schools/one/availability'), true)
})
test('reserve check covers free school classes but leaves independent coaches unchanged', () => {
  assert.deepEqual(newReservationSchoolIds([event('reserve')]), ['one'])
  assert.deepEqual(newReservationSchoolIds([event('reserve', 'student', 'coach:coach')]), [])
  assert.deepEqual(
    newReservationSchoolIds([event('consume'), event('unconsume'), event('release')]),
    []
  )
})
test('moving preserves participant and session count, never authorizes another participant or school', () => {
  assert.deepEqual(newReservationSchoolIds([event('release'), event('reserve')]), [])
  assert.deepEqual(
    newReservationSchoolIds([event('release'), event('reserve'), event('reserve')]),
    ['one']
  )
  assert.deepEqual(newReservationSchoolIds([event('release'), event('reserve', 'other')]), ['one'])
  assert.deepEqual(
    newReservationSchoolIds([event('release'), event('reserve', 'student', 'school:two')]),
    ['two']
  )
})

function reservationModule(checkAccess) {
  const compiled = ts.transpileModule(
    readFileSync(new URL('../../lib/server/payments/reservations.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  ).outputText
  const result = { exports: {} }
  const requireMock = (name) => {
    if (name === '@/lib/subscription-mutation-policy') return module.exports
    if (name === '../subscriptions/access') return { assertSchoolSubscriptionAccess: checkAccess }
    if (name === '@/lib/payments/model')
      return { DEFAULT_PAYMENT_SETTINGS: { classesEnabled: false, periodsEnabled: false } }
    if (name === '../firebase-admin')
      return { adminDb: { collection: (collection) => ({ doc: (id) => ({ id, collection }) }) } }
    if (name === './store')
      return {
        settingsRef: (id) => ({ id, collection: 'paymentSettings' }),
        accountRef: (scope, studentId) => ({ id: `${scope}_${studentId}` }),
        paymentId: (...parts) => parts.join('_'),
      }
    return {}
  }
  new Function('require', 'exports', 'module', compiled)(requireMock, result.exports, result)
  return result.exports
}

test('real reservation pipeline rejects a limited school before any wallet read or write, even when billing is disabled', async () => {
  const calls = []
  const { preparePaymentEvents } = reservationModule(async (schoolId, tx) => {
    calls.push([schoolId, tx])
    throw new Error('subscription_required')
  })
  const tx = {
    getAll: () => assert.fail('must not read billing after denying subscription'),
    set: () => assert.fail('must not write a reservation or debit balance'),
  }
  await assert.rejects(preparePaymentEvents(tx, [event('reserve')]), /subscription_required/)
  assert.deepEqual(calls, [['one', tx]])
})

test('real reservation pipeline retains free-booking behavior for an active school after access check', async () => {
  const calls = []
  const { preparePaymentEvents } = reservationModule(async (schoolId) => calls.push(schoolId))
  const tx = {
    getAll: async (...refs) => refs.map(() => ({ data: () => undefined })),
    set: () => assert.fail('disabled class billing must not create holds or debit wallets'),
  }
  const apply = await preparePaymentEvents(tx, [event('reserve')])
  apply()
  assert.deepEqual(calls, ['one'])
})
