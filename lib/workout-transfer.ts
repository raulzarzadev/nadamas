import { normalizeClassTraining } from './class-training'
import type { ObjectiveWorkout } from './training-planner'

export const WORKOUT_TEXT_HEADER = 'NADA MÁS · ENTRENO · v2'
export const LEGACY_WORKOUT_TEXT_HEADER = 'NADAMAS_ENTRENO_V1'
export const WORKOUT_TEXT_LIMIT = 1_000_000
export const WORKOUT_IMPORT_ERROR =
  'No pudimos reconocer el entreno. Pega el texto completo exportado desde Nada Más.'

type RecordValue = Record<string, unknown>
const record = (value: unknown): value is RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const failImport = (): never => {
  throw new Error(WORKOUT_IMPORT_ERROR)
}
const inline = (text: string) =>
  text
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\n')
    .replaceAll('\n', '\\n')
    .replaceAll('|', '\\|')
const readInline = (text: string) => {
  let result = ''
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== '\\') {
      result += text[index]
      continue
    }
    const escaped = text[++index]
    if (escaped === 'n') result += '\n'
    else if (escaped === '\\' || escaped === '|') result += escaped
    else return failImport()
  }
  return result
}
const splitFields = (text: string) => {
  const fields: string[] = []
  let current = ''
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '\\') {
      if (index + 1 >= text.length) return failImport()
      current += char + text[++index]
    } else if (char === '|') {
      fields.push(current.trim())
      current = ''
    } else current += char
  }
  fields.push(current.trim())
  return fields
}

/** A printable workout sheet; labels and indentation make it importable too. */
export function exportWorkoutText(workout: ObjectiveWorkout): string {
  const lines = [WORKOUT_TEXT_HEADER, '', `Título: ${inline(workout.title ?? '')}`]
  const notes = (text?: string) => {
    if (!text) return
    lines.push(
      'Observaciones:',
      ...text
        .replaceAll('\r\n', '\n')
        .split('\n')
        .map((line) => `  ${line}`)
    )
  }
  notes(workout.observations)
  for (const [index, block] of workout.blocks.entries()) {
    lines.push(
      '',
      `Bloque ${index + 1}: ${inline(block.title ?? '')}`,
      `Repetir: ${block.repetitions} ${block.repetitions === 1 ? 'vez' : 'veces'}`
    )
    notes(block.observations)
    lines.push('Series:')
    for (const series of block.series) {
      const fields =
        series.kind === 'pause'
          ? [`Pausa: ${inline(series.interval)}`]
          : [
              `${series.repetitions} ×${series.distanceMeters !== null ? ` ${series.distanceMeters} m` : ''}`,
            ]
      if (series.kind === 'pause' && series.repetitions !== 1)
        fields.push(`Repeticiones: ${series.repetitions}`)
      if (series.kind === 'pause' && series.distanceMeters !== null)
        fields.push(`Distancia: ${series.distanceMeters} m`)
      if (series.exercise && (series.kind !== 'pause' || series.exercise !== 'Pausa'))
        fields.push(`Técnica: ${inline(series.exercise)}`)
      // Preserve an explicitly empty pause description as well.
      if (series.kind === 'pause' && !series.exercise) fields.push('Técnica: ')
      if (series.material) fields.push(`Material: ${inline(series.material)}`)
      if (series.kind !== 'pause' && series.interval)
        fields.push(`Cada: ${inline(series.interval)}`)
      lines.push(`  - ${fields.join(' | ')}`)
    }
  }
  lines.push('', 'FIN DEL ENTRENO')
  return lines.join('\n')
}

function readWorkoutSheet(text: string): RecordValue {
  const lines = text.split('\n')
  let position = 1
  const skip = () => {
    while (position < lines.length && !lines[position].trim()) position++
  }
  const take = (prefix: string) => {
    skip()
    const line = lines[position++]
    if (!line?.startsWith(prefix)) return failImport()
    return readInline(line.slice(prefix.length).trim())
  }
  const notes = () => {
    skip()
    if (lines[position]?.trim() !== 'Observaciones:') return ''
    position++
    const text: string[] = []
    while (position < lines.length && lines[position].startsWith('  '))
      text.push(lines[position++].slice(2))
    if (!text.length) return failImport()
    return text.join('\n')
  }
  const data: RecordValue & { blocks: RecordValue[] } = {
    title: take('Título:'),
    observations: notes(),
    blocks: [],
  }
  skip()
  while (position < lines.length && lines[position].trim() !== 'FIN DEL ENTRENO') {
    const heading = lines[position++].match(/^Bloque (\d+):\s?(.*)$/)
    if (!heading || Number(heading[1]) !== data.blocks.length + 1 || data.blocks.length >= 20)
      return failImport()
    const repetition = take('Repetir:').match(/^(\d+) (?:vez|veces)$/)
    if (!repetition) return failImport()
    const block: RecordValue & { series: RecordValue[] } = {
      id: `block-${data.blocks.length}`,
      title: readInline(heading[2]),
      repetitions: Number(repetition[1]),
      observations: notes(),
      series: [],
    }
    if (take('Series:')) return failImport()
    while (position < lines.length && lines[position].startsWith('  - ')) {
      if (block.series.length >= 30) return failImport()
      const fields = splitFields(lines[position++].slice(4))
      const main = fields.shift() ?? ''
      const pause = main.startsWith('Pausa:')
      const series: RecordValue = {
        id: `series-${block.series.length}`,
        repetitions: 1,
        distanceMeters: null,
        exercise: pause ? 'Pausa' : '',
        material: '',
        interval: '',
      }
      if (pause) {
        series.kind = 'pause'
        series.interval = readInline(main.slice(6).trim())
      } else {
        const match = main.match(/^(\d+)\s*[×x](?:\s*(\d+)\s*m)?$/)
        if (!match) return failImport()
        series.repetitions = Number(match[1])
        series.distanceMeters = match[2] ? Number(match[2]) : null
      }
      const seen = new Set<string>()
      for (const field of fields) {
        const match = field.match(/^(Técnica|Material|Cada|Repeticiones|Distancia):\s?(.*)$/)
        if (!match || seen.has(match[1])) return failImport()
        seen.add(match[1])
        const value = readInline(match[2])
        if (match[1] === 'Técnica') series.exercise = value
        else if (match[1] === 'Material') series.material = value
        else if (match[1] === 'Cada') {
          if (pause) return failImport()
          series.interval = value
        } else if (match[1] === 'Repeticiones') {
          if (!pause || !/^\d+$/.test(value)) return failImport()
          series.repetitions = Number(value)
        } else {
          const distance = value.match(/^(\d+) m$/)
          if (!pause || !distance) return failImport()
          series.distanceMeters = Number(distance[1])
        }
      }
      block.series.push(series)
    }
    data.blocks.push(block)
    skip()
  }
  if (lines[position++]?.trim() !== 'FIN DEL ENTRENO') return failImport()
  skip()
  if (position !== lines.length) return failImport()
  return data
}

export function importWorkoutText(
  text: string,
  newId: () => string = () => crypto.randomUUID()
): ObjectiveWorkout {
  const fail = (): never => {
    throw new Error(WORKOUT_IMPORT_ERROR)
  }
  if (text.length > WORKOUT_TEXT_LIMIT) return fail()
  const normalized = text
    .replace(/^\uFEFF/, '')
    .trim()
    .replaceAll('\r\n', '\n')
  const separator = normalized.indexOf('\n')
  if (separator < 0) return fail()
  const header = normalized.slice(0, separator).trim()
  let data: unknown
  try {
    if (header === WORKOUT_TEXT_HEADER) data = readWorkoutSheet(normalized)
    else if (header === LEGACY_WORKOUT_TEXT_HEADER)
      data = JSON.parse(normalized.slice(separator + 1))
    else return fail()
  } catch {
    return fail()
  }
  if (
    !record(data) ||
    typeof data.title !== 'string' ||
    data.title.length > 100 ||
    typeof data.observations !== 'string' ||
    data.observations.length > 2000 ||
    !Array.isArray(data.blocks) ||
    data.blocks.length > 20
  )
    return fail()
  const rawBlocks: (RecordValue & { id: string; series: unknown[] })[] = data.blocks.map(
    (raw, index) => {
      if (!record(raw) || !Array.isArray(raw.series)) return fail()
      return {
        ...raw,
        id: `block-${index}`,
        series: raw.series.map((series, seriesIndex) =>
          record(series) ? { ...series, id: `series-${seriesIndex}` } : series
        ),
      }
    }
  )
  const validated = normalizeClassTraining(rawBlocks)
  if (!validated) return fail()
  const byId = new Map(validated.map((block) => [block.id, block]))
  return {
    id: newId(),
    title: data.title.trim(),
    observations: data.observations.trim(),
    blocks: rawBlocks.map((raw) => {
      const valid = byId.get(raw.id)
      // Empty blocks are valid drafts; the class normalizer omits them from its output.
      return {
        id: newId(),
        title: valid?.title ?? (typeof raw.title === 'string' ? raw.title.trim() : ''),
        observations:
          valid?.observations ??
          (typeof raw.observations === 'string' ? raw.observations.trim() : ''),
        repetitions: Number(raw.repetitions),
        series: (valid?.series ?? []).map((series) => ({ ...series, id: newId() })),
      }
    }),
  }
}
