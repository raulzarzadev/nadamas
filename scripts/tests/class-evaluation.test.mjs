import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, dependencies = {}) {
  const module = { exports: {} }
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  new Function(
    'require',
    'exports',
    'module',
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
  )((name) => dependencies[name] || require(name), module.exports, module)
  return module.exports
}
const rules = load('../../lib/class-evaluation.ts')
test('ended classes are eligible for evaluation, future and cancelled classes are not', () => {
  const booking = { date: '2026-10-09', endTime: '19:00', status: 'confirmed' }
  const now = Date.parse('2026-10-10T03:00:00Z')
  assert.equal(rules.hasClassEnded(booking, now), true)
  assert.equal(rules.canEvaluateBooking(booking, now), true)
  assert.equal(rules.hasClassEnded(booking, Date.parse('2026-10-10T00:00:00Z')), false)
  assert.equal(rules.canEvaluateBooking({ ...booking, status: 'cancelled' }, now), false)
  assert.equal(rules.canEvaluateBooking({ ...booking, noShow: true }, now), false)
  // Legacy coach-created bookings stored attended:false before attendance defaulted.
  assert.equal(rules.canEvaluateBooking({ ...booking, attended: false }, now), true)
})

const evaluation = { rating: 5, topics: ['technique'], publicComment: '', privateComment: '' }
const records = new Map()
const writes = []
const adminDb = {
  collection: (collection) => ({ doc: (id) => ({ key: `${collection}/${id}` }) }),
  runTransaction: async (callback) =>
    callback({
      get: async (ref) => ({ data: () => records.get(ref.key) }),
      set: (ref, data) => writes.push([ref.key, data]),
    }),
}
const ownership = load('../../lib/server/booking-ownership.ts', {
  '@/lib/school': {
    schoolMembershipHasRole: (membership, role) => membership.roles.includes(role),
  },
  './school-access': {
    getSchoolMembership: async (_schoolId, uid) =>
      uid === 'user'
        ? { status: 'active', roles: ['student'] }
        : uid === 'teacher'
          ? { status: 'active', roles: ['teacher'] }
          : uid === 'inactive'
            ? { status: 'suspended', roles: ['student'] }
            : null,
  },
  './school-students': {
    listSchoolStudents: async (schoolId, uid) =>
      schoolId === 'school' && uid === 'user'
        ? [{ id: 'owned', additionalProfileId: 'child', name: 'Alumno' }]
        : [],
  },
})
const { saveClassEvaluation } = load('../../lib/server/class-evaluations.ts', {
  '@/lib/class-evaluation': rules,
  '@/lib/server/booking-ownership': ownership,
  '@/lib/server/firebase-admin': { adminDb },
  '@/lib/server/school-students': {
    listSchoolStudents: async () => [{ id: 'owned', name: 'Alumno' }],
  },
})
test('school evaluations require the callers participation and an ended confirmed class', async () => {
  const occurrence = {
    schoolId: 'school',
    studentIds: ['owned'],
    teacherIds: ['coach'],
    date: '2000-01-01',
    endTime: '19:00',
    status: 'completed',
  }
  records.set('schoolClassOccurrences/class', occurrence)
  assert.equal(await saveClassEvaluation('school-class-class-user', 'user', evaluation), 200)
  assert.equal(writes.length, 2)
  assert.equal(writes[1][1].athleteId, 'user')
  assert.equal(await saveClassEvaluation('school-class-class-other', 'user', evaluation), 404)
  records.set('schoolClassOccurrences/class', { ...occurrence, studentIds: ['unrelated'] })
  assert.equal(await saveClassEvaluation('school-class-class-user', 'user', evaluation), 404)
  records.set('schoolClassOccurrences/class', { ...occurrence, date: '2999-01-01' })
  assert.equal(await saveClassEvaluation('school-class-class-user', 'user', evaluation), 409)
  records.set('schoolClassOccurrences/class', { ...occurrence, status: 'cancelled' })
  assert.equal(await saveClassEvaluation('school-class-class-user', 'user', evaluation), 409)
  assert.equal(writes.length, 2)
})

test('legacy school bookings require an active student link for evaluation and cancellation', async () => {
  const booking = { athleteId: 'owned', schoolId: 'school' }
  assert.equal(await ownership.bookingBelongsToAccount(booking, 'user'), true)
  assert.equal(
    await ownership.bookingBelongsToAccount({ ...booking, athleteId: 'child' }, 'user'),
    true
  )
  for (const uid of ['other', 'teacher', 'inactive'])
    assert.equal(await ownership.bookingBelongsToAccount(booking, uid), false)
  assert.equal(
    await ownership.bookingBelongsToAccount({ ...booking, schoolId: 'other-school' }, 'user'),
    false
  )
  assert.equal(
    await ownership.bookingBelongsToAccount({ ...booking, athleteId: 'unrelated' }, 'user'),
    false
  )
  assert.equal(await ownership.bookingBelongsToAccount({ athleteId: 'user' }, 'user'), true)
  const id = 'legacy-school'
  records.set(`bookings/${id}`, {
    ...booking,
    coachId: 'coach',
    date: '2000-01-01',
    endTime: '19:00',
    status: 'confirmed',
    attended: true,
  })
  assert.equal(await saveClassEvaluation(id, 'teacher', evaluation), 404)
  assert.equal(await saveClassEvaluation(id, 'other', evaluation), 404)
  assert.equal(await saveClassEvaluation(id, 'user', evaluation), 200)
})
