import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

test('opening and closing a Saturday slot preserves the Thursday calendar anchor', () => {
  const source = readFileSync('components/coach/CoachAgenda.tsx', 'utf8')
  const ast = ts.createSourceFile(
    'CoachAgenda.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const attributes = []
  function visit(node) {
    if (ts.isJsxAttribute(node)) attributes.push(node)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const select = attributes
    .find((node) => node.name.getText(ast) === 'onSelectSlot')
    .initializer.expression.getText(ast)
  const close = attributes
    .find(
      (node) =>
        node.name.getText(ast) === 'open' &&
        node.initializer?.expression?.getText(ast) === 'Boolean(horizontalClass)'
    )
    .parent.properties.find((node) => node.name?.getText(ast) === 'onClose')
    .initializer.expression.getText(ast)
  let selectedDate = '2026-10-15'
  let horizontalClass = null
  let multiSelect = false
  let batchSlots = []
  const slot = { date: '2026-10-17', startTime: '07:00', coachId: 'teacher', groupType: 'grupal' }
  const context = {
    horizontalSlots: new Map([['saturday', slot]]),
    setSelectedDate: (date) => {
      selectedDate = date
    },
    setHorizontalClass: (value) => {
      horizontalClass = value
    },
    setNotice: () => {},
    setBatchSlots: (update) => {
      batchSlots = update(batchSlots)
    },
    batchSlotKey: (item) => (item === slot ? 'saturday' : ''),
  }
  const callback = (text) =>
    new Function(...Object.keys(context), 'multiSelect', `return (${text})`)(
      ...Object.values(context),
      multiSelect
    )
  callback(select)('saturday')
  assert.equal(horizontalClass, slot)
  assert.equal(selectedDate, '2026-10-15')
  callback(close)()
  assert.equal(horizontalClass, null)
  assert.equal(selectedDate, '2026-10-15')
  multiSelect = true
  callback(select)('saturday')
  assert.deepEqual(batchSlots, [slot])
  assert.equal(horizontalClass, null)
  assert.equal(selectedDate, '2026-10-15')
})
