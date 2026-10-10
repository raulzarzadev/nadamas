import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, dependencies = {}, fetcher = globalThis.fetch) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', 'fetch', code)(
    (id) => (id in dependencies ? dependencies[id] : require(id)),
    module,
    module.exports,
    fetcher
  )
  return module.exports
}
const { AuthedRequestCache } = load('../../lib/client/authed-request-cache.ts')

test('parallel reads share one request and independently readable bodies', async () => {
  const cache = new AuthedRequestCache()
  let calls = 0
  const fetcher = async () => {
    calls++
    return Response.json({ value: 1 })
  }
  const responses = await Promise.all([
    cache.get('u|x', fetcher, 1000),
    cache.get('u|x', fetcher, 1000),
    cache.get('u|x', fetcher, 1000),
  ])
  assert.equal(calls, 1)
  for (const response of responses) assert.deepEqual(await response.json(), { value: 1 })
})
test('fresh cache avoids loads; expiration reloads', async () => {
  let now = 0,
    calls = 0
  const cache = new AuthedRequestCache(128, () => now)
  const fetcher = async () => Response.json(++calls)
  assert.equal(await (await cache.get('u|x', fetcher, 100)).json(), 1)
  now = 99
  assert.equal(await (await cache.get('u|x', fetcher, 100)).json(), 1)
  now = 100
  assert.equal(await (await cache.get('u|x', fetcher, 100)).json(), 2)
})
test('errors do not enter the cache and can be retried', async () => {
  const cache = new AuthedRequestCache()
  await assert.rejects(
    cache.get(
      'u|x',
      () => {
        throw new Error('test')
      },
      1000
    )
  )
  assert.equal(
    await (await cache.get('u|x', async () => Response.json('retry'), 1000)).json(),
    'retry'
  )
})
test('invalidation during an old request prevents stale cache restoration', async () => {
  const cache = new AuthedRequestCache()
  let resolve
  const old = cache.get(
    'u|x',
    () =>
      new Promise((done) => {
        resolve = done
      }),
    1000
  )
  await Promise.resolve()
  cache.invalidate()
  await cache.get('u|x', async () => Response.json('new'), 1000)
  resolve(Response.json('old'))
  await old
  assert.equal(
    await (
      await cache.get(
        'u|x',
        () => {
          throw new Error('unexpected')
        },
        1000
      )
    ).json(),
    'new'
  )
})
test('bounded cache evicts oldest entry and zero TTL only deduplicates pending reads', async () => {
  const cache = new AuthedRequestCache(1)
  let calls = 0
  const fetcher = async () => Response.json(++calls)
  await cache.get('a', fetcher, 1000)
  await cache.get('b', fetcher, 1000)
  await cache.get('a', fetcher, 1000)
  assert.equal(calls, 3)
  await cache.get('live', fetcher, 0)
  await cache.get('live', fetcher, 0)
  assert.equal(calls, 5)
})
test('auth API cache isolates users and invalidates only changed school labels', async () => {
  let authListener
  const auth = { currentUser: { uid: 'first', getIdToken: async () => 'token' } }
  const calls = []
  const api = load(
    '../../lib/client/authed-api.ts',
    {
      'firebase/auth': {
        onAuthStateChanged: (_auth, fn) => {
          authListener = fn
          fn(auth.currentUser)
          return () => {}
        },
      },
      '@/firebase/index': { auth },
      '@/lib/analytics/client': {
        analyticsRequestHeaders: () => ({}),
        mutationAction: () => undefined,
        recordApiRequest: () => {},
      },
      './authed-request-cache': { AuthedRequestCache },
    },
    async (path, init) => {
      calls.push(`${init?.method || 'GET'} ${path}`)
      return Response.json({ ok: true })
    }
  )
  const a = '/api/coach/student-tags?schoolId=a&view=list'
  const b = '/api/coach/student-tags?schoolId=b&view=list'
  await Promise.all([api.getAuthed(a), api.getAuthed(a)])
  await api.getAuthed(b)
  assert.equal(calls.length, 2)
  await api.postAuthed('/api/coach/student-tags?schoolId=a&studentId=s', { name: 'Tag' })
  await api.getAuthed(b)
  await api.getAuthed(a)
  assert.equal(calls.length, 4)
  auth.currentUser = { uid: 'second', getIdToken: async () => 'token2' }
  authListener(auth.currentUser)
  await api.getAuthed(b)
  assert.equal(calls.length, 5)
})
const history = load('../../lib/school-student-history.ts')
const { schoolStudentSummaries } = load('../../lib/school-student-summary.ts', {
  './school-student-history': history,
})
const student = { id: 's', schoolId: 'school', studentUserId: 'account' }
const occurrence = (id, date) => ({
  id,
  schoolId: 'school',
  studentIds: ['s'],
  teacherIds: ['coach'],
  date,
  startTime: '08:00',
  endTime: '09:00',
  status: 'scheduled',
})
const booking = (id, overrides = {}) => ({
  id,
  schoolId: 'school',
  athleteId: 'account',
  coachId: 'coach',
  date: '2020-01-01',
  startTime: '08:00',
  endTime: '09:00',
  status: 'completed',
  ...overrides,
})
test('summaries count confirmed attendance and future bookings without duplicating occurrences', () => {
  const result = schoolStudentSummaries(
    [student],
    [occurrence('past', '2020-01-01'), occurrence('future', '2099-01-01')],
    [booking('linked', { schoolClassId: 'past' }), booking('personal')],
    [{ sourceId: 'past', studentId: 's', coachId: 'coach', attended: true }],
    'UTC',
    'coach'
  )
  assert.deepEqual(result.s, { taken: 2, scheduled: 1, related: true })
})
test('summaries exclude unrelated teachers and never infer attendance from a past date', () => {
  const result = schoolStudentSummaries(
    [student],
    [occurrence('past', '2020-01-01')],
    [booking('other', { coachId: 'other' })],
    [],
    'UTC',
    'coach'
  )
  assert.deepEqual(result.s, { taken: 0, scheduled: 0, related: true })
})
test('cancelled bookings do not establish coach relationship or count as scheduled', () => {
  const result = schoolStudentSummaries(
    [student],
    [],
    [booking('cancelled', { status: 'cancelled', date: '2099-01-01' })],
    [],
    'UTC',
    'coach'
  )
  assert.deepEqual(result.s, { taken: 0, scheduled: 0, related: false })
})

test('bulk labels do not expose assignments from another teacher', async () => {
  const labelColors = load('../../lib/student-label-colors.ts')
  const roles = load('../../lib/school.ts')
  const rows = {
    studentLabels: [{ id: 'label', data: () => ({ name: 'Equipo', color: 'blue' }) }],
    studentLabelAssignments: [
      { data: () => ({ studentId: 'own', labelIds: ['label'] }) },
      { data: () => ({ studentId: 'other', labelIds: ['label'] }) },
    ],
    schoolClassOccurrences: [
      { data: () => ({ teacherIds: ['coach'], studentIds: ['own'] }) },
      { data: () => ({ teacherIds: ['someone'], studentIds: ['other'] }) },
    ],
  }
  const helper = load('../../lib/server/school-labels.ts', {
    'server-only': {},
    '@/lib/school': roles,
    '@/lib/student-label-colors': labelColors,
    './firebase-admin': {
      adminDb: {
        collection: (collection) => ({
          where: () => ({ get: async () => ({ docs: rows[collection] }) }),
        }),
      },
    },
    './school-access': {
      requireSchoolAccess: async () => ({
        caller: { uid: 'coach' },
        globalAdmin: false,
        membership: { role: 'teacher', status: 'active' },
      }),
    },
  })
  const result = await helper.schoolLabelList(new Request('https://app.test'), 'school', 'students')
  assert.deepEqual(result.data.assignments, { own: ['label'] })
})
test('bulk label reads stop before Firestore when school access is denied', async () => {
  let calls = 0
  const helper = load('../../lib/server/school-labels.ts', {
    'server-only': {},
    '@/lib/school': {},
    '@/lib/student-label-colors': {},
    './firebase-admin': {
      adminDb: {
        collection: () => {
          calls++
          throw new Error('unexpected')
        },
      },
    },
    './school-access': {
      requireSchoolAccess: async () => ({ response: new Response(null, { status: 403 }) }),
    },
  })
  const result = await helper.schoolLabelList(new Request('https://app.test'), 'school', 'teachers')
  assert.equal(result.response.status, 403)
  assert.equal(calls, 0)
})
