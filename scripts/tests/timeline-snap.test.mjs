import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const loaded = { exports: {} }
new Function(
  'exports',
  ts.transpileModule(readFileSync('lib/timeline-snap.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
)(loaded.exports)
const { snapTimelineRange } = loaded.exports
test('snapping cannot collapse a cycle to a single date', () => {
  assert.equal(snapTimelineRange(19, 20, 'start', [{ start: 1, end: 19 }], 1, 40, 2), null)
  assert.equal(snapTimelineRange(19, 20, 'end', [{ start: 20, end: 30 }], 1, 40, 2), null)
})
test('start snaps to the day after previous finish; end snaps before next start', () => {
  assert.deepEqual(snapTimelineRange(22, 30, 'start', [{ start: 1, end: 22 }], 1, 40, 2), {
    start: 23,
    end: 30,
    boundary: 23,
    delta: 1,
  })
  assert.deepEqual(snapTimelineRange(1, 23, 'end', [{ start: 23, end: 30 }], 1, 40, 2), {
    start: 1,
    end: 22,
    boundary: 23,
    delta: -1,
  })
})
test('moving retains duration and snapping never creates overlapping dates', () => {
  const snapped = snapTimelineRange(22, 27, 'move', [{ start: 1, end: 22 }], 1, 40, 2)
  assert.equal(snapped.start, 23)
  assert.equal(snapped.end - snapped.start, 5)
  assert.equal(
    snapTimelineRange(
      22,
      30,
      'start',
      [
        { start: 1, end: 22 },
        { start: 28, end: 35 },
      ],
      1,
      40,
      2
    )?.start,
    23
  )
  assert.equal(snapTimelineRange(30, 35, 'start', [{ start: 1, end: 22 }], 1, 40, 2), null)
})

test('calendar inputs use consecutive days across month boundaries', () => {
  assert.deepEqual(
    loaded.exports.snapCalendarEdge(
      { startDate: '2026-10-31', endDate: '2026-11-20' },
      'startDate',
      [{ startDate: '2026-10-01', endDate: '2026-10-31' }]
    ),
    { startDate: '2026-11-01', endDate: '2026-11-20' }
  )
})
