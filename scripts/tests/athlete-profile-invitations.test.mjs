import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const hash = (value) => createHash('sha256').update(value).digest('hex')
const paymentId = (...parts) => hash(JSON.stringify(parts))
function setup(initial = {}) {
  const data = new Map(Object.entries(initial).map(([key, value]) => [key, structuredClone(value)]))
  let counter = 0
  const snapshot = (ref) => ({
    ref,
    id: ref.id,
    exists: data.has(ref.path),
    data: () => structuredClone(data.get(ref.path)),
  })
  const collection = (path) => ({
    id: path.split('/').at(-1),
    path,
    doc: (id = `id${++counter}`) => {
      const ref = {
        id,
        path: `${path}/${id}`,
        parent: { id: path.split('/').at(-1) },
        collection: (name) => collection(`${path}/${id}/${name}`),
      }
      ref.get = async () => snapshot(ref)
      return ref
    },
    where(field, _op, value) {
      return query(path, [[field, value]])
    },
  })
  const query = (path, filters) => ({
    kind: 'query',
    path,
    filters,
    where(field, _op, value) {
      return query(path, [...filters, [field, value]])
    },
    limit() {
      return this
    },
    async get() {
      return {
        docs: [...data]
          .filter(
            ([key, item]) =>
              key.startsWith(`${path}/`) &&
              key.split('/').length === path.split('/').length + 1 &&
              filters.every(([field, value]) => item[field] === value)
          )
          .map(([key]) => snapshot(collection(path).doc(key.split('/').at(-1)))),
      }
    },
  })
  const db = {
    collection,
    async runTransaction(fn) {
      const writes = []
      const tx = {
        async get(ref) {
          assert.equal(writes.length, 0, 'all transaction reads must precede writes')
          return ref.kind === 'query' ? ref.get() : snapshot(ref)
        },
        set(ref, value, options) {
          writes.push(() =>
            data.set(ref.path, {
              ...(options?.merge ? data.get(ref.path) : {}),
              ...structuredClone(value),
            })
          )
        },
        update(ref, value) {
          writes.push(() => {
            assert.ok(data.has(ref.path))
            data.set(ref.path, { ...data.get(ref.path), ...structuredClone(value) })
          })
        },
        delete(ref) {
          writes.push(() => data.delete(ref.path))
        },
      }
      const result = await fn(tx)
      for (const write of writes) write()
      return result
    },
  }
  const exports = {}
  const filename = new URL('../../lib/server/athlete-profile-invitations.ts', import.meta.url)
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, {
    exports,
    Date,
    Set,
    Map,
    console,
    require: (id) => {
      if (id === 'server-only') return {}
      if (id === 'node:crypto')
        return { createHash, randomBytes: () => ({ toString: () => 'a'.repeat(43) }) }
      if (id.includes('additional-profile'))
        return {
          validProfileBirthDate: (value) =>
            /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            new Date(value).toISOString().slice(0, 10) === value &&
            new Date(value) <= new Date(),
        }
      if (id.includes('coach-student-progress'))
        return { studentProgressId: (coach, athlete) => `${coach}_${athlete}` }
      if (id.includes('firebase-admin')) return { adminDb: db }
      if (id.includes('payments/store')) return { paymentId }
      throw new Error(id)
    },
  })
  return { api: exports, data }
}
const invitationPath = 'athleteIdentityRegistry/v1/profileInvitations/invite'
const token = 't'.repeat(43)
const email = 'diana@example.test'
const caller = { uid: 'account', email, email_verified: true }
const profile = {
  name: 'Diana',
  phone: '+526691234567',
  birthDate: '2000-01-01',
  gender: 'femenil',
}
const invitation = (extra = {}) => ({
  coachId: 'coach',
  studentId: 'manual_diana',
  schoolId: '',
  email,
  tokenHash: hash(token),
  status: 'pending',
  expiresAt: Date.now() + 60000,
  sentAt: Date.now() - 61000,
  profile,
  ...extra,
})
const fixtures = () => ({
  [invitationPath]: invitation(),
  'users/account': { id: 'account', roles: { athlete: true, coach: true } },
  'coachStudentProgress/coach_manual_diana': {
    athleteId: 'manual_diana',
    coachId: 'coach',
    athleteEmail: email,
    level: 3,
    coachAssessment: 2,
  },
  'bookings/class': { coachId: 'coach', athleteId: 'manual_diana', schoolId: null },
  'bookings/other': { coachId: 'other', athleteId: 'manual_diana' },
  'coachStudentProgressEntries/entry': {
    coachId: 'coach',
    athleteId: 'manual_diana',
    note: 'Keep me',
  },
  'studentLabelAssignments/old': {
    scope: 'coach:coach',
    studentId: 'manual_diana',
    labelIds: ['new'],
  },
  'studentLabelAssignments/existing': {
    scope: 'coach:coach',
    studentId: 'account',
    labelIds: ['team'],
  },
  [`paymentAccounts/${paymentId('coach:coach', 'manual_diana')}`]: {
    grants: [{ id: 'old', used: 2 }],
  },
  [`paymentAccounts/${paymentId('coach:coach', 'account')}`]: {
    grants: [{ id: 'existing', used: 1 }],
  },
  [`paymentReservations/${paymentId('coach:coach', 'manual_diana', 'class')}`]: {
    scope: 'coach:coach',
    studentId: 'manual_diana',
    sourceId: 'class',
    state: 'reserved',
  },
})
test('acceptance links existing history, labels and financial records without duplicating the athlete', async () => {
  const { api, data } = setup(fixtures())
  await api.acceptProfileInvitation(token, caller, profile)
  assert.equal(data.get('bookings/class').athleteId, 'account')
  assert.equal(data.get('bookings/other').athleteId, 'manual_diana')
  assert.equal(data.get('coachStudentProgressEntries/entry').athleteId, 'account')
  assert.equal(data.get('coachStudentProgress/coach_account').level, 3)
  assert.equal(data.has('coachStudentProgress/coach_manual_diana'), false)
  assert.deepEqual(
    data.get(`studentLabelAssignments/${hash('coach:coach|account')}`).labelIds.sort(),
    ['new', 'team']
  )
  assert.deepEqual(
    data
      .get(`paymentAccounts/${paymentId('coach:coach', 'account')}`)
      .grants.map((item) => item.id)
      .sort(),
    ['existing', 'old']
  )
  assert.equal(
    data.get(`paymentReservations/${paymentId('coach:coach', 'account', 'class')}`).studentId,
    'account'
  )
  assert.equal(data.get('users/account').roles.coach, true)
  assert.equal(data.get(invitationPath).status, 'accepted')
  const before = JSON.stringify([...data])
  await api.acceptProfileInvitation(token, caller, profile)
  assert.equal(JSON.stringify([...data]), before, 'acceptance is idempotent')
})
test('wrong email, unverified email, expired token and invalid profile cannot link records', async () => {
  for (const [override, person, details] of [
    [{}, { ...caller, email: 'wrong@example.test' }, profile],
    [{}, { ...caller, email_verified: false }, profile],
    [{ expiresAt: 1 }, caller, profile],
    [{}, caller, { ...profile, birthDate: '2000-02-31' }],
  ]) {
    const { api, data } = setup({ ...fixtures(), [invitationPath]: invitation(override) })
    const before = JSON.stringify([...data])
    await assert.rejects(api.acceptProfileInvitation(token, person, details))
    assert.equal(JSON.stringify([...data]), before)
  }
})
test('school acceptance preserves student id and existing membership roles', async () => {
  const { api, data } = setup({
    [invitationPath]: invitation({ schoolId: 'school', studentId: 'student' }),
    'schoolStudents/student': { schoolId: 'school', studentEmail: email },
    'schoolMemberships/school_account': { roles: ['teacher'], role: 'teacher' },
  })
  await api.acceptProfileInvitation(token, caller, profile)
  assert.equal(data.get('schoolStudents/student').studentUserId, 'account')
  assert.deepEqual(data.get('schoolMemberships/school_account').roles, ['teacher', 'student'])
})
test('changed target email and account conflicts cannot reassign an athlete', async () => {
  const { api, data } = setup({
    ...fixtures(),
    'coachStudentProgress/coach_manual_diana': { athleteEmail: 'changed@example.test' },
  })
  await assert.rejects(api.acceptProfileInvitation(token, caller, profile))
  assert.equal(data.get(invitationPath).status, 'pending')
})

test('an existing account or linked school athlete cannot be claimed by a different user', async () => {
  for (const seed of [
    { ...fixtures(), [invitationPath]: invitation({ studentId: 'other-account' }) },
    {
      [invitationPath]: invitation({ schoolId: 'school', studentId: 'student' }),
      'schoolStudents/student': {
        schoolId: 'school',
        studentEmail: email,
        studentUserId: 'other-account',
      },
    },
  ]) {
    const { api, data } = setup(seed)
    const before = JSON.stringify([...data])
    await assert.rejects(api.acceptProfileInvitation(token, caller, profile))
    assert.equal(JSON.stringify([...data]), before)
  }
})

test('resending an invitation is rate limited and never replaces a pending token inside the cooldown', async () => {
  const { api, data } = setup()
  const input = { coachId: 'coach', studentId: 'manual_diana', schoolId: '', email, profile }
  await api.createProfileInvitation(input)
  const before = JSON.stringify([...data])
  await assert.rejects(api.createProfileInvitation(input), /INVITATION_THROTTLED/)
  assert.equal(JSON.stringify([...data]), before)
})

test('pending invitations appear only for their verified email and open by authenticated id', async () => {
  const source = fixtures()
  const id = 'b'.repeat(64)
  delete source[invitationPath]
  source[`athleteIdentityRegistry/v1/profileInvitations/${id}`] = invitation()
  const { api, data } = setup(source)
  assert.equal((await api.listProfileInvitationNotifications(caller)).length, 1)
  const [notification] = await api.listProfileInvitationNotifications(caller)
  assert.equal(notification.link, `/athlete/profile-invitations/${id}`)
  assert.equal(
    (await api.listProfileInvitationNotifications({ ...caller, email: 'other@mail.com' })).length,
    0
  )
  assert.equal(
    (await api.listProfileInvitationNotifications({ ...caller, email_verified: false })).length,
    0
  )
  await assert.rejects(
    api.acceptProfileInvitation(id, { ...caller, email: 'other@mail.com' }, profile)
  )
  await api.acceptProfileInvitation(id, caller, profile)
  assert.equal(data.get(`athleteIdentityRegistry/v1/profileInvitations/${id}`).status, 'accepted')
  assert.equal((await api.listProfileInvitationNotifications(caller)).length, 0)
})
