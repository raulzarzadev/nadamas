import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

test('school profile edits validate fields, isolate schools, and update only linked bookings', async () => {
  let allowed = true
  let schoolId = 'school'
  const updates = []
  const source = ts.transpileModule(
    readFileSync('app/api/schools/[schoolId]/students/[studentId]/route.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText
  const dependencies = {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/server/school-access': {
      requireSchoolAccess: async () =>
        allowed ? {} : { response: Response.json({}, { status: 403 }) },
    },
    '@/lib/server/school-students': { getOrRestoreSchoolAgendaStudent: async () => null },
    '@/lib/server/school-agenda-updates': { withSchoolAgendaUpdate: (handler) => handler },
    '@/lib/server/firebase-admin': {
      adminDb: {
        collection(_name) {
          return {
            doc: (id) => ({
              get: async () => ({
                exists: true,
                id,
                data: () => ({ schoolId, name: 'Antes', studentUserId: 'linked' }),
              }),
              update: async (value) => updates.push(value),
            }),
            where: () => ({
              get: async () => ({
                docs: [
                  { ref: 'own', data: () => ({ athleteId: 'linked' }) },
                  { ref: 'other', data: () => ({ athleteId: 'unrelated' }) },
                ],
              }),
            }),
          }
        },
        batch: () => ({
          update: (ref, value) => updates.push({ ref, ...value }),
          commit: async () => {},
        }),
      },
    },
  }
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(
    (id) => {
      assert.ok(id in dependencies, id)
      return dependencies[id]
    },
    module,
    module.exports
  )
  const edit = (body) =>
    module.exports.PATCH(
      new Request('http://localhost/profile', { method: 'PATCH', body: JSON.stringify(body) }),
      { params: Promise.resolve({ schoolId: 'school', studentId: 'student' }) }
    )
  allowed = false
  assert.equal((await edit({ name: 'Ana' })).status, 403)
  allowed = true
  schoolId = 'other'
  assert.equal((await edit({ name: 'Ana' })).status, 404)
  schoolId = 'school'
  assert.equal((await edit({ name: 'Ana', birthDate: '2026-02-31' })).status, 400)
  assert.equal((await edit({ name: 'Ana', studentEmail: 'invalid' })).status, 400)
  assert.equal(updates.length, 0)
  const response = await edit({
    name: 'Ana Sofía',
    gender: 'femenil',
    roles: { admin: true },
    schoolId: 'other',
    guardianIds: ['intruder'],
  })
  assert.equal(response.status, 200)
  assert.equal(updates[0].name, 'Ana Sofía')
  assert.equal(updates[0].roles, undefined)
  assert.equal(updates[0].schoolId, undefined)
  assert.equal(updates[0].guardianIds, undefined)
  assert.equal(updates[1].ref, 'own')
  assert.equal(updates.length, 2)
})
