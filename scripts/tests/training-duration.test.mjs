import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const loaded = { exports: {} }
new Function(
  'exports',
  ts.transpileModule(readFileSync('lib/class-training.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
)(loaded.exports)
const { seriesDurationSeconds, blockDuration, formatTrainingDuration } = loaded.exports
const series = (repetitions, interval, kind) => ({ repetitions, interval, kind })
test('series totals multiply the interval; pauses count once', () => {
  assert.equal(seriesDurationSeconds(series(10, '1:20')), 800)
  assert.equal(seriesDurationSeconds(series(4, '2:00', 'pause')), 120)
  assert.equal(seriesDurationSeconds(series(10, '0:00')), null)
  assert.equal(seriesDurationSeconds(series(10, '')), null)
})
test('block totals include pauses on each repetition and identify incomplete timing', () => {
  assert.deepEqual(
    blockDuration({
      repetitions: 4,
      series: [series(5, '2:00'), series(4, '4:00'), series(5, '2:00'), series(1, '2:00', 'pause')],
    }),
    { seconds: 9120, complete: true }
  )
  assert.deepEqual(blockDuration({ repetitions: 2, series: [series(5, '1:00'), series(3, '')] }), {
    seconds: 600,
    complete: false,
  })
  assert.deepEqual(blockDuration({ repetitions: 1, series: [] }), { seconds: 0, complete: false })
  assert.equal(formatTrainingDuration(800), '13:20')
  assert.equal(formatTrainingDuration(9120), '2:32:00')
})

test('workout duration sums every repeated block and keeps incomplete timing explicit', () => {
  const blocks = [
    { repetitions: 1, series: [series(10, '1:00'), series(10, '1:20')] },
    {
      repetitions: 4,
      series: [series(5, '2:00'), series(4, '4:00'), series(5, '2:00'), series(1, '2:00', 'pause')],
    },
  ]
  assert.deepEqual(loaded.exports.workoutDuration(blocks), { seconds: 10520, complete: true })
  assert.deepEqual(
    loaded.exports.workoutDuration([...blocks, { repetitions: 1, series: [series(3, '')] }]),
    { seconds: 10520, complete: false }
  )
  assert.deepEqual(loaded.exports.workoutDuration([]), { seconds: 0, complete: false })
})
