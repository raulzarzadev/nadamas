import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

function load(file, dependencies) {
  const module = { exports: {} }
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  new Function('require', 'module', 'exports', code)(
    (id) => {
      if (!(id in dependencies)) throw new Error(`Unexpected dependency ${id}`)
      return dependencies[id]
    },
    module,
    module.exports
  )
  return module.exports
}
const next = {
  'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
}
test('personal attendance isolates school bookings, resolves own roster and uses canonical attendance/payment mutation', async () => {
  const rows = [
    {
      id: 'own',
      coachId: 'coach',
      athleteId: 'athlete',
      athleteName: 'Ana',
      status: 'confirmed',
      date: '2026-10-10',
      startTime: '21:00',
      endTime: '22:00',
      groupType: 'grupal',
    },
    {
      id: 'pending',
      coachId: 'coach',
      athleteId: 'pending',
      athleteName: 'Pendiente',
      status: 'pending',
      date: '2026-10-10',
      startTime: '21:00',
      endTime: '22:00',
      groupType: 'grupal',
    },
    {
      id: 'school',
      coachId: 'coach',
      athleteId: 'athlete',
      schoolId: 's',
      status: 'confirmed',
      date: '2026-10-10',
      startTime: '21:00',
      groupType: 'grupal',
    },
    {
      id: 'foreign',
      coachId: 'other',
      athleteId: 'athlete',
      status: 'confirmed',
      date: '2026-10-10',
      startTime: '21:00',
      groupType: 'grupal',
    },
  ]
  let allowed = true,
    writes = []
  const db = {
    collection(name) {
      return {
        where(field, op, value) {
          assert.equal(op, '==')
          return {
            get: async () => ({
              docs: (name === 'bookings' ? rows : [])
                .filter((row) => row[field] === value)
                .map((row) => ({ id: row.id, data: () => row })),
            }),
          }
        },
      }
    },
  }
  const routes = load('../../app/api/coach/attendance/route.ts', {
    ...next,
    '@/lib/athlete-identity': { parseCredentialQr: () => null },
    '@/lib/school': { schoolMembershipHasRole: () => false },
    '@/lib/server/school-access': {
      requireSchoolAccess: async () =>
        allowed
          ? { caller: { uid: 'coach' }, membership: {}, globalAdmin: false }
          : { response: Response.json({}, { status: 403 }) },
    },
    '@/lib/server/athlete-identities': {
      ensureAthleteIdentity: async () => ({ numericId: '123456' }),
      findAthleteIdentity: async () => null,
    },
    '@/lib/server/firebase-admin': { adminDb: db },
    '@/lib/server/personal-class-access': {
      requirePersonalCoach: async () =>
        allowed
          ? { uid: 'coach', user: { name: 'Coach' } }
          : { response: Response.json({}, { status: 403 }) },
    },
    '../agenda/bookings/route': {
      PATCH: async (request) => {
        writes.push(await request.json())
        return Response.json({ ok: true })
      },
    },
  })
  const get = (suffix) => routes.GET(new Request(`http://localhost/api/coach/attendance?${suffix}`))
  const post = (data) =>
    routes.POST(
      new Request('http://localhost/api/coach/attendance', {
        method: 'POST',
        headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
    )
  const id = '2026-10-10|21:00|grupal'
  const payload = await (await get(`occurrenceId=${encodeURIComponent(id)}`)).json()
  assert.deepEqual(
    payload.roster.map((person) => person.studentId),
    ['own', 'pending']
  )
  assert.equal((await post({ occurrenceId: id, studentId: 'school' })).status, 409)
  assert.equal((await post({ occurrenceId: id, studentId: 'foreign' })).status, 409)
  assert.equal((await post({ occurrenceId: id, studentId: 'pending' })).status, 409)
  assert.equal((await post({ occurrenceId: id, studentId: 'own' })).status, 200)
  assert.deepEqual(writes, [{ id: 'own', attended: true }])
  rows[0].attended = true
  assert.equal(
    (await (await post({ occurrenceId: id, studentId: 'own' })).json()).alreadyRecorded,
    true
  )
  assert.equal(writes.length, 1)
  assert.equal((await post({ occurrenceId: id, studentId: 'own', attended: false })).status, 200)
  assert.deepEqual(writes.at(-1), { id: 'own', attended: false })
  rows[0].attended = false
  assert.equal(
    (await (await post({ occurrenceId: id, studentId: 'own', attended: false })).json())
      .alreadyRecorded,
    true
  )
  assert.equal(writes.length, 2)
  const schoolPayload = await (
    await get(`schoolId=s&coachId=coach&occurrenceId=${encodeURIComponent(id)}`)
  ).json()
  assert.deepEqual(
    schoolPayload.roster.map((person) => person.studentId),
    ['school']
  )
  assert.equal((await get('schoolId=s&coachId=other&date=2026-10-10')).status, 403)
  const schoolPost = await routes.POST(
    new Request('http://localhost/api/coach/attendance?schoolId=s&coachId=coach', {
      method: 'POST',
      headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: JSON.stringify({ occurrenceId: id, studentId: 'school', method: 'name' }),
    })
  )
  assert.equal(schoolPost.status, 200)
  assert.deepEqual(writes.at(-1), { id: 'school', attended: true, schoolId: 's', coachId: 'coach' })
  allowed = false
  assert.equal((await get('date=2026-10-10')).status, 403)
  assert.equal((await post({ occurrenceId: id, studentId: 'own' })).status, 403)
})
