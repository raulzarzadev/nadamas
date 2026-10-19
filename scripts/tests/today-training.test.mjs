import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const loaded = { exports: {} }
new Function(
  'exports',
  ts.transpileModule(readFileSync('lib/today-training.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
)(loaded.exports)
const { getTrainingSessionsForDate, localCalendarDate } = loaded.exports
const macro = {
  id: 'macro',
  parentId: null,
  type: 'macro',
  title: 'Season',
  startDate: '2026-10-01',
  endDate: '2026-11-30',
}
const meso = { ...macro, id: 'meso', parentId: 'macro', type: 'meso' }
const micro = {
  ...macro,
  id: 'micro',
  parentId: 'meso',
  type: 'micro',
  objectiveDates: ['2026-10-19', '', '2026-10-20', '2026-10-19'],
  objectiveTitles: ['First', 'Undated', 'Tomorrow', 'Second'],
  objectives: ['Details', '', '', ''],
}
const plan = { id: 'plan', cycles: [macro, meso, micro] }
test('today matches explicit dates and includes multiple sessions, keeping their original indexes', () => {
  const found = getTrainingSessionsForDate([plan], '2026-10-19')
  assert.deepEqual(
    found.map((session) => session.sessionIndex),
    [0, 3]
  )
  assert.equal(found[0].description, 'Details')
  assert.equal(found[1].title, 'Second')
  assert.deepEqual(getTrainingSessionsForDate([plan], '2026-10-21'), [])
})
test('undated sessions and sessions outside their cycle hierarchy are excluded', () => {
  for (const cycles of [
    [macro, micro],
    [{ ...macro, endDate: '2026-10-18' }, meso, micro],
    [macro, { ...meso, startDate: '2026-10-20' }, micro],
    [macro, meso, { ...micro, endDate: '2026-10-18' }],
  ]) {
    assert.deepEqual(getTrainingSessionsForDate([{ ...plan, cycles }], '2026-10-19'), [])
  }
})
test('the date key uses the local calendar day', () => {
  assert.equal(localCalendarDate(new Date(2026, 9, 19, 23, 59)), '2026-10-19')
})

const { getTodayTraining } = loaded.exports
const scheduled = (date, hasSeries = true) => ({
  ...micro,
  id: `micro-${date}`,
  objectiveDates: [date],
  objectiveTitles: ['Scheduled'],
  objectives: [''],
  objectiveWorkouts: [
    [
      {
        id: 'workout',
        blocks: [{ id: 'block', repetitions: 1, series: hasSeries ? [{ id: 'series' }] : [] }],
      },
    ],
  ],
})
test('empty days show the nearest future workout, skipping empty sessions and blocks', () => {
  const data = [
    {
      ...plan,
      cycles: [
        macro,
        meso,
        scheduled('2026-10-19', false),
        scheduled('2026-10-20', false),
        scheduled('2026-10-22'),
        scheduled('2026-10-21'),
        scheduled('2026-10-18'),
      ],
    },
  ]
  assert.equal(getTodayTraining(data, '2026-10-19').date, '2026-10-21')
  assert.equal(getTodayTraining(data, '2026-10-19').context, 'next')
})
test('without future workouts use the last previous date; no workouts returns none', () => {
  const data = [
    { ...plan, cycles: [macro, meso, scheduled('2026-10-17'), scheduled('2026-10-18')] },
  ]
  assert.equal(getTodayTraining(data, '2026-10-19').date, '2026-10-18')
  assert.equal(getTodayTraining(data, '2026-10-19').context, 'last')
  assert.equal(getTodayTraining([plan], '2026-10-19').context, 'none')
})
test('actual training today takes priority over upcoming training', () => {
  const data = [
    { ...plan, cycles: [macro, meso, scheduled('2026-10-19'), scheduled('2026-10-20')] },
  ]
  assert.equal(getTodayTraining(data, '2026-10-19').context, 'today')
})

test('previous and next selectors independently find the closest dates with actual training', () => {
  const data = [
    {
      ...plan,
      cycles: [
        macro,
        meso,
        scheduled('2026-10-17'),
        scheduled('2026-10-18', false),
        scheduled('2026-10-20', false),
        scheduled('2026-10-21'),
        scheduled('2026-10-22'),
      ],
    },
  ]
  assert.deepEqual(loaded.exports.getTrainingDateNeighbors(data, '2026-10-19'), {
    previous: '2026-10-17',
    next: '2026-10-21',
  })
  assert.deepEqual(loaded.exports.getTrainingDateNeighbors(data, '2026-10-22'), {
    previous: '2026-10-21',
    next: null,
  })
  assert.deepEqual(loaded.exports.getTrainingDateNeighbors([], '2026-10-19'), {
    previous: null,
    next: null,
  })
})
