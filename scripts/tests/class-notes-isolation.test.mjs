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
      assert.ok(id in dependencies, `Unexpected dependency ${id}`)
      return dependencies[id]
    },
    module,
    module.exports
  )
  return module.exports
}

for (const scope of ['personal', 'school']) {
  test(`${scope} class notes isolate date, time, coach and school`, async () => {
    const documents = new Map()
    let coach = 'coach-a'
    const training = [
      {
        id: 'block',
        repetitions: 2,
        series: [
          {
            id: 'series',
            repetitions: 4,
            distanceMeters: 100,
            exercise: 'Crol',
            material: '',
            interval: '',
          },
        ],
      },
    ]
    const models = load('../../lib/class-training.ts', {})
    const route = load(
      scope === 'personal'
        ? '../../app/api/coach/class-notes/route.ts'
        : '../../app/api/schools/[schoolId]/class-notes/route.ts',
      {
        'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
        '@/lib/class-training': models,
        '@/lib/school': { schoolMembershipHasRole: () => true },
        '@/lib/server/personal-class-access': {
          requirePersonalCoach: async () => ({ uid: coach }),
        },
        '@/lib/server/school-access': {
          requireSchoolAccess: async () => ({ caller: { uid: coach }, globalAdmin: true }),
        },
        '@/lib/server/firebase-admin': {
          adminDb: {
            collection: (collection) => ({
              doc: (id) => ({
                get: async () => ({ data: () => documents.get(`${collection}/${id}`) }),
                set: async (data) => documents.set(`${collection}/${id}`, data),
              }),
            }),
          },
        },
      }
    )
    const props = (schoolId = 'school-a') => ({ params: Promise.resolve({ schoolId }) })
    const request = (date = '2026-10-10', time = '21:00', body) =>
      new Request(
        `http://localhost/api?date=${date}&time=${time}&coachId=${coach}`,
        body
          ? {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
            }
          : undefined
      )
    assert.equal(
      (
        await route.PUT(
          request(undefined, undefined, { note: 'Solo esta clase', training }),
          props()
        )
      ).status,
      200
    )
    assert.deepEqual(await (await route.GET(request(), props())).json(), {
      note: 'Solo esta clase',
      training,
    })
    for (const req of [request('2026-10-11'), request(undefined, '20:00')]) {
      assert.deepEqual(await (await route.GET(req, props())).json(), { note: '', training: [] })
    }
    coach = 'coach-b'
    assert.deepEqual(await (await route.GET(request(), props())).json(), { note: '', training: [] })
    coach = 'coach-a'
    if (scope === 'school')
      assert.deepEqual(await (await route.GET(request(), props('school-b'))).json(), {
        note: '',
        training: [],
      })
    await route.PUT(request('2026-10-11', undefined, { note: 'Otra clase', training: [] }), props())
    assert.deepEqual(await (await route.GET(request(), props())).json(), {
      note: 'Solo esta clase',
      training,
    })
  })
}
