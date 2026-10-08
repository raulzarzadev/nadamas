import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, dependencies) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(
    (id) => (id in dependencies ? dependencies[id] : require(id)),
    module,
    module.exports
  )
  return module.exports
}
const identityHelpers = load('../../lib/athlete-identity.ts', {})
const policy = load('../../lib/attendance.ts', {})
const offeringsHelpers = load('../../lib/coach-offerings.ts', {})
const agendaHelpers = load('../../lib/coach-agenda.ts', {
  '@/lib/coach-offerings': offeringsHelpers,
})
const exampleClass = (overrides = {}) => ({
  id: 'class',
  schoolId: 'school',
  date: '2026-10-08',
  startTime: '18:00',
  endTime: '19:00',
  title: 'Natación',
  teacherIds: ['teacher'],
  studentIds: ['student'],
  type: 'group',
  status: 'scheduled',
  ...overrides,
})
const student = {
  id: 'student',
  schoolId: 'school',
  name: 'Ana',
  status: 'active',
  studentUserId: 'user',
}
const outsider = {
  profileId: 'outside',
  profileType: 'user',
  numericId: '004321',
  qrToken: 'a'.repeat(64),
  createdAt: 1,
  name: 'Extra',
}
function fixture(classes = [exampleClass()]) {
  const data = new Map(classes.map((item) => [`schoolClassOccurrences/${item.id}`, item]))
  data.set('schoolStudents/student', student)
  let committed = 0
  const snapshot = (path) => ({
    id: path.split('/').at(-1),
    ref: ref(path),
    exists: data.has(path),
    data: () => structuredClone(data.get(path)),
  })
  function ref(path) {
    return {
      path,
      id: path.split('/').at(-1),
      get: async () => snapshot(path),
      collection: (id) => collection(`${path}/${id}`),
    }
  }
  function collection(path, filters = []) {
    return {
      doc: (id) => ref(`${path}/${id}`),
      where: (field, operator, value) => {
        assert.equal(operator, '==')
        return collection(path, [...filters, [field, value]])
      },
      get: async () => ({
        docs: [...data.keys()]
          .filter(
            (key) =>
              key.startsWith(`${path}/`) &&
              key.split('/').length === path.split('/').length + 1 &&
              filters.every(([field, value]) => data.get(key)[field] === value)
          )
          .map(snapshot),
      }),
    }
  }
  let queue = Promise.resolve()
  const adminDb = {
    collection,
    runTransaction(handler) {
      const execution = queue.then(async () => {
        const staged = []
        let writing = false
        const result = await handler({
          async get(reference) {
            assert.equal(writing, false, 'Firestore reads must precede writes')
            return reference.get()
          },
          set(reference, value, options) {
            writing = true
            staged.push(() =>
              data.set(
                reference.path,
                options?.merge ? { ...data.get(reference.path), ...value } : value
              )
            )
          },
          update(reference, value) {
            writing = true
            assert.equal(data.has(reference.path), true)
            staged.push(() => data.set(reference.path, { ...data.get(reference.path), ...value }))
          },
        })
        for (const write of staged) write()
        committed += staged.length
        return result
      })
      queue = execution.catch(() => {})
      return execution
    },
  }
  const api = load('../../lib/server/attendance.ts', {
    'server-only': {},
    '@/lib/athlete-identity': identityHelpers,
    '@/lib/attendance': policy,
    '@/lib/coach-agenda': agendaHelpers,
    '@/lib/coach-offerings': offeringsHelpers,
    '@/lib/school': { UNASSIGNED_SCHOOL_COACH_ID: '__unassigned__' },
    './firebase-admin': { adminDb },
    './athlete-identities': {
      ensureAthleteIdentity: async () => ({ numericId: '000123', qrToken: 'secret-must-not-leak' }),
      findAthleteIdentity: async ({ numericId, qrToken }) =>
        numericId === outsider.numericId || qrToken === outsider.qrToken ? outsider : null,
      getIdentityProfile: async (identity) => identity,
    },
    './school-agenda': {
      coalesceGroupClassOccurrences: (items) => items,
      schoolScheduleOwners: (items) =>
        items.filter((item) => item.status === 'active' && item.roles?.includes('teacher')),
      legacySchoolOfferings: () => [],
    },
    './school-students': {
      listSchoolStudents: async () =>
        [...data.entries()]
          .filter(([key]) => key.startsWith('schoolStudents/'))
          .map(([, value]) => value),
    },
  })
  const record = (overrides = {}) =>
    api.recordAttendance({
      schoolId: 'school',
      occurrenceId: 'class',
      actorId: 'teacher',
      director: false,
      method: 'name',
      student,
      profile: null,
      addToClass: false,
      linkToSchool: false,
      promoteToGroup: false,
      ...overrides,
    })
  const route = (access) =>
    load('../../app/api/schools/[schoolId]/attendance/route.ts', {
      'next/server': {
        NextResponse: {
          json: (body, options) => ({
            body,
            status: options?.status || 200,
            headers: options?.headers,
          }),
        },
      },
      '@/lib/attendance': policy,
      '@/lib/school': {
        schoolMembershipHasRole: (membership, role) => membership?.roles?.includes(role),
      },
      '@/lib/server/attendance': api,
      '@/lib/server/firebase-admin': { adminDb },
      '@/lib/server/school-access': { requireSchoolAccess: async () => access },
      '@/lib/server/school-agenda-updates': { withSchoolAgendaUpdate: (handler) => handler },
    })
  return { api, route, record, data, adminDb, writes: () => committed }
}

test('teacher can only mutate an assigned class', async () => {
  const f = fixture()
  assert.equal((await f.record({ actorId: 'other-teacher' })).code, 'unauthorized')
  assert.equal(f.writes(), 0)
})

test('attendance is idempotent, including simultaneous requests, and preserves notes', async () => {
  const f = fixture()
  f.data.set('agendaStudentRecords/class-class-student', { note: 'Conservar esta nota', grade: 4 })
  const [first, second] = await Promise.all([f.record(), f.record()])
  assert.equal(first.code, 'ok')
  assert.equal(first.alreadyRecorded, false)
  assert.equal(second.alreadyRecorded, true)
  assert.equal(f.writes(), 2)
  assert.equal(f.data.get('agendaStudentRecords/class-class-student').note, 'Conservar esta nota')
  assert.equal(f.data.get('agendaStudentRecords/class-class-student').grade, 4)
  assert.equal(f.data.get('agendaStudentRecords/class-class-student').attended, true)
})

test('outsider needs explicit school and class consent; never grants account access', async () => {
  const f = fixture()
  const person = { student: null, profile: outsider }
  assert.equal((await f.record({ ...person, addToClass: true })).code, 'outside_school')
  assert.equal((await f.record({ ...person, linkToSchool: true })).code, 'not_enrolled')
  assert.equal(f.writes(), 0)
  const result = await f.record({ ...person, linkToSchool: true, addToClass: true })
  assert.equal(result.code, 'ok')
  assert.equal(f.writes(), 4)
  assert.deepEqual(f.data.get('schoolClassOccurrences/class').studentIds, [
    'student',
    'school_outside',
  ])
  assert.equal(f.data.get('schoolStudents/school_outside').studentUserId, 'outside')
  assert.equal(
    [...f.data.keys()].some((key) => /^(schoolMemberships|users)\//.test(key)),
    false
  )
})

test('additional outside profile links guardian only and enrollment remains pending', async () => {
  const f = fixture([exampleClass({ status: 'pending' })])
  f.data.set('additionalProfiles/child', { ownerId: 'guardian' })
  const result = await f.record({
    student: null,
    profile: { ...outsider, profileType: 'additional', profileId: 'child' },
    linkToSchool: true,
    addToClass: true,
  })
  assert.equal(result.code, 'ok')
  assert.equal(f.data.get('schoolClassOccurrences/class').status, 'pending')
  assert.deepEqual(f.data.get('schoolStudents/school_child').guardianIds, ['guardian'])
  assert.equal(f.data.get('schoolStudents/school_child').additionalProfileId, 'child')
  assert.equal(
    [...f.data.keys()].some((key) => key.startsWith('schoolMemberships/')),
    false
  )
})

test('particular promotion needs explicit director authorization', async () => {
  const f = fixture([exampleClass({ type: 'individual' })])
  const newStudent = { ...student, id: 'second' }
  f.data.set('schoolStudents/second', newStudent)
  assert.equal((await f.record({ student: newStudent, addToClass: true })).code, 'promote_required')
  assert.equal(
    (await f.record({ student: newStudent, addToClass: true, promoteToGroup: true })).code,
    'promotion_denied'
  )
  assert.equal(f.writes(), 0)
  assert.equal(
    (
      await f.record({
        student: newStudent,
        addToClass: true,
        promoteToGroup: true,
        director: true,
      })
    ).code,
    'ok'
  )
  assert.equal(f.data.get('schoolClassOccurrences/class').type, 'group')
})

test('closed cup rejects newcomers; enrolled students can still check in', async () => {
  const f = fixture([exampleClass({ classFull: true })])
  const extra = { ...student, id: 'second' }
  f.data.set('schoolStudents/second', extra)
  assert.equal((await f.record({ student: extra, addToClass: true })).code, 'full')
  assert.equal(f.writes(), 0)
  assert.equal((await f.record()).code, 'ok')
})

test('blocked or cancelled classes cannot record attendance', async () => {
  const f = fixture()
  f.data.set('coachScheduleBlocks/block', {
    schoolId: 'school',
    coachId: 'teacher',
    date: '2026-10-08',
    startTime: '18:30',
    endTime: '19:30',
  })
  assert.equal((await f.record()).code, 'blocked')
  assert.equal(f.writes(), 0)
  const cancelled = fixture([exampleClass({ status: 'cancelled' })])
  assert.equal((await cancelled.record()).code, 'cancelled')
  assert.equal(cancelled.writes(), 0)
})

test('coalesced class records original pending participant source and note', async () => {
  const f = fixture([
    exampleClass({ studentIds: [] }),
    exampleClass({ id: 'pending-source', status: 'pending' }),
  ])
  f.data.set('agendaStudentRecords/class-pending-source-student', { note: 'Nota pendiente' })
  const result = await f.record()
  assert.equal(result.record.occurrenceId, 'pending-source')
  assert.equal(f.data.get('schoolClassOccurrences/pending-source').status, 'pending')
  assert.equal(
    f.data.get('agendaStudentRecords/class-pending-source-student').note,
    'Nota pendiente'
  )
})

test('candidate projection excludes private QR tokens and rejects malformed QR', async () => {
  const f = fixture()
  const candidate = await f.api.attendanceCandidate(student, exampleClass(), new Set())
  assert.equal(candidate.numericId, '000123')
  assert.equal('qrToken' in candidate, false)
  assert.equal(
    await f.api.resolveAttendancePerson('school', { qrValue: 'https://fake.example/credential' }),
    null
  )
  assert.equal(
    (await f.api.resolveAttendancePerson('school', { numericId: '004321' })).profile.name,
    'Extra'
  )
})

test('API rejects unauthorized teachers before global identity lookup or writes', async () => {
  const f = fixture()
  const route = f.route({
    caller: { uid: 'other-teacher' },
    membership: { roles: ['teacher'] },
    globalAdmin: false,
  })
  const response = await route.POST(
    new Request('https://app.test/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occurrenceId: 'class', method: 'id', numericId: '004321' }),
    }),
    { params: Promise.resolve({ schoolId: 'school' }) }
  )
  assert.equal(response.status, 403)
  assert.equal(response.body.code, 'unauthorized')
  assert.equal(f.writes(), 0)
})

test('API numeric and QR search project safe fields, never credential token', async () => {
  const f = fixture()
  const route = f.route({
    caller: { uid: 'teacher' },
    membership: { roles: ['teacher'] },
    globalAdmin: false,
  })
  for (const [mode, query] of [
    ['id', '004321'],
    ['qr', identityHelpers.credentialQrValue(outsider.qrToken)],
  ]) {
    const response = await route.GET(
      new Request(
        `https://app.test/api/attendance?occurrenceId=class&mode=${mode}&query=${encodeURIComponent(query)}`
      ),
      { params: Promise.resolve({ schoolId: 'school' }) }
    )
    assert.equal(response.status, 200)
    assert.equal(response.body.candidates[0].numericId, '004321')
    assert.equal(response.body.candidates[0].inSchool, false)
    assert.equal(JSON.stringify(response.body).includes(outsider.qrToken), false)
    assert.equal(response.headers['Cache-Control'], 'private, no-store')
  }
})

test('coalesced roster includes original attendance and individual pending status', async () => {
  const f = fixture([
    exampleClass({ studentIds: [] }),
    exampleClass({ id: 'pending-source', status: 'pending' }),
  ])
  await f.record()
  const merged = {
    ...exampleClass(),
    sourceOccurrenceIds: ['class', 'pending-source'],
    pendingStudentIds: ['student'],
  }
  const result = await f.api.listAttendanceRoster('school', merged)
  assert.equal(result.records.length, 1)
  assert.equal(result.roster[0].attended, true)
  assert.equal(result.roster[0].pending, true)
  assert.equal(
    (await f.api.attendanceCandidate(student, { ...merged, pendingStudentIds: [] }, new Set()))
      .pending,
    false
  )
})

function publish(f) {
  f.data.set('schoolMemberships/school_teacher', {
    schoolId: 'school',
    userId: 'teacher',
    status: 'active',
    roles: ['teacher'],
  })
  f.data.set('schoolCoachOfferings/school_teacher', {
    classOfferings: [
      {
        id: 'offering',
        mode: 'fixed',
        placeName: 'Alberca',
        groupType: 'grupal',
        maxPeople: 3,
        schedules: [
          {
            id: 'schedule',
            startTime: '18:00',
            endTime: '19:00',
            days: ['Jue'],
            availabilityMode: 'dates',
            availableDates: ['2026-10-08'],
          },
        ],
      },
    ],
  })
}

test('empty published hour materializes atomically with enrollment and attendance', async () => {
  const f = fixture([])
  publish(f)
  const classes = await f.api.attendanceClasses('school', '2026-10-08', 'teacher')
  assert.equal(classes.length, 1)
  const virtualOccurrence = classes[0]
  assert.equal(virtualOccurrence.attendanceVirtual, true)
  const result = await f.record({
    occurrenceId: virtualOccurrence.id,
    virtualOccurrence,
    addToClass: true,
  })
  assert.equal(result.code, 'ok')
  assert.equal(f.writes(), 3)
  const stored = f.data.get(`schoolClassOccurrences/${virtualOccurrence.id}`)
  assert.deepEqual(stored.studentIds, ['student'])
  assert.equal(stored.type, 'group')
  assert.equal(stored.capacity, 3)
  assert.equal('attendanceVirtual' in stored, false)
  assert.equal('sourceCoachId' in stored, false)
  assert.equal(
    (await f.record({ occurrenceId: virtualOccurrence.id, virtualOccurrence, addToClass: true }))
      .alreadyRecorded,
    true
  )
  assert.equal(f.writes(), 3)
})

test('withdrawn published hour is revalidated in transaction and cannot materialize', async () => {
  const f = fixture([])
  publish(f)
  const [virtualOccurrence] = await f.api.attendanceClasses('school', '2026-10-08', 'teacher')
  f.data.set('schoolCoachOfferings/school_teacher', { classOfferings: [] })
  assert.equal(
    (await f.record({ occurrenceId: virtualOccurrence.id, virtualOccurrence, addToClass: true }))
      .code,
    'missing_class'
  )
  assert.equal(f.writes(), 0)
  assert.equal((await f.record({ occurrenceId: 'nonexistent' })).code, 'missing_class')
})

test('new overlapping occurrence or block prevents stale virtual materialization', async () => {
  for (const conflict of ['occurrence', 'block']) {
    const f = fixture([])
    publish(f)
    const [virtualOccurrence] = await f.api.attendanceClasses('school', '2026-10-08', 'teacher')
    if (conflict === 'occurrence')
      f.data.set('schoolClassOccurrences/conflict', exampleClass({ id: 'conflict' }))
    else
      f.data.set('coachScheduleBlocks/new', {
        schoolId: 'school',
        coachId: 'teacher',
        date: '2026-10-08',
        allDay: true,
      })
    const result = await f.record({
      occurrenceId: virtualOccurrence.id,
      virtualOccurrence,
      addToClass: true,
    })
    assert.equal(result.code, conflict === 'block' ? 'blocked' : 'missing_class')
    assert.equal(f.writes(), 0)
  }
})

test('legacy booking inserted after virtual listing prevents stale enrollment', async () => {
  const f = fixture([])
  publish(f)
  const [virtualOccurrence] = await f.api.attendanceClasses('school', '2026-10-08', 'teacher')
  f.data.set('bookings/late', {
    id: 'late',
    schoolId: 'school',
    coachId: 'teacher',
    date: '2026-10-08',
    startTime: '18:00',
    endTime: '19:00',
    status: 'confirmed',
    groupType: 'particular',
  })
  assert.equal(
    (await f.record({ occurrenceId: virtualOccurrence.id, virtualOccurrence, addToClass: true }))
      .code,
    'missing_class'
  )
  assert.equal(f.writes(), 0)
})

test('published numeric capacity rejects third athlete despite open classFull flag', async () => {
  const f = fixture([exampleClass({ studentIds: ['student', 'second'], classFull: false })])
  publish(f)
  const published = f.data.get('schoolCoachOfferings/school_teacher')
  published.classOfferings[0].maxPeople = 2
  f.data.set('schoolCoachOfferings/school_teacher', published)
  const third = { ...student, id: 'third' }
  f.data.set('schoolStudents/third', third)
  assert.equal((await f.record({ student: third, addToClass: true })).code, 'full')
  assert.equal(f.writes(), 0)
  assert.equal((await f.record()).code, 'ok')
})

test('API supports validated virtual hours and refuses forged virtual identifiers', async () => {
  const f = fixture([])
  publish(f)
  const [virtual] = await f.api.attendanceClasses('school', '2026-10-08', 'teacher')
  const route = f.route({
    caller: { uid: 'teacher' },
    membership: { roles: ['teacher'] },
    globalAdmin: false,
  })
  const props = { params: Promise.resolve({ schoolId: 'school' }) }
  const response = await route.GET(
    new Request(`https://app.test/api/attendance?occurrenceId=${encodeURIComponent(virtual.id)}`),
    props
  )
  assert.equal(response.status, 200)
  assert.equal(response.body.roster.length, 0)
  const submit = (occurrenceId) =>
    route.POST(
      new Request('https://app.test/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occurrenceId,
          method: 'name',
          studentId: 'student',
          addToClass: true,
        }),
      }),
      props
    )
  assert.equal((await submit('attendance:2026-10-08:00000000000000000000000000000000')).status, 403)
  assert.equal(f.writes(), 0)
  const saved = await submit(virtual.id)
  assert.equal(saved.status, 200)
  assert.equal(saved.body.ok, true)
  assert.equal(f.writes(), 3)
})
