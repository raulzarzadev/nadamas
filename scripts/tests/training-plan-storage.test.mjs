import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const loaded = { exports: {} }
new Function(
  'exports',
  ts.transpileModule(readFileSync('lib/training-plan-storage.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
)(loaded.exports)
const { encodeTrainingCycles, decodeTrainingCycles } = loaded.exports

test('objective workouts use Firestore-compatible maps and round-trip without losing empty objectives or blocks', () => {
  const cycles = [
    {
      id: 'micro',
      objectives: ['First', 'Empty', 'Third'],
      objectiveTitles: ['A', 'B', 'C'],
      objectiveWorkouts: [
        [{ id: 'session', blocks: [{ id: 'block', repetitions: 1, series: [] }] }],
        [],
        [{ id: 'other', blocks: [] }],
      ],
    },
  ]
  const encoded = encodeTrainingCycles(cycles)
  const assertNoNestedArrays = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        assert.equal(Array.isArray(item), false)
        assertNoNestedArrays(item)
      }
    } else if (value && typeof value === 'object')
      Object.values(value).forEach(assertNoNestedArrays)
  }
  assertNoNestedArrays(encoded)
  assert.deepEqual(decodeTrainingCycles(encoded), cycles)
  assert.deepEqual(decodeTrainingCycles(cycles), cycles)
  assert.deepEqual(cycles[0].objectiveWorkouts[1], [])
})

test('existing cycles without objective workouts remain unchanged', () => {
  const cycles = [{ id: 'macro', goal: 'Original', content: '' }]
  assert.deepEqual(decodeTrainingCycles(encodeTrainingCycles(cycles)), cycles)
})
