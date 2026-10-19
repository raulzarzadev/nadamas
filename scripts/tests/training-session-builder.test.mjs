import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const loaded = { exports: {} }
new Function(
  'exports',
  ts.transpileModule(readFileSync('lib/training-session-builder.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
)(loaded.exports)
const { buildDailySessions, sessionCalendarGroup } = loaded.exports
const cycle = {
  id: 'micro',
  type: 'micro',
  parentId: 'meso',
  title: 'Base',
  startDate: '2028-02-28',
  endDate: '2028-03-06',
  goal: '',
  content: '',
}
let count = 0
const id = () => `id-${++count}`
test('daily sessions cover inclusive dates, leap day and month/week transitions without duplicates', () => {
  const built = buildDailySessions(cycle, id)
  assert.equal(built.objectives.length, 8)
  assert.equal(built.objectiveDates[1], '2028-02-29')
  assert.equal(built.objectiveDates.at(-1), '2028-03-06')
  assert.notEqual(
    sessionCalendarGroup('2028-02-29').month,
    sessionCalendarGroup('2028-03-01').month
  )
  assert.equal(sessionCalendarGroup('2028-03-05').week, '2028-02-28')
  assert.equal(sessionCalendarGroup('2028-03-06').week, '2028-03-06')
  assert.deepEqual(buildDailySessions(built, id), built)
})
test('manual descriptions and workouts survive generation and rebuilding', () => {
  const existing = {
    ...cycle,
    objectives: ['Keep me'],
    objectiveTitles: ['Custom'],
    objectiveIds: ['original'],
    objectiveWorkouts: [[{ id: 'workout', blocks: [] }]],
  }
  const built = buildDailySessions(existing, id)
  assert.equal(built.objectives[0], 'Keep me')
  assert.equal(built.objectiveIds[0], 'original')
  assert.deepEqual(built.objectiveWorkouts[0], existing.objectiveWorkouts[0])
  assert.equal(built.objectiveDates[0], '')
  const edited = {
    ...built,
    objectives: built.objectives.map((text, index) => (index === 1 ? 'Updated' : text)),
  }
  assert.equal(buildDailySessions(edited, id).objectives[1], 'Updated')
})
test('invalid or reversed dates do not generate sessions', () => {
  for (const range of [{ startDate: '' }, { startDate: '2028-02-30' }, { endDate: '2028-01-01' }]) {
    const invalid = { ...cycle, ...range }
    assert.equal(buildDailySessions(invalid, id), invalid)
  }
})
