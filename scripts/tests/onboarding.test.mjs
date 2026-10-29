import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

function load(path) {
  const module = { exports: {} }
  new Function(
    'exports',
    'module',
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
  )(module.exports, module)
  return module.exports
}
const { validateOnboarding, needsOnboarding } = load('../../lib/onboarding/model.ts')
const { setupPaths } = load('../../components/onboarding/setup-paths.ts')
test('preferences allow combined profiles and require valid coach context', () => {
  assert.equal(validateOnboarding({ interests: [] }), null)
  assert.equal(validateOnboarding({ interests: ['admin'] }), null)
  assert.equal(validateOnboarding({ interests: ['coach'], coachContext: 'anything' }), null)
  assert.deepEqual(
    validateOnboarding({ interests: ['swimmer', 'coordinator'], coachContext: 'school' }),
    { interests: ['swimmer', 'coordinator'], coachContext: null }
  )
  assert.equal(
    validateOnboarding({ interests: ['swimmer', 'coach', 'coordinator'], coachContext: 'both' })
      .interests.length,
    3
  )
})
test('setup only repeats for incomplete non-admin profiles', () => {
  assert.equal(needsOnboarding(undefined), false)
  assert.equal(needsOnboarding({ roles: { admin: true } }), false)
  assert.equal(needsOnboarding({}), true)
  assert.equal(needsOnboarding({ onboarding: { version: 1, completedAt: 123 } }), false)
})
test('combined setup retains swimmer and school actions; employed coach follows invitation flow', () => {
  const paths = setupPaths({
    interests: ['swimmer', 'coach', 'coordinator'],
    coachContext: 'school',
  })
  assert.equal(paths.length, 3)
  const coach = paths.find((path) => path.id === 'coach')
  assert.equal(
    coach.actions.some((action) => action.href === '/notifications'),
    true
  )
  assert.equal(
    coach.actions.some((action) => action.title === 'Configurar mis horarios'),
    false
  )
  assert.equal(paths.find((path) => path.id === 'swimmer').actions.length, 3)
  assert.equal(paths.find((path) => path.id === 'coordinator').actions[0].href, '/school/create')
})

test('Google account creation returns a usable profile instead of leaving auth loading', async () => {
  let written
  const module = { exports: {} }
  const source = readFileSync(new URL('../../firebase/users.js', import.meta.url), 'utf8')
  const mocked = (name) => {
    if (name === 'firebase/firestore')
      return {
        doc: (_db, collection, id) => ({ collection, id }),
        setDoc: async (_ref, data) => {
          written = data
        },
      }
    if (name === 'firebase-dates-util') return { Dates: { deepFormatObjectDates: (data) => data } }
    if (name === '.') return { db: {} }
    if (name === './FirebaseCRUD') return { FirebaseCRUD: {} }
    throw new Error(name)
  }
  new Function(
    'require',
    'exports',
    'module',
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
  )(mocked, module.exports, module)
  const profile = await module.exports.createNewUser({ id: 'new-user', displayName: 'María' })
  assert.equal(profile.id, 'new-user')
  assert.equal(profile.displayName, written.displayName)
})
