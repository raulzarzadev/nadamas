import TimelineRangeInput, { type TimelineRange } from '@/components/ui/timeline-range-input'
import { CYCLE_LABELS, type TrainingCycle } from '@/lib/training-planner'

const day = (value: string) => Date.parse(`${value}T00:00:00Z`) / 86_400_000
const label = (value: string) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Sin fecha'

export default function TrainingCycleTimeline({
  parent,
  current,
  siblings = [],
  onChange,
  onSelect,
  onRemove,
  disabled = false,
}: {
  parent: TrainingCycle
  current: TrainingCycle
  siblings?: TrainingCycle[]
  onChange?: (value: TimelineRange) => void
  onSelect?: (cycle: TrainingCycle) => void
  onRemove?: (cycle: TrainingCycle) => void
  disabled?: boolean
}) {
  const removeButton = (cycle: TrainingCycle) =>
    onRemove && (
      <button
        type="button"
        disabled={disabled}
        aria-label={`Eliminar mesociclo ${cycle.title}`}
        onClick={() => onRemove(cycle)}
        className="grid size-11 shrink-0 place-items-center rounded-full text-lg text-(--c-text-2) hover:bg-white hover:text-(--c-error,#b91c1c) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
      >
        ×
      </button>
    )
  const start = day(parent.startDate)
  const end = day(parent.endDate)
  const position = (cycle: TrainingCycle) => {
    const currentStart = day(cycle.startDate)
    const currentEnd = day(cycle.endDate)
    if (
      ![start, end, currentStart, currentEnd].every(Number.isFinite) ||
      end < start ||
      currentEnd < currentStart
    )
      return null
    const duration = end - start + 1
    const left = Math.max(0, Math.min(100, ((currentStart - start) / duration) * 100))
    const width = Math.max(
      0,
      Math.min(
        100 - left,
        ((Math.min(end, currentEnd) - Math.max(start, currentStart) + 1) / duration) * 100
      )
    )
    return { left: `${left}%`, width: `${width}%` }
  }
  const currentPosition = position(current)
  const others = siblings.filter((cycle) => cycle.id !== current.id && cycle.parentId === parent.id)

  return (
    <div className="grid min-w-0 gap-3 rounded-xl bg-(--c-surface) p-3 text-xs text-(--c-text-2)">
      <div>
        <p>
          {CYCLE_LABELS[parent.type]}:{' '}
          <span className="font-semibold text-(--c-ocean)">{parent.title}</span>
        </p>
        <div aria-hidden="true" className="mt-2 h-1.5 w-full rounded-full bg-(--c-ocean)" />
        <p className="mt-1 flex justify-between gap-2 text-[10px]">
          <span>{label(parent.startDate)}</span>
          <span className="text-right">{label(parent.endDate)}</span>
        </p>
      </div>
      {others.length > 0 && (
        <div className="grid gap-3">
          <p className="text-[10px] font-semibold">
            Otros {current.type === 'meso' ? 'mesociclos' : 'microciclos'}
          </p>
          {others.map((cycle) => {
            const range = position(cycle)
            const Row = onSelect ? 'button' : 'div'
            return (
              <div key={cycle.id} className="relative">
                <Row
                  type={onSelect ? 'button' : undefined}
                  disabled={onSelect ? disabled : undefined}
                  onClick={onSelect ? () => onSelect(cycle) : undefined}
                  className={
                    onSelect
                      ? 'min-h-11 w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) hover:bg-white/50 disabled:opacity-50'
                      : undefined
                  }
                >
                  <p className="min-h-11 content-center break-words pr-11 font-medium">
                    {cycle.title}
                  </p>
                  <div
                    aria-hidden="true"
                    className="relative mt-1.5 h-1.5 w-full rounded-full bg-(--c-border)"
                  >
                    {range && (
                      <span
                        className="absolute top-0 h-full rounded-full bg-(--c-ocean)/40"
                        style={range}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-[10px]">
                    {label(cycle.startDate)} — {label(cycle.endDate)}
                  </p>
                </Row>
                <div className="absolute right-0 top-0">{removeButton(cycle)}</div>
              </div>
            )
          })}
        </div>
      )}
      <div className="border-t border-(--c-border) pt-3">
        <div className="flex items-center justify-between gap-2">
          <p>
            {CYCLE_LABELS[current.type]} en edición{current.title ? `: ${current.title}` : ''}
          </p>
          {removeButton(current)}
        </div>
        {onChange ? (
          <TimelineRangeInput
            min={parent.startDate}
            max={parent.endDate}
            value={current}
            onChange={onChange}
            disabled={disabled}
            label={`${CYCLE_LABELS[current.type]} en edición`}
          />
        ) : (
          <>
            <div
              aria-hidden="true"
              className="relative mt-2 h-1.5 w-full rounded-full bg-(--c-border)"
            >
              {currentPosition && (
                <span
                  className="absolute top-0 h-full rounded-full bg-(--c-aqua-strong)"
                  style={currentPosition}
                />
              )}
            </div>
            <p className="mt-1 text-[10px]">
              {currentPosition
                ? `${label(current.startDate)} — ${label(current.endDate)}`
                : 'Elige ambas fechas para ubicar este ciclo.'}
            </p>
          </>
        )}
      </div>
      <p className="text-[10px]">Las fechas deben quedar dentro de este periodo.</p>
    </div>
  )
}
