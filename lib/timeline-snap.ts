/** Inclusive calendar ranges meet at end + 1, never on the same day. */
export function snapTimelineRange(
  start: number,
  end: number,
  mode: 'start' | 'end' | 'move',
  neighbors: { start: number; end: number }[],
  lower: number,
  upper: number,
  tolerance: number
) {
  let best: { start: number; end: number; boundary: number; delta: number } | null = null
  for (const edge of mode === 'start'
    ? (['start'] as const)
    : mode === 'end'
      ? (['end'] as const)
      : (['start', 'end'] as const)) {
    for (const neighbor of neighbors) {
      const target = edge === 'start' ? neighbor.end + 1 : neighbor.start - 1
      const delta = target - (edge === 'start' ? start : end)
      const nextStart = mode === 'end' ? start : start + delta
      const nextEnd = mode === 'start' ? end : end + delta
      if (
        Math.abs(delta) > tolerance ||
        nextStart < lower ||
        nextEnd > upper ||
        nextStart >= nextEnd
      )
        continue
      const overlap = (first: number, last: number, range: { start: number; end: number }) =>
        Math.max(0, Math.min(last, range.end) - Math.max(first, range.start) + 1)
      // An unrelated, pre-existing overlap must not prevent correcting this edge.
      if (
        neighbors.some((range) => overlap(nextStart, nextEnd, range) > overlap(start, end, range))
      )
        continue
      if (!best || Math.abs(delta) < Math.abs(best.delta))
        best = {
          start: nextStart,
          end: nextEnd,
          boundary: edge === 'start' ? nextStart : nextEnd + 1,
          delta,
        }
    }
  }
  return best
}

export function snapCalendarEdge(
  value: { startDate: string; endDate: string },
  field: 'startDate' | 'endDate',
  neighbors: { startDate: string; endDate: string }[]
) {
  const day = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000
  const start = day(value.startDate),
    end = day(value.endDate)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return value
  const ranges = neighbors
    .map((range) => ({ start: day(range.startDate), end: day(range.endDate) }))
    .filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end))
  const snapped = snapTimelineRange(
    start,
    end,
    field === 'startDate' ? 'start' : 'end',
    ranges,
    -1000000,
    1000000,
    3
  )
  return snapped
    ? {
        startDate: new Date(snapped.start * 86400000).toISOString().slice(0, 10),
        endDate: new Date(snapped.end * 86400000).toISOString().slice(0, 10),
      }
    : value
}
