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
