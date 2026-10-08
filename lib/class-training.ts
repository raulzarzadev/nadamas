export interface ClassTrainingSeries {
  id: string
  repetitions: number
  distanceMeters: number | null
  exercise: string
  material?: string
  interval: string
}

export interface ClassTrainingBlock {
  id: string
  repetitions: number
  series: ClassTrainingSeries[]
}

/** Preserve workouts created with the original free-text editor. */
function legacySeries(line: string, id: string): ClassTrainingSeries {
  const match = line.trim().match(/^(\d+)\s*[x×]\s*(\d+)\s*m?\s*(.*)$/i)
  const description = match?.[3] || line.trim()
  const separator = description.lastIndexOf(' a ')
  return {
    id,
    repetitions: match ? Number(match[1]) : 1,
    distanceMeters: match ? Number(match[2]) : null,
    exercise: separator >= 0 ? description.slice(0, separator) : description,
    interval: separator >= 0 ? description.slice(separator + 3) : '',
  }
}

export function normalizeClassTraining(value: unknown): ClassTrainingBlock[] | null {
  if (!Array.isArray(value) || value.length > 20) return null
  const blocks: ClassTrainingBlock[] = []
  const ids = new Set<string>()
  for (const block of value) {
    if (
      !block ||
      typeof block !== 'object' ||
      typeof block.id !== 'string' ||
      !/^[\w-]{1,80}$/.test(block.id) ||
      ids.has(block.id) ||
      !Number.isInteger(block.repetitions) ||
      block.repetitions < 1 ||
      block.repetitions > 99 ||
      !Array.isArray(block.series) ||
      !block.series.length ||
      block.series.length > 30
    )
      return null
    const series: ClassTrainingSeries[] = []
    const seriesIds = new Set<string>()
    for (const [index, raw] of block.series.entries()) {
      if (typeof raw === 'string' && raw.length > 300) return null
      const item = typeof raw === 'string' ? legacySeries(raw, `legacy-${index}`) : raw
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.id !== 'string' ||
        !/^[\w-]{1,80}$/.test(item.id) ||
        seriesIds.has(item.id) ||
        !Number.isInteger(item.repetitions) ||
        item.repetitions < 1 ||
        item.repetitions > 999 ||
        (item.distanceMeters !== null &&
          (!Number.isInteger(item.distanceMeters) ||
            item.distanceMeters < 1 ||
            item.distanceMeters > 100000)) ||
        typeof item.exercise !== 'string' ||
        !item.exercise.trim() ||
        item.exercise.length > 200 ||
        (item.material !== undefined &&
          (typeof item.material !== 'string' || item.material.length > 120)) ||
        typeof item.interval !== 'string' ||
        item.interval.length > 80
      )
        return null
      seriesIds.add(item.id)
      series.push({
        id: item.id,
        repetitions: item.repetitions,
        distanceMeters: item.distanceMeters,
        exercise: item.exercise.trim(),
        material: item.material?.trim() || '',
        interval: item.interval.trim(),
      })
    }
    ids.add(block.id)
    blocks.push({ id: block.id, repetitions: block.repetitions, series })
  }
  return blocks
}
