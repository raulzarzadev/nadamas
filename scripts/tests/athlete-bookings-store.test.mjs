import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../../lib/store/athlete-bookings.ts', import.meta.url), 'utf8')
const auth = { currentUser: { uid: 'athlete' } }
let calls = 0
let respond = async () => ({
  json: async () => ({ bookings: [{ id: 'first', status: 'confirmed' }] }),
})
const module = { exports: {} }
new Function(
  'require',
  'exports',
  'module',
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
)(
  (name) => {
    if (name === '@/firebase/index') return { auth }
    if (name === '@/lib/client/authed-api')
      return {
        getAuthed: () => {
          calls++
          return respond()
        },
      }
    return require(name)
  },
  module.exports,
  module
)
const { makeAppStore, ensureAthleteBookings, bookingActions } = module.exports

test('navigation and list share one initial request; writes update Redux without reads', async () => {
  const store = makeAppStore()
  await Promise.all([
    store.dispatch(ensureAthleteBookings('athlete')),
    store.dispatch(ensureAthleteBookings('athlete')),
  ])
  assert.equal(calls, 1)
  store.dispatch(bookingActions.upsert([{ id: 'second', status: 'confirmed' }]))
  store.dispatch(bookingActions.cancelled('first'))
  const bookings = await store.dispatch(ensureAthleteBookings('athlete'))
  assert.equal(calls, 1)
  assert.deepEqual(
    bookings.map(({ id, status }) => ({ id, status })),
    [
      { id: 'first', status: 'cancelled' },
      { id: 'second', status: 'confirmed' },
    ]
  )
  store.dispatch(
    bookingActions.upsert([{ id: 'second', status: 'confirmed', athleteName: 'Updated' }])
  )
  assert.equal(store.getState().athleteBookings.bookings.length, 2)
})

test('a response from the previous user cannot populate the new session', async () => {
  const store = makeAppStore()
  let resolve
  respond = () =>
    new Promise((done) => {
      resolve = done
    })
  const request = store.dispatch(ensureAthleteBookings('athlete'))
  auth.currentUser = { uid: 'other' }
  resolve({ json: async () => ({ bookings: [{ id: 'private' }] }) })
  await request
  assert.deepEqual(store.getState().athleteBookings.bookings, [])
})

test('a delayed refresh cannot overwrite a successful cancellation', async () => {
  auth.currentUser = { uid: 'athlete' }
  const store = makeAppStore()
  store.dispatch(
    bookingActions.received({ uid: 'athlete', bookings: [{ id: 'first', status: 'confirmed' }] })
  )
  let resolve
  respond = () =>
    new Promise((done) => {
      resolve = done
    })
  const request = store.dispatch(ensureAthleteBookings('athlete', true))
  store.dispatch(bookingActions.cancelled('first'))
  resolve({ json: async () => ({ bookings: [{ id: 'first', status: 'confirmed' }] }) })
  await request
  assert.equal(store.getState().athleteBookings.bookings[0].status, 'cancelled')
})
