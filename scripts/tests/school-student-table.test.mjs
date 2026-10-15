import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, deps = {}) {
  const module = { exports: {} }
  new Function(
    'require',
    'module',
    'exports',
    ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
  )((id) => deps[id] || require(id), module, module.exports)
  return module.exports
}
const engine = load('lib/payments/engine.ts')
const { studentAge, studentPlanSummary } = load('lib/school-student-table.ts', {
  '@/lib/payments/engine': engine,
})
const now = Date.parse('2026-10-15T18:00:00Z')
const grant = {
  product: { name: 'Paquete', mode: 'classes', classes: 10 },
  startsOn: '2026-10-01',
  endsBefore: '2026-10-18',
  used: 3,
  reserved: 2,
}
test('age respects birthday and rejects future or invalid dates', () => {
  assert.equal(studentAge('2000-10-16', '2026-10-15'), 25)
  assert.equal(studentAge('2000-10-15', '2026-10-15'), 26)
  assert.equal(studentAge('2027-01-01', '2026-10-15'), null)
  assert.equal(studentAge('2000-02-31', '2026-10-15'), null)
})
test('current packages exclude used, reserved, expired and future grants', () => {
  const result = studentPlanSummary(
    {
      grants: [grant, { ...grant, endsBefore: '2026-10-10' }, { ...grant, startsOn: '2026-11-01' }],
    },
    'America/Mazatlan',
    now
  )
  assert.equal(result.remaining, 5)
  assert.equal(result.validity, 'En 3 días')
  assert.equal(result.name, 'Paquete')
})
test('unlimited plans and absent plans have no invented balance', () => {
  assert.equal(studentPlanSummary(undefined, 'America/Mazatlan', now).remaining, null)
  const result = studentPlanSummary(
    {
      grants: [
        {
          ...grant,
          endsBefore: null,
          product: { name: 'Mensual', mode: 'period', perPeriod: null },
        },
      ],
    },
    'America/Mazatlan',
    now
  )
  assert.equal(result.remaining, null)
  assert.equal(result.validity, 'Sin vencimiento')
  assert.equal(
    studentPlanSummary(
      { grants: [{ ...grant, endsBefore: '2026-10-10' }] },
      'America/Mazatlan',
      now
    ).remaining,
    0
  )
})
