import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const module = { exports: {} }
new Function(
  'exports',
  ts.transpileModule(readFileSync('lib/training-planner.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
)(module.exports)
const { validateTrainingCycle } = module.exports
const macro = {
  id: 'macro',
  parentId: null,
  type: 'macro',
  title: 'Temporada',
  startDate: '2026-10-01',
  endDate: '2026-12-31',
  goal: '',
  content: '',
}
const meso = {
  ...macro,
  id: 'meso',
  parentId: 'macro',
  type: 'meso',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
}
const micro = {
  ...macro,
  id: 'micro',
  parentId: 'meso',
  type: 'micro',
  startDate: '2026-10-01',
  endDate: '2026-10-07',
}

test('training hierarchy accepts macro → meso → micro and inclusive dates', () => {
  assert.equal(validateTrainingCycle(macro, []), null)
  assert.equal(validateTrainingCycle(meso, [macro]), null)
  assert.equal(validateTrainingCycle(micro, [macro, meso]), null)
  assert.equal(validateTrainingCycle({ ...micro, endDate: micro.startDate }, [macro, meso]), null)
})
test('training dates reject impossible dates, backwards periods and children outside their parent', () => {
  for (const value of ['2026-02-30', '2026-13-01', 'bad'])
    assert.ok(validateTrainingCycle({ ...macro, startDate: value }, []))
  assert.ok(validateTrainingCycle({ ...macro, endDate: '2026-09-30' }, []))
  assert.ok(validateTrainingCycle({ ...meso, startDate: '2026-09-30' }, [macro]))
  assert.ok(validateTrainingCycle({ ...micro, endDate: '2026-11-01' }, [macro, meso]))
})
test('editing a parent cannot exclude children or skip hierarchy levels', () => {
  assert.ok(validateTrainingCycle({ ...meso, endDate: '2026-10-03' }, [macro, meso, micro]))
  assert.ok(validateTrainingCycle({ ...micro, parentId: 'macro' }, [macro, meso]))
  assert.ok(validateTrainingCycle({ ...macro, parentId: 'meso' }, [meso]))
  assert.ok(validateTrainingCycle({ ...macro, title: '  ' }, []))
})

test('training plans remain private and ownership cannot be transferred', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/)
  const root = `http://${host}/v1/projects/nadamas-b1ecf/databases/(default)/documents`
  const signup = async () =>
    await (
      await fetch(
        'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=local-test',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ returnSecureToken: true }),
        }
      )
    ).json()
  const owner = await signup(),
    other = await signup()
  const id = `training-test-${crypto.randomUUID()}`
  const encode = (value) =>
    typeof value === 'string'
      ? { stringValue: value }
      : typeof value === 'number'
        ? { integerValue: String(value) }
        : value === null
          ? { nullValue: null }
          : Array.isArray(value)
            ? { arrayValue: { values: value.map(encode) } }
            : {
                mapValue: {
                  fields: Object.fromEntries(
                    Object.entries(value).map(([key, item]) => [key, encode(item)])
                  ),
                },
              }
  const headers = (account) => ({
    authorization: `Bearer ${account.idToken}`,
    'content-type': 'application/json',
  })
  const write = (data, account = owner) =>
    fetch(`${root}/trainingPlans/${id}`, {
      method: 'PATCH',
      headers: headers(account),
      body: JSON.stringify({
        fields: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, encode(value)])
        ),
      }),
    })
  const plan = { userId: owner.localId, createdAt: Date.now(), cycles: [macro, meso, micro] }
  try {
    assert.equal((await write(plan)).status, 200)
    assert.equal(
      (await fetch(`${root}/trainingPlans/${id}`, { headers: headers(owner) })).status,
      200
    )
    assert.equal(
      (await fetch(`${root}/trainingPlans/${id}`, { headers: headers(other) })).status,
      403
    )
    assert.equal((await fetch(`${root}/trainingPlans/${id}`)).status, 403)
    assert.equal((await write({ ...plan, userId: other.localId })).status, 403)
    assert.equal((await write(plan, other)).status, 403)
    assert.equal(
      (await fetch(`${root}/trainingPlans/${id}`, { method: 'DELETE', headers: headers(other) }))
        .status,
      403
    )
    assert.equal(
      (await write({ ...plan, cycles: [macro, meso], updatedAt: Date.now() })).status,
      200
    )
  } finally {
    await fetch(`${root}/trainingPlans/${id}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer owner' },
    })
    for (const account of [owner, other])
      await fetch(
        'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:delete?key=local-test',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ idToken: account.idToken }),
        }
      )
  }
})

test('only the name is required; dates, goal and content are optional', () => {
  const empty = { ...macro, title: 'Temporada', startDate: '', endDate: '', goal: '', content: '' }
  assert.equal(validateTrainingCycle(empty, []), null)
  assert.equal(validateTrainingCycle({ ...empty, startDate: '2026-10-01' }, []), null)
  assert.equal(validateTrainingCycle({ ...empty, endDate: '2026-10-31' }, []), null)
  assert.equal(validateTrainingCycle({ ...micro, startDate: '', endDate: '' }, [macro, meso]), null)
  assert.equal(validateTrainingCycle(meso, [empty]), null)
  assert.ok(
    validateTrainingCycle({ ...micro, startDate: '', endDate: '2026-09-01' }, [macro, meso])
  )
})

test('new mesocycles continue after the latest end and stay inside the macro', () => {
  const { nextMesocycleRange } = module.exports
  const parent = { ...macro, startDate: '2026-10-01', endDate: '2026-10-30' }
  assert.deepEqual(nextMesocycleRange(parent, []), {
    startDate: '2026-10-01',
    endDate: '2026-10-10',
  })
  assert.deepEqual(nextMesocycleRange(parent, [{ ...meso, endDate: '2026-10-10' }]), {
    startDate: '2026-10-11',
    endDate: '2026-10-20',
  })
  assert.deepEqual(nextMesocycleRange(parent, [{ ...meso, endDate: '2026-10-25' }]), {
    startDate: '2026-10-26',
    endDate: '2026-10-30',
  })
  assert.equal(nextMesocycleRange(parent, [{ ...meso, endDate: '2026-10-30' }]), null)
})
