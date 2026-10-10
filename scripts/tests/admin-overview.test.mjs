import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

function load(file, dependencies = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'module', 'exports', code)(
    (id) => {
      if (id === 'server-only') return {}
      if (!(id in dependencies)) throw new Error(`Unexpected dependency ${id}`)
      return dependencies[id]
    },
    module,
    module.exports
  )
  return module.exports
}
const roles = load('../../lib/roles.ts')
const school = load('../../lib/school.ts')

function fixture() {
  const rows = {
    users: [
      {
        id: 'owner',
        displayName: 'Coordinador',
        email: 'owner@test.com',
        roles: { admin: true, coach: false },
        phone: 'SECRET',
      },
      { id: 'teacher', name: 'Profesor de escuela', roles: { coach: false } },
      { id: 'coach', name: 'Coach independiente', isCoach: true },
      { id: 'athlete', name: 'Atleta', roles: { coach: false }, isCoach: true },
      { id: 'suspended', name: 'Suspendido', roles: {} },
      { id: 'legacy', name: 'Dueño legacy', roles: {} },
    ],
    schools: [
      { id: 's1', name: 'Escuela Uno', directorId: 'owner', slug: 'uno', isPublic: true },
      { id: 's2', name: 'Escuela Dos', directorId: 'legacy', slug: 'dos', isPublic: false },
      { id: 's3', name: 'Escuela Tres', directorId: 'suspended' },
    ],
    schoolMemberships: [
      {
        id: 'm1',
        schoolId: 's1',
        userId: 'owner',
        roles: ['director', 'teacher'],
        role: 'director',
        status: 'active',
      },
      { id: 'm2', schoolId: 's1', userId: 'teacher', role: 'teacher', status: 'active' },
      { id: 'm3', schoolId: 's2', userId: 'teacher', roles: ['teacher'], status: 'active' },
      { id: 'm4', schoolId: 's1', userId: 'athlete', role: 'student', status: 'active' },
      { id: 'm5', schoolId: 's3', userId: 'suspended', role: 'director', status: 'suspended' },
      { id: 'm6', schoolId: 'missing', userId: 'suspended', role: 'director', status: 'active' },
      { id: 'm7', schoolId: 's1', userId: 'deleted-user', role: 'director', status: 'active' },
    ],
    additionalProfiles: [
      { id: 'p1', name: 'Perfil adicional', ownerId: 'athlete', birthDate: 'SECRET' },
    ],
    schoolStudents: [
      { id: 'enrollment1', schoolId: 's1', studentUserId: 'athlete', status: 'active' },
      { id: 'enrollment2', schoolId: 's1', studentUserId: 'athlete', status: 'active' },
      { id: 'enrollment3', schoolId: 's1', additionalProfileId: 'p1', status: 'active' },
      { id: 'enrollment4', schoolId: 's1', additionalProfileId: 'p1', status: 'active' },
      { id: 'inactive', schoolId: 's1', status: 'inactive' },
    ],
    coaches: [{ id: 'coach' }, { id: 'teacher' }],
    paymentProducts: [
      {
        id: 'pack',
        scope: 'school:s1',
        mode: 'classes',
        priceCents: 35000,
        classes: 1,
        active: true,
        name: 'Una clase',
      },
      {
        id: 'plan',
        scope: 'coach:coach',
        mode: 'period',
        priceCents: 50000,
        months: 1,
        perWeek: 2,
        active: false,
        name: 'Mensualidad',
      },
    ],
    bookings: [{ id: 'b' }],
    schoolClassOccurrences: [{ id: 'class1' }, { id: 'class2' }],
    schoolClassRequests: [{ id: 'r', status: 'pending' }],
    paymentOrders: [
      { id: 'o1', status: 'pending' },
      { id: 'o2', status: 'approved' },
      { id: 'o3', status: 'rejected' },
    ],
  }
  const calls = []
  const snapshot = (items) => ({
    size: items.length,
    docs: items.map((row) => ({
      id: row.id,
      data: () => row,
      ref: { collection: (name) => ({ doc: (id) => `${row.id}/${name}/${id}` }) },
    })),
  })
  const db = {
    collection(name) {
      let filters = [],
        projection
      const query = {
        select(...fields) {
          projection = fields
          return query
        },
        where(field, op, value) {
          assert.equal(op, '==')
          filters.push([field, value])
          return query
        },
        async get() {
          calls.push({ name, projection, filters })
          return snapshot(
            (rows[name] || [])
              .filter((row) => filters.every(([field, value]) => row[field] === value))
              .map((row) =>
                projection
                  ? {
                      id: row.id,
                      ...Object.fromEntries(
                        projection
                          .filter((field) => field in row)
                          .map((field) => [field, row[field]])
                      ),
                    }
                  : row
              )
          )
        },
        count() {
          return {
            get: async () => ({
              data: () => ({
                count: (rows[name] || []).filter((row) =>
                  filters.every(([field, value]) => row[field] === value)
                ).length,
              }),
            }),
          }
        },
      }
      return query
    },
    async getAll(...refs) {
      const mask = refs.pop()
      assert.deepEqual(mask, { fieldMask: ['identityVerification.status'] })
      calls.push({ privateRefs: refs })
      return refs.map((ref) => ({
        data: () => ({
          identityVerification: { status: ref.startsWith('coach/') ? 'pending' : 'verified' },
        }),
      }))
    },
  }
  return { db, calls, rows }
}

test('admin overview counts distinct active roles, deduplicates students and projects safe fields', async () => {
  const { db, calls } = fixture()
  const { getAdminOverview } = load('../../lib/server/admin-overview.ts', {
    './firebase-admin': { adminDb: db },
    '@/lib/roles': roles,
    '@/lib/school': school,
  })
  const data = await getAdminOverview()
  assert.equal(data.counts.users, 6)
  assert.equal(data.counts.athletes, 6)
  assert.equal(data.counts.coordinators, 2)
  assert.equal(data.counts.coaches, 3)
  assert.equal(data.counts.schools, 3)
  assert.equal(data.counts.additionalProfiles, 1)
  assert.equal(data.counts.activeProducts, 1)
  assert.equal(data.counts.pendingReviews, 1)
  assert.equal(data.counts.pendingPayments, 1)
  assert.equal(data.counts.approvedPayments, 1)
  assert.equal(data.counts.rejectedPayments, 1)
  assert.equal(data.schools.find((s) => s.id === 's1').students, 2)
  assert.equal(data.schools.find((s) => s.id === 's1').coaches, 2)
  assert.equal(data.schools.find((s) => s.id === 's3').coordinators.length, 0)
  assert.equal(data.people.find((p) => p.id === 'teacher').schools.length, 2)
  assert.equal(data.people.find((p) => p.id === 'athlete').roles.includes('coach'), false)
  assert.equal(data.people.find((p) => p.id === 'legacy').roles.includes('coordinator'), true)
  assert.equal(data.products.find((p) => p.id === 'plan').scopeName, 'Coach independiente')
  assert.equal(data.products.find((p) => p.id === 'plan').perWeek, 2)
  assert.equal(data.profiles[0].ownerName, 'Atleta')
  assert.ok(!JSON.stringify(data).includes('SECRET'))
  assert.equal(calls.filter((call) => call.privateRefs).length, 1)
  assert.equal(calls.filter((call) => call.name === 'users').length, 1)
})

test('admin activity counts confirmed attendance, separates additional profiles and deduplicates group teaching', async () => {
  const { db, rows } = fixture()
  rows.users[0].createdAt = 1000
  rows.users[0].updatedAt = { toMillis: () => 2000 }
  rows.bookings = [
    { id: 'b1', athleteId: 'athlete', athleteProfileId: 'athlete', coachId: 'coach', date: '2026-10-10', startTime: '10:00', status: 'confirmed', attended: true },
    { id: 'b2', athleteId: 'owner', coachId: 'coach', date: '2026-10-10', startTime: '10:00', status: 'confirmed', attended: true },
    { id: 'b3', athleteId: 'athlete', additionalProfileId: 'p1', coachId: 'coach', date: '2026-10-10', startTime: '11:00', status: 'confirmed', attended: true },
    { id: 'b4', athleteId: 'athlete', coachId: 'coach', status: 'cancelled', attended: true },
    { id: 'b5', athleteId: 'athlete', coachId: 'coach', status: 'confirmed', attended: false },
  ]
  const { getAdminOverview } = load('../../lib/server/admin-overview.ts', {
    './firebase-admin': { adminDb: db }, '@/lib/roles': roles, '@/lib/school': school,
  })
  const data = await getAdminOverview()
  assert.equal(data.people.find(p => p.id === 'athlete').classesTaken, 1)
  assert.equal(data.people.find(p => p.id === 'owner').classesTaken, 1)
  assert.equal(data.people.find(p => p.id === 'coach').classesGiven, 2)
  assert.equal(data.people.find(p => p.id === 'owner').createdAt, 1000)
  assert.equal(data.people.find(p => p.id === 'owner').updatedAt, 2000)
  assert.equal(data.people.find(p => p.id === 'athlete').createdAt, null)
})

test('admin overview requires an enabled admin and rejects missing, invalid and revoked sessions', async () => {
  let reads = 0,
    loads = 0,
    fail = false
  const { GET } = load('../../app/api/admin/overview/route.ts', {
    next: {},
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/analytics/server': { reportServerError: () => {} },
    '@/lib/server/admin-overview': {
      getAdminOverview: async () => {
        loads++
        if (fail) throw new Error('PRIVATE_DIAGNOSTIC')
        return { counts: { users: 1 } }
      },
    },
    '@/lib/server/firebase-admin': {
      adminAuth: {
        verifyIdToken: async (token, revoked) => {
          assert.equal(revoked, true)
          if (token === 'invalid') throw new Error('bad')
          return { uid: token }
        },
      },
      adminDb: {
        collection: () => ({
          doc: (uid) => ({
            get: async () => {
              reads++
              return {
                data: () => ({
                  roles: { admin: ['admin', 'disabled'].includes(uid) },
                  accountDisabled: uid === 'disabled',
                }),
              }
            },
          }),
        }),
      },
    },
    '@/lib/server/school-access': {
      getBearerToken: (request) => request.headers.get('authorization')?.replace('Bearer ', ''),
    },
  })
  const request = (token) =>
    new Request('http://localhost/api/admin/overview', {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
  assert.equal((await GET(request())).status, 401)
  assert.equal((await GET(request('invalid'))).status, 401)
  assert.equal(reads, 0)
  assert.equal((await GET(request('athlete'))).status, 403)
  assert.equal((await GET(request('disabled'))).status, 403)
  assert.equal(loads, 0)
  const response = await GET(request('admin'))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(loads, 1)
  fail = true
  const error = await GET(request('admin'))
  assert.equal(error.status, 500)
  assert.ok(!(await error.text()).includes('PRIVATE_DIAGNOSTIC'))
})
