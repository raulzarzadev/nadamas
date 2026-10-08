import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function fixture() {
  const data = new Map()
  const ref = (path) => ({
    path,
    collection: (id) => collection(`${path}/${id}`),
    async get() {
      return snapshot(path)
    },
  })
  const snapshot = (path) => ({ exists: data.has(path), data: () => data.get(path) })
  const collection = (path) => ({ doc: (id) => ref(`${path}/${id}`) })
  const randomNumbers = [42, 42, 43, 44, 45]
  let tokenNumber = 0
  let queue = Promise.resolve()
  const adminDb = {
    collection,
    runTransaction(fn) {
      const execution = queue.then(async () => {
        const writes = []
        const result = await fn({
          get: (reference) => reference.get(),
          create: (reference, value) =>
            writes.push(() => {
              assert.equal(data.has(reference.path), false)
              data.set(reference.path, value)
            }),
          set: (reference, value) => writes.push(() => data.set(reference.path, value)),
          delete: (reference) => writes.push(() => data.delete(reference.path)),
        })
        for (const write of writes) write()
        return result
      })
      queue = execution.catch(() => {})
      return execution
    },
  }
  const code = ts.transpileModule(
    readFileSync(new URL('../../lib/server/athlete-identities.ts', import.meta.url), 'utf8'),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }
  ).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(
    (id) => {
      if (id === 'server-only') return {}
      if (id === './firebase-admin') return { adminDb }
      if (id === 'node:crypto')
        return {
          randomInt: () => randomNumbers.shift() ?? 900,
          randomBytes: () => Buffer.from(String(++tokenNumber).padStart(64, '0'), 'hex'),
        }
      return require(id)
    },
    module,
    module.exports
  )
  data.set('users/alice', { name: 'Alice' })
  data.set('users/bob', { name: 'Bob' })
  data.set('additionalProfiles/child', { ownerId: 'alice', name: 'Child' })
  return { api: module.exports, data }
}

test('six digits preserve leading zeros; collisions retry and identity is permanent', async () => {
  const { api } = fixture()
  const alice = await api.ensureAthleteIdentity('user', 'alice')
  const bob = await api.ensureAthleteIdentity('user', 'bob')
  assert.equal(alice.numericId, '000042')
  assert.equal(bob.numericId, '000043')
  assert.deepEqual(await api.ensureAthleteIdentity('user', 'alice'), alice)
  assert.deepEqual(await api.findAthleteIdentity({ numericId: '000042' }), alice)
  assert.equal(await api.findAthleteIdentity({ numericId: '42' }), null)
})

test('concurrent requests return one canonical identity', async () => {
  const { api, data } = fixture()
  const [first, second] = await Promise.all([
    api.ensureAthleteIdentity('user', 'alice'),
    api.ensureAthleteIdentity('user', 'alice'),
  ])
  assert.deepEqual(first, second)
  assert.equal([...data.keys()].filter((key) => key.includes('/numbers/')).length, 1)
})

test('only account owner can rotate own or managed credentials; old QR revoked', async () => {
  const { api } = fixture()
  assert.equal(await api.rotateAthleteCredential('bob', 'additional', 'child'), null)
  assert.equal(await api.rotateAthleteCredential('bob', 'user', 'alice'), null)
  const old = await api.ensureAthleteIdentity('additional', 'child')
  const rotated = await api.rotateAthleteCredential('alice', 'additional', 'child')
  assert.equal(rotated.numericId, old.numericId)
  assert.notEqual(rotated.qrToken, old.qrToken)
  assert.equal(await api.findAthleteIdentity({ qrToken: old.qrToken }), null)
  assert.deepEqual(await api.findAthleteIdentity({ qrToken: rotated.qrToken }), rotated)
  assert.equal((await api.getIdentityProfile(rotated)).name, 'Child')
})

test('missing or malformed profiles cannot allocate identity', async () => {
  const { api } = fixture()
  await assert.rejects(() => api.ensureAthleteIdentity('user', 'missing'))
  await assert.rejects(() => api.ensureAthleteIdentity('user', 'alice/other'))
})

test('credential favors public nickname and never exposes legal name fields', async () => {
  const { api, data } = fixture()
  data.set('users/alice', {
    nickname: 'Alias visible',
    displayName: 'Legacy',
    name: 'Older',
    firstName: 'Private',
    lastName: 'Surname',
  })
  const credential = await api.getIdentityProfile(await api.ensureAthleteIdentity('user', 'alice'))
  assert.equal(credential.name, 'Alias visible')
  assert.equal('firstName' in credential, false)
  assert.equal('lastName' in credential, false)
})
