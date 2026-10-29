'use client'

import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import type { TrainingCycle } from '@/lib/training-planner'

const contains = (cycle: TrainingCycle, date: string) =>
  (!cycle.startDate || date >= cycle.startDate) && (!cycle.endDate || date <= cycle.endDate)
const byStart = (a: TrainingCycle, b: TrainingCycle) => a.startDate.localeCompare(b.startDate)

/**
 * The MACRO → MESO → MICRO bars from the "Crear machote" preview, drawn from the real
 * plan running on `date`; the current MESO and MICRO stay solid, the rest fade.
 */
export default function PlanStructureBars({
  plans,
  date,
}: {
  plans: TrainingPlan[]
  date: string
}) {
  const plan = plans.find((item) =>
    item.cycles.some((cycle) => cycle.type === 'macro' && contains(cycle, date))
  )
  const macro = plan?.cycles.find((cycle) => cycle.type === 'macro' && contains(cycle, date))
  if (!plan || !macro) return null
  const mesos = plan.cycles
    .filter((cycle) => cycle.type === 'meso' && cycle.parentId === macro.id)
    .sort(byStart)
  if (!mesos.length) return null
  const currentMeso = mesos.find((meso) => contains(meso, date))
  const microsOf = (meso: TrainingCycle) =>
    plan.cycles
      .filter((cycle) => cycle.type === 'micro' && cycle.parentId === meso.id)
      .sort(byStart)
  const currentMicro = currentMeso
    ? microsOf(currentMeso).find((micro) => contains(micro, date))
    : undefined
  // Where today falls on the bars: same equal-column layout, then the day's share of
  // the current MICRO (or MESO when it has no MICRO for today).
  const day = (value: string) => Date.parse(`${value}T00:00:00Z`) / 86400000
  const share = (cycle: TrainingCycle) => {
    const start = day(cycle.startDate)
    const end = day(cycle.endDate)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0.5
    return Math.min(1, Math.max(0, (day(date) - start + 0.5) / (end - start + 1)))
  }
  const mesoIndex = currentMeso ? mesos.indexOf(currentMeso) : -1
  const currentMicros = currentMeso ? microsOf(currentMeso) : []
  const microIndex = currentMicro ? currentMicros.indexOf(currentMicro) : -1
  const position =
    mesoIndex < 0
      ? null
      : (mesoIndex +
          (microIndex < 0
            ? share(currentMeso as TrainingCycle)
            : (microIndex + share(currentMicro as TrainingCycle)) / currentMicros.length)) /
        mesos.length
  const label = [
    macro.title,
    currentMeso?.title && `MESO ${currentMeso.title}`,
    currentMicro?.title && `MICRO ${currentMicro.title}`,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <div
      role="img"
      aria-label={`Estructura del entreno: ${label}`}
      className="grid min-w-0 gap-1.5 pt-4"
    >
      <div className="relative grid min-w-0 gap-1.5 pt-3.5">
        {position !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 -bottom-1 z-10 flex -translate-x-1/2 flex-col items-center gap-0.5"
            style={{ left: `clamp(3px, ${position * 100}%, calc(100% - 3px))` }}
          >
            <span className="text-[9px] leading-none font-bold text-(--c-ocean)">Hoy</span>
            <span className="w-1.5 flex-1 rounded-full border border-white shadow-[0_0_0_1px_rgba(13,44,72,0.25)]" />
          </div>
        )}
        <div aria-hidden="true" className="h-1.5 rounded-full bg-[#79b9cf]" />
        <div
          aria-hidden="true"
          className="grid min-w-0 gap-1.5"
          style={{ gridTemplateColumns: `repeat(${mesos.length}, minmax(0, 1fr))` }}
        >
          {mesos.map((meso) => {
            const micros = microsOf(meso)
            const isCurrent = meso.id === currentMeso?.id
            return (
              <div
                key={meso.id}
                className={`grid min-w-0 gap-1.5 ${isCurrent ? '' : 'opacity-35'}`}
              >
                <div className="h-1.5 rounded-full bg-(--c-aqua-strong)" />
                {micros.length > 0 && (
                  <div
                    className="grid gap-0.5"
                    style={{ gridTemplateColumns: `repeat(${micros.length}, minmax(0, 1fr))` }}
                  >
                    {micros.map((micro) => (
                      <div
                        key={micro.id}
                        className={`h-1 rounded-full bg-[#258575] ${isCurrent && micro.id !== currentMicro?.id ? 'opacity-40' : ''}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {label && <p className="text-center text-[11px] text-(--c-text-2)">{label}</p>}
    </div>
  )
}
