import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import { indexSupports, queryInventory, requiredComposite } from '../lib/firestore-query-audit.mjs'

const indexes = JSON.parse(
  readFileSync(new URL('../../firestore.indexes.json', import.meta.url), 'utf8')
).indexes
function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(
    (id) => {
      if (!(id in dependencies)) throw new Error(`Unexpected import ${id}`)
      return dependencies[id]
    },
    module,
    module.exports
  )
  return module.exports
}
function database(rows, calls) {
  return {
    collection(name) {
      const filters = [],
        orders = []
      let count = Infinity
      const query = {
        where(field, op, value) {
          filters.push({ field, op, value })
          return query
        },
        orderBy(field, direction) {
          orders.push({ field, direction })
          return query
        },
        limit(value) {
          count = value
          return query
        },
        async get() {
          calls.push({
            collection: name,
            filters: filters.map(({ field, op }) => ({ field, op })),
            orders,
            count,
            values: filters,
          })
          let selected = rows.filter((row) =>
            filters.every(({ field, op, value }) =>
              op === '=='
                ? row[field] === value
                : op === 'in'
                  ? value.includes(row[field])
                  : op === '<='
                    ? row[field] <= value
                    : false
            )
          )
          for (const { field, direction } of [...orders].reverse())
            selected = selected.sort(
              (a, b) => (a[field] > b[field] ? 1 : -1) * (direction === 'desc' ? -1 : 1)
            )
          return { docs: selected.slice(0, count).map((row) => ({ id: row.id, data: () => row })) }
        },
      }
      return query
    },
  }
}
test('every discovered composite query has a local index and index definitions are unique', () => {
  const inventory = queryInventory()
  assert.ok(inventory.filterCalls > 100)
  assert.ok(inventory.queries.length > 60)
  for (const query of inventory.queries.filter(requiredComposite))
    assert.ok(
      indexes.some((index) => indexSupports(index, query)),
      `${query.location}: ${JSON.stringify(query)}`
    )
  const keys = indexes.map((index) => JSON.stringify(index))
  assert.equal(new Set(keys).size, keys.length)
  const reviewedDynamicFiles = new Set([
    'app/api/admin/users/[id]/route.ts',
    'app/api/notifications/read/route.ts',
    'lib/server/calendar-feeds.ts',
    'lib/server/class-evaluations.ts',
    'lib/server/payments/reads.ts',
    'lib/server/slugs.ts',
  ])
  for (const query of inventory.unresolved)
    assert.ok(
      reviewedDynamicFiles.has(query.location.replace(/:\d+$/, '')),
      `Review dynamic query: ${query.location}`
    )
})
test('student payment history chunks IN filters and isolates scope before globally limiting', async () => {
  const calls = [],
    studentIds = Array.from({ length: 65 }, (_, i) => `student-${i}`)
  const rows = Array.from({ length: 260 }, (_, i) => ({
    id: `order-${i}`,
    studentId: studentIds[i % 65],
    scope: 'school:one',
    createdAt: i,
  }))
  rows.push({ id: 'other-school', studentId: studentIds[0], scope: 'school:two', createdAt: 999 })
  const { paymentHistory } = load('../../lib/server/payments/reads.ts', {
    'server-only': {},
    '../firebase-admin': { adminDb: database(rows, calls) },
  })
  const result = await paymentHistory('paymentOrders', 'school:one', studentIds, false)
  assert.equal(calls.length, 3)
  assert.deepEqual(
    calls.map((call) => call.values.find((filter) => filter.op === 'in').value.length),
    [30, 30, 5]
  )
  assert.equal(result.length, 200)
  assert.equal(result[0].createdAt, 259)
  assert.equal(result.at(-1).createdAt, 60)
  assert.ok(result.every((row) => row.scope === 'school:one'))
  assert.deepEqual(await paymentHistory('paymentOrders', 'school:one', [], false), [])
  assert.equal(calls.length, 3)
})
test('actual history variants match their indexes and reservations filter consumed state', async () => {
  const calls = []
  const { paymentHistory } = load('../../lib/server/payments/reads.ts', {
    'server-only': {},
    '../firebase-admin': { adminDb: database([], calls) },
  })
  for (const collection of ['paymentOrders', 'paymentMovements', 'paymentReservations']) {
    for (const manager of [true, false])
      await paymentHistory(collection, 'school:one', ['student'], manager)
  }
  assert.equal(calls.length, 6)
  for (const call of calls)
    assert.ok(
      indexes.some((index) => indexSupports(index, call)),
      JSON.stringify(call)
    )
  for (const call of calls.filter((call) => call.collection === 'paymentReservations'))
    assert.equal(call.values.find((filter) => filter.field === 'state').value, 'consumed')
})
test('overdue settlement does not starve behind more than 200 processed reservations', async () => {
  const path = new URL('../../lib/server/payments/reservations.ts', import.meta.url)
  const source = ts.createSourceFile(
    path.pathname,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  )
  const declaration = source.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'settleOverduePayments'
  )
  assert.ok(declaration)
  const code = ts.transpileModule(declaration.getText(source), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const rows = Array.from({ length: 205 }, (_, i) => ({
    id: `old-${i}`,
    scope: 'school:one',
    state: 'consumed',
    endsAt: 1,
  }))
  rows.push(
    {
      id: 'due',
      scope: 'school:one',
      state: 'reserved',
      endsAt: 2,
      studentId: 'student',
      sourceId: 'class',
      date: '2026-01-01',
      startTime: '09:00',
    },
    { id: 'other', scope: 'school:two', state: 'reserved', endsAt: 2 },
    { id: 'future', scope: 'school:one', state: 'reserved', endsAt: Date.now() + 1000000 }
  )
  const calls = [],
    events = [],
    exports = {}
  new Function('exports', 'adminDb', 'paymentTransaction', code)(
    exports,
    database(rows, calls),
    async (items) => events.push(...items)
  )
  assert.equal(await exports.settleOverduePayments('school:one'), 1)
  assert.equal(events[0].sourceId, 'class')
  assert.equal(events[0].action, 'consume')
  assert.equal(await exports.settleOverduePayments(), 2)
  for (const call of calls) {
    assert.equal(call.values.find((filter) => filter.field === 'state').value, 'reserved')
    assert.ok(indexes.some((index) => indexSupports(index, call)))
  }
})
