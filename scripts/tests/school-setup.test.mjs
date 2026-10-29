import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const module = { exports: {} }
new Function(
  'exports',
  'module',
  ts.transpileModule(readFileSync('lib/school-setup.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
)(module.exports, module)
const { schoolSetupSteps } = module.exports
test('new school completes only creation, preserving the requested setup order', () => {
  const steps = schoolSetupSteps({
    paymentPlan: false,
    schedules: false,
    teachers: false,
    students: false,
  })
  assert.deepEqual(
    steps.map((step) => step.complete),
    [true, false, false, false, false]
  )
  assert.deepEqual(
    steps.map((step) => step.href),
    [
      '/school/settings',
      '/school/payments',
      '/school/classes',
      '/school/coaches',
      '/school/students',
    ]
  )
})
test('completion is independent so pre-existing students never imply a plan or teacher exists', () => {
  assert.deepEqual(
    schoolSetupSteps({ paymentPlan: false, schedules: true, teachers: false, students: true }).map(
      (step) => step.complete
    ),
    [true, false, true, false, true]
  )
})
