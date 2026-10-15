import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

test('coordinators see agenda students across school coaches, with school isolation and deduplication', async () => {
  let director = true
  const filters = []
  const bookings = [
    {
      schoolId: 'school',
      coachId: 'teacher-a',
      source: 'coach',
      athleteId: 'manual:a',
      athleteName: 'Ana',
    },
    {
      schoolId: 'school',
      coachId: 'teacher-b',
      source: 'coach',
      athleteId: 'manual:b',
      athleteName: 'Bea',
      status: 'cancelled',
    },
    {
      schoolId: 'school',
      coachId: 'teacher-a',
      source: 'coach',
      athleteId: 'manual:a',
      athleteName: 'Ana',
    },
    {
      schoolId: 'other',
      coachId: 'teacher-a',
      source: 'coach',
      athleteId: 'manual:c',
      athleteName: 'Otra',
    },
  ]
  const dependencies = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/school': {
      schoolMembershipHasRole: (_, role) => role === (director ? 'director' : 'teacher'),
    },
    '@/lib/server/school-access': {
      requireSchoolAccess: async () => ({ caller: { uid: 'teacher-a' }, membership: {} }),
    },
    '@/lib/server/school-students': { listSchoolStudents: async () => [] },
    '@/lib/server/school-classes': { listSchoolClasses: async () => [] },
    '@/lib/server/schools': { getSchoolById: async () => ({ timezone: 'UTC' }) },
    '@/lib/school-coach-students': { coachVisibleSchoolStudentIds: () => new Set() },
    '@/lib/server/firebase-admin': {
      adminDb: {
        collection: () => ({
          where: (field, _, value) => {
            filters.push([field, value])
            return {
              get: async () => ({
                docs: bookings.filter((b) => b[field] === value).map((b) => ({ data: () => b })),
              }),
            }
          },
        }),
      },
    },
  }
  const source = ts.transpileModule(
    readFileSync('app/api/schools/[schoolId]/students/route.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(
    (id) => dependencies[id] || {},
    module,
    module.exports
  )
  const load = (query) =>
    module.exports.GET(
      new Request(`http://localhost/students?includeAgendaStudents=true${query}`),
      { params: Promise.resolve({ schoolId: 'school' }) }
    )
  assert.deepEqual(
    (await (await load('')).json()).students.map((s) => s.id),
    ['manual:a', 'manual:b']
  )
  assert.deepEqual(filters.pop(), ['schoolId', 'school'])
  director = false
  assert.deepEqual(
    (await (await load('')).json()).students.map((s) => s.id),
    ['manual:a']
  )
  assert.equal((await load('&coachId=teacher-b')).status, 403)
})

test('teacher-created students belong to the school and are visible before their first class', async () => {
  let role = 'teacher'
  const roster = []
  const dependencies = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/additional-profile': { validProfileBirthDate: () => true },
    '@/lib/school': { schoolMembershipHasRole: (_, requested) => requested === role },
    '@/lib/server/school-access': {
      requireSchoolAccess: async (_, __, roles) =>
        roles.includes(role)
          ? { caller: { uid: 'teacher-a' }, membership: {} }
          : { response: Response.json({}, { status: 403 }) },
    },
    '@/lib/server/school-students': {
      createSchoolStudent: async (args) => {
        const student = { ...args, id: 'new-student' }
        roster.push(student)
        return student
      },
      listSchoolStudents: async (schoolId) =>
        roster.filter((student) => student.schoolId === schoolId),
    },
    '@/lib/server/school-student-summary': {
      getSchoolStudentSummaries: async () => ({
        'new-student': { related: false, taken: 0, scheduled: 0 },
      }),
    },
    '@/lib/server/school-classes': { listSchoolClasses: async () => [] },
    '@/lib/server/schools': { getSchoolById: async () => null },
    '@/lib/school-coach-students': { coachVisibleSchoolStudentIds: () => new Set() },
  }
  const module = { exports: {} }
  const source = ts.transpileModule(
    readFileSync('app/api/schools/[schoolId]/students/route.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText
  new Function('require', 'module', 'exports', source)(
    (id) => dependencies[id] || {},
    module,
    module.exports
  )
  const params = (schoolId) => ({ params: Promise.resolve({ schoolId }) })
  const response = await module.exports.POST(
    new Request('http://localhost/students', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ana', birthDate: '2010-01-01', gender: 'femenil' }),
    }),
    params('school')
  )
  assert.equal(response.status, 201)
  assert.equal(roster[0].schoolId, 'school')
  assert.equal(roster[0].createdBy, 'teacher-a')
  assert.equal(roster[0].guardianId, undefined)
  for (const query of ['', '?includeSummary=true&coachOnly=true']) {
    const result = await module.exports.GET(
      new Request(`http://localhost/students${query}`),
      params('school')
    )
    assert.equal((await result.json()).students[0].id, 'new-student')
  }
  role = 'director'
  assert.equal(
    (
      await (
        await module.exports.GET(new Request('http://localhost/students'), params('school'))
      ).json()
    ).students[0].id,
    'new-student'
  )
  assert.deepEqual(
    (
      await (
        await module.exports.GET(new Request('http://localhost/students'), params('other'))
      ).json()
    ).students,
    []
  )
  role = 'student'
  assert.equal(
    (
      await module.exports.POST(
        new Request('http://localhost/students', {
          method: 'POST',
          body: JSON.stringify({ name: 'Ana', birthDate: '2010-01-01', gender: 'femenil' }),
        }),
        params('school')
      )
    ).status,
    400
  )
})
