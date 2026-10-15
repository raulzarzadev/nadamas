import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

test('legacy agenda students are restored once with their original id and school isolation', async () => {
  const saved = new Map()
  let writes = 0
  const ref = (id) => ({
    id,
    get: async () => ({ exists: saved.has(id), id, data: () => saved.get(id) }),
  })
  const bookings = [
    { schoolId: 'school', source: 'coach', athleteId: 'agenda_justi', athleteName: 'Justi' },
    {
      schoolId: 'school',
      source: 'coach',
      athleteId: 'manual:adri',
      athleteName: 'Adri',
      athleteEmail: 'adri@example.com',
      createdAt: 10,
    },
    { schoolId: 'other', source: 'coach', athleteId: 'manual:other', athleteName: 'Other' },
  ]
  const db = {
    collection: () => ({
      doc: ref,
      where: (_, __, schoolId) => ({
        get: async () => ({
          docs: bookings.filter((b) => b.schoolId === schoolId).map((b) => ({ data: () => b })),
        }),
      }),
    }),
    runTransaction: async (fn) =>
      fn({
        get: (r) => r.get(),
        set: (r, data) => {
          saved.set(r.id, data)
          writes++
        },
      }),
  }
  const module = { exports: {} }
  const source = ts.transpileModule(readFileSync('lib/server/school-students.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  new Function('require', 'module', 'exports', source)(
    (id) => (id === './firebase-admin' ? { adminDb: db } : {}),
    module,
    module.exports
  )
  const restore = module.exports.getOrRestoreSchoolAgendaStudent
  assert.equal(await restore('school', 'manual:other'), null)
  assert.equal(await restore('school', 'unknown'), null)
  const student = await restore('school', 'manual:adri')
  assert.equal(student.id, 'manual:adri')
  assert.equal(student.schoolId, 'school')
  assert.equal(student.studentEmail, 'adri@example.com')
  assert.equal(student.createdAt, 10)
  assert.deepEqual(await restore('school', 'manual:adri'), student)
  assert.equal(writes, 1)
  assert.equal(await restore('other', 'manual:adri'), null)
  assert.equal(writes, 1)
  assert.equal((await restore('school', 'agenda_justi')).name, 'Justi')
  assert.equal(writes, 2)
  assert.equal((await restore('school', 'agenda_justi')).id, 'agenda_justi')
  assert.equal(writes, 2)
})
