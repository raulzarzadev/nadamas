import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const load = (path, imports = {}) => {
  const exports = {}
  new Function(
    'exports',
    'require',
    ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
  )(exports, (name) => {
    if (!(name in imports)) throw new Error(name)
    return imports[name]
  })
  return exports
}
const model = load('lib/class-training.ts')
const {
  exportWorkoutText,
  importWorkoutText,
  WORKOUT_TEXT_HEADER,
  LEGACY_WORKOUT_TEXT_HEADER,
  WORKOUT_IMPORT_ERROR,
  WORKOUT_TEXT_LIMIT,
} = load('lib/workout-transfer.ts', { './class-training': model })
const source = {
  id: 'original',
  title: 'Técnica y resistencia',
  observations: 'Primera línea\nSegunda línea',
  blocks: [
    {
      id: 'block-original',
      title: 'Calentamiento',
      observations: 'Suave',
      repetitions: 2,
      series: [
        {
          id: 'series-original',
          repetitions: 4,
          distanceMeters: 50,
          exercise: 'Crol',
          material: 'Tabla',
          interval: '1:30',
        },
        {
          id: 'pause-original',
          kind: 'pause',
          repetitions: 1,
          distanceMeters: null,
          exercise: 'Pausa',
          interval: '0:30',
        },
      ],
    },
    { id: 'empty-block', title: 'Para completar', observations: '', repetitions: 1, series: [] },
  ],
}
let counter = 0
const id = () => `copy-${++counter}`
const encode = (data) => `${LEGACY_WORKOUT_TEXT_HEADER}\n${JSON.stringify(data)}`
const payload = () => structuredClone(source)

test('export/import preserves the whole workout including pauses, notes and empty blocks with new IDs', () => {
  const text = exportWorkoutText(source)
  assert.ok(text.startsWith(`${WORKOUT_TEXT_HEADER}\n`))
  assert.ok(!text.includes('block-original'))
  const imported = importWorkoutText(text, id)
  assert.notEqual(imported.id, source.id)
  assert.notEqual(imported.blocks[0].id, source.blocks[0].id)
  assert.notEqual(imported.blocks[0].series[0].id, source.blocks[0].series[0].id)
  assert.equal(exportWorkoutText(imported), text)
  assert.equal(imported.blocks[1].series.length, 0)
  assert.equal(imported.blocks[0].series[1].kind, 'pause')
  assert.equal(imported.observations, source.observations)
  const second = importWorkoutText(text, id)
  assert.notEqual(second.id, imported.id)
})
test('pasted CRLF, leading BOM and whitespace are accepted', () => {
  assert.equal(
    importWorkoutText(`\uFEFF  ${exportWorkoutText(source).replaceAll('\n', '\r\n')}\n `, id).title,
    source.title
  )
})
test('foreign ownership fields and unknown properties are not imported', () => {
  const data = payload()
  data.userId = 'someone-else'
  data.schoolId = 'private'
  data.blocks[0].dangerous = true
  const imported = importWorkoutText(encode(data), id)
  assert.equal('userId' in imported, false)
  assert.equal('schoolId' in imported, false)
  assert.equal('dangerous' in imported.blocks[0], false)
})
test('invalid text and unsupported formats return a calm error', () => {
  for (const text of [
    '',
    'some text',
    `${WORKOUT_TEXT_HEADER}\n{`,
    'NADAMAS_ENTRENO_V2\n{}',
    encode(null),
    encode({ blocks: [] }),
    'a'.repeat(WORKOUT_TEXT_LIMIT + 1),
  ]) {
    assert.throws(() => importWorkoutText(text, id), { message: WORKOUT_IMPORT_ERROR })
  }
})
test('invalid series, pauses, repetitions and field limits are rejected', () => {
  const invalid = [
    (data) => {
      data.title = 'x'.repeat(101)
    },
    (data) => {
      data.observations = 'x'.repeat(2001)
    },
    (data) => {
      data.blocks[0].repetitions = 0
    },
    (data) => {
      data.blocks[0].series[0].distanceMeters = -1
    },
    (data) => {
      data.blocks[0].series[1].interval = '0:00'
    },
    (data) => {
      data.blocks[0].series[1].interval = '0:99'
    },
    (data) => {
      data.blocks[0].series[0].exercise = 'x'.repeat(201)
    },
    (data) => {
      data.blocks[0].series = null
    },
    (data) => {
      data.blocks = Array.from({ length: 21 }, () => data.blocks[0])
    },
    (data) => {
      data.blocks[1].title = 'x'.repeat(61)
    },
  ]
  for (const change of invalid) {
    const data = payload()
    change(data)
    assert.throws(() => importWorkoutText(encode(data), id), { message: WORKOUT_IMPORT_ERROR })
  }
})
test('workouts without blocks remain valid drafts', () => {
  const imported = importWorkoutText(exportWorkoutText({ id: 'empty', blocks: [] }), id)
  assert.deepEqual(imported.blocks, [])
})

test('export is a readable sheet without JSON braces, object keys or internal IDs', () => {
  const text = exportWorkoutText(source)
  assert.ok(text.includes('Título: Técnica y resistencia'))
  assert.ok(text.includes('Bloque 1: Calentamiento\nRepetir: 2 veces'))
  assert.ok(text.includes('  - 4 × 50 m | Técnica: Crol | Material: Tabla | Cada: 1:30'))
  assert.ok(text.includes('  - Pausa: 0:30'))
  assert.ok(text.endsWith('FIN DEL ENTRENO'))
  assert.ok(!text.includes('"repetitions"'))
  assert.ok(!text.includes('{'))
})
test('a manually written sheet can be read and imported', () => {
  const text = `${WORKOUT_TEXT_HEADER}

Título: Fondo
Observaciones:
  Nadar suave.

Bloque 1: Principal
Repetir: 3 veces
Series:
  - 2 x 200 m | Técnica: Crol | Cada: 4:00
  - Pausa: 1:00

FIN DEL ENTRENO`
  const imported = importWorkoutText(text, id)
  assert.equal(imported.title, 'Fondo')
  assert.equal(imported.blocks[0].repetitions, 3)
  assert.equal(imported.blocks[0].series[0].distanceMeters, 200)
  assert.equal(imported.blocks[0].series[1].kind, 'pause')
})
test('multiline observations and escaped delimiters remain attached to their correct fields', () => {
  const tricky = structuredClone(source)
  tricky.title = 'Sesión | especial: técnica'
  tricky.observations = 'Indicaciones:\nBloque 1: no es un bloque\n\nFIN DEL ENTRENO'
  tricky.blocks[0].observations = 'Series:\n  conservar sangría\nC:\\entreno'
  tricky.blocks[0].series[0].exercise = 'Crol | Espalda\nCon técnica'
  tricky.blocks[0].series[0].material = 'Tabla \\ Pull | Aletas'
  const imported = importWorkoutText(exportWorkoutText(tricky), id)
  assert.equal(imported.title, tricky.title)
  assert.equal(imported.observations, tricky.observations)
  assert.equal(imported.blocks[0].observations, tricky.blocks[0].observations)
  assert.equal(imported.blocks[0].series[0].exercise, tricky.blocks[0].series[0].exercise)
  assert.equal(imported.blocks[0].series[0].material, tricky.blocks[0].series[0].material)
})
test('older JSON exports remain importable', () => {
  const imported = importWorkoutText(encode(payload()), id)
  assert.equal(imported.title, source.title)
  assert.equal(imported.blocks[0].series[1].kind, 'pause')
  assert.equal(imported.blocks[1].series.length, 0)
})
test('incomplete sheets and conflicting fields are rejected rather than silently dropping data', () => {
  const text = exportWorkoutText(source)
  for (const invalid of [
    text.replace('FIN DEL ENTRENO', ''),
    text.replace('Bloque 2:', 'Bloque 9:'),
    text.replace('Cada: 1:30', 'Cada: 1:30 | Cada: 2:00'),
    text.replace('4 × 50 m', '-4 × 50 m'),
    `${text}\nunexpected`,
    text.replace('Pausa: 0:30', 'Pausa: 0:00'),
  ]) {
    assert.throws(() => importWorkoutText(invalid, id), { message: WORKOUT_IMPORT_ERROR })
  }
})
