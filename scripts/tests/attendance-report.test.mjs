import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const module = { exports: {} }
new Function(
  'require',
  'module',
  'exports',
  ts.transpileModule(readFileSync('lib/school-attendance-report.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
)(require, module, module.exports)
const { attendanceReportClasses } = module.exports
const occurrence = {
  id: 'class',
  date: '2026-10-15',
  startTime: '09:00',
  endTime: '10:00',
  title: 'Clase',
  status: 'scheduled',
  studentIds: ['ana', 'ana', 'luis'],
}
const now = Date.parse('2026-10-15T18:00:00Z')

test('only past non-cancelled hours are included, newest first', () => {
  const classes = attendanceReportClasses(
    [
      occurrence,
      { ...occurrence, id: 'future', date: '2026-10-16' },
      { ...occurrence, id: 'cancelled', status: 'cancelled' },
      { ...occurrence, id: 'old', date: '2026-10-14' },
    ],
    [],
    'America/Mazatlan',
    now
  )
  assert.deepEqual(
    classes.map((item) => item.id),
    ['class', 'old']
  )
  assert.equal(classes[0].enrolled, 2)
  assert.equal(classes[0].attended, 0)
})
test('merged sources count each person once and respect attendance removal', () => {
  const [result] = attendanceReportClasses(
    [{ ...occurrence, sourceOccurrenceIds: ['class', 'legacy'] }],
    [
      { sourceId: 'class', studentId: 'ana', attended: true, updatedAt: 1 },
      { sourceId: 'legacy', studentId: 'ana', attended: true },
      { sourceId: 'class', studentId: 'luis', attended: true, updatedAt: 1 },
      { sourceId: 'class', studentId: 'luis', attended: false, updatedAt: 2 },
      { sourceId: 'class', studentId: 'outsider', attended: true },
    ],
    'America/Mazatlan',
    now
  )
  assert.equal(result.attended, 1)
  assert.deepEqual(result.attendedStudentIds, ['ana'])
})
