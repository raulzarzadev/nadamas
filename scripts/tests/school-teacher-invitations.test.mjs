import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, dependencies) {
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(
    (id) => (id in dependencies ? dependencies[id] : require(id)),
    module,
    module.exports
  )
  return module.exports
}

test('school teacher invitations accept own agenda students and reject unrelated bookings', async () => {
  let booking = {
    schoolId: 'school',
    coachId: 'teacher',
    athleteId: 'student',
    status: 'confirmed',
  }
  let sent = 0
  let updates = 0
  const route = load('app/api/coach/athlete-invitations/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/coach-student-progress': {},
    '@/lib/server/school-students': {
      getOrRestoreSchoolAgendaStudent: async () => ({
        id: 'student',
        schoolId: 'school',
        name: 'Ana',
      }),
    },
    '@/lib/school': { schoolMembershipHasRole: () => false },
    '@/lib/school-student-history': load('lib/school-student-history.ts', {}),
    '@/lib/server/athlete-profile-invitations': {
      createProfileInvitation: async () => ({ token: 'token', ref: { update: async () => {} } }),
    },
    '@/lib/server/emails': {
      sendAthleteProfileInvitationEmail: async () => {
        sent++
        return {}
      },
    },
    '@/lib/server/personal-class-access': {},
    '@/lib/server/school-access': {
      requireSchoolAccess: async () => ({ caller: { uid: 'teacher' }, membership: {} }),
    },
    '@/lib/server/firebase-admin': {
      adminDb: {
        collection: (name) => ({
          doc: () => ({
            update: async () => {
              updates++
            },
            get: async () => ({
              data: () => ({ schoolId: 'school', name: 'Ana' }),
              ref: {
                update: async () => {
                  updates++
                },
              },
            }),
          }),
          where: () => ({
            get: async () => ({ docs: name === 'bookings' ? [{ data: () => booking }] : [] }),
          }),
        }),
      },
    },
  })
  const invite = () =>
    route.POST(
      new Request('http://localhost/invitations', {
        method: 'POST',
        body: JSON.stringify({
          schoolId: 'school',
          studentId: 'student',
          email: 'ana@example.com',
        }),
      })
    )
  assert.equal((await invite()).status, 200)
  assert.equal(sent, 1)
  assert.equal(updates, 1)
  for (const changes of [
    { schoolId: 'other' },
    { coachId: 'other' },
    { athleteId: 'other' },
    { status: 'cancelled' },
  ]) {
    const original = booking
    booking = { ...original, ...changes }
    assert.equal((await invite()).status, 403)
    booking = original
  }
  assert.equal(sent, 1)
  assert.equal(updates, 1)
})
