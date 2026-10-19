import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const load = (file, imports = {}) => {
  const exports = {}
  new Function(
    'exports',
    'require',
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
  )(exports, (name) => {
    if (!(name in imports)) throw new Error(name)
    return imports[name]
  })
  return exports
}
const calendar = load('lib/training-session-builder.ts')
const { groupTrainingSessions, reorderTrainingSessions } = load('lib/training-session-groups.ts', {
  './training-session-builder': calendar,
})
const value = {
  id: 'micro',
  goal: '',
  objectives: ['First', 'Second', 'Third', 'Manual'],
  objectiveIds: ['a', 'b', 'c', 'd'],
  objectiveDates: ['2026-09-30', '2026-10-01', '2026-10-05', ''],
  objectiveTitles: ['September', 'October', 'Next week', 'Undated'],
  objectiveWorkouts: [[{ id: 'workout-a', blocks: [] }], [], [{ id: 'workout-c', blocks: [] }], []],
}
test('calendar hierarchy groups all sessions by month and Monday-based week with accurate counts', () => {
  const groups = groupTrainingSessions(value)
  assert.deepEqual(
    groups.map((group) => [group.id, group.count]),
    [
      ['2026-09', 1],
      ['2026-10', 2],
      ['undated', 1],
    ]
  )
  assert.equal(groups[1].weeks.length, 2)
  assert.deepEqual(
    groups.flatMap((month) => month.weeks.flatMap((week) => week.items.map((item) => item.id))),
    value.objectiveIds
  )
})
test('moving a month keeps all session data attached and leaves the original unchanged', () => {
  const groups = groupTrainingSessions(value)
  const order = [groups[1], groups[0], groups[2]].flatMap((month) =>
    month.weeks.flatMap((week) => week.items.map((item) => item.index))
  )
  const moved = reorderTrainingSessions(value, order)
  assert.deepEqual(moved.objectiveIds, ['b', 'c', 'a', 'd'])
  assert.equal(moved.objectiveDates[2], '2026-09-30')
  assert.equal(moved.objectives[2], 'First')
  assert.deepEqual(moved.objectiveWorkouts[2], [{ id: 'workout-a', blocks: [] }])
  assert.deepEqual(value.objectiveIds, ['a', 'b', 'c', 'd'])
  assert.deepEqual(
    groupTrainingSessions(moved).map((group) => group.id),
    ['2026-10', '2026-09', 'undated']
  )
})
test('moving weeks preserves every session; incomplete permutations are rejected', () => {
  const moved = reorderTrainingSessions(value, [0, 2, 1, 3])
  assert.deepEqual(
    groupTrainingSessions(moved)[1].weeks.map((week) => week.items[0].id),
    ['c', 'b']
  )
  assert.equal(reorderTrainingSessions(value, [0, 1]), value)
  assert.equal(reorderTrainingSessions(value, [0, 0, 2, 3]), value)
})
