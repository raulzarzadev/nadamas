'use client'

import { useEffect, useState } from 'react'
import SortableList from '@/components/ui/sortable-list'
import { localCalendarDate } from '@/lib/today-training'
import type { TrainingCycle } from '@/lib/training-planner'
import { groupTrainingSessions, reorderTrainingSessions } from '@/lib/training-session-groups'
import ObjectiveWorkouts, { normalizeObjectiveWorkout } from './ObjectiveWorkouts'
import PlanningRow from './PlanningRow'

const addClass =
  'relative inline-flex cursor-pointer items-center rounded-full border border-(--c-aqua-strong)/30 px-2 py-1 text-[10px] font-medium leading-none text-(--c-aqua-strong) before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:cursor-not-allowed disabled:opacity-40'

export default function CycleDetails({
  value,
  onChange,
  disabled,
  readOnly = false,
  onRequestEdit,
}: {
  value: TrainingCycle
  onChange: (value: TrainingCycle) => void
  disabled: boolean
  readOnly?: boolean
  onRequestEdit?: () => void
}) {
  const [today, setToday] = useState(() => localCalendarDate(new Date()))
  useEffect(() => {
    const refresh = () => setToday(localCalendarDate(new Date()))
    const timer = setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const objectives = value.objectives ?? [
    ...new Set(
      value.goal
        .split('\n')
        .map((text) => text.trim())
        .filter(Boolean)
    ),
  ]
  const months = groupTrainingSessions(value)
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({})
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({})
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const workouts = (index: number) =>
    (value.objectiveWorkouts?.[index] ?? []).map(normalizeObjectiveWorkout)
  const reorder = (order: number[]) => {
    onChange(reorderTrainingSessions(value, order))
    if (expandedIndex !== null) setExpandedIndex(order.indexOf(expandedIndex))
  }
  const add = () => {
    const next = [...objectives, '']
    onChange({
      ...value,
      objectives: next,
      goal: next.join('\n'),
      objectiveIds: [
        ...objectives.map((_, index) => value.objectiveIds?.[index] ?? `objective-${index}`),
        crypto.randomUUID(),
      ],
      objectiveTitles: [
        ...objectives.map((text, index) => value.objectiveTitles?.[index] ?? text.split('\n')[0]),
        '',
      ],
      objectiveDates: [...objectives.map((_, index) => value.objectiveDates?.[index] ?? ''), ''],
      objectiveWorkouts: [...objectives.map((_, index) => workouts(index)), []],
    })
    setCollapsedMonths((previous) => ({ ...previous, undated: false }))
    setCollapsedWeeks((previous) => ({ ...previous, 'undated-undated': false }))
    setExpandedIndex(next.length - 1)
  }
  return (
    <div className="my-3 grid min-w-0 gap-2 rounded-xl bg-(--c-surface) p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs font-semibold">Sesiones</h3>
        {!readOnly && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button type="button" disabled={disabled} onClick={add} className={addClass}>
              + Agregar sesión
            </button>
          </div>
        )}
      </div>
      {!objectives.length ? (
        <p className="text-[10px] text-(--c-text-2)">Aún no hay sesiones.</p>
      ) : (
        <SortableList
          items={months}
          disabled={disabled || readOnly}
          label="mes"
          className="grid min-w-0 gap-2"
          onChange={(ordered) =>
            reorder(
              ordered.flatMap((month) =>
                month.weeks.flatMap((week) => week.items.map((item) => item.index))
              )
            )
          }
        >
          {(month, _monthIndex, monthHandle) => (
            <section key={month.id} aria-label={month.title} className="min-w-0">
              <div className="rounded-t-xl bg-[#eaf7fb]">
                <PlanningRow
                  title={month.title}
                  count={month.count}
                  countLabel="sesiones"
                  expanded={!collapsedMonths[month.id]}
                  handle={readOnly ? undefined : monthHandle}
                  onToggle={() =>
                    setCollapsedMonths((previous) => ({
                      ...previous,
                      [month.id]: !previous[month.id],
                    }))
                  }
                />
              </div>
              {!collapsedMonths[month.id] && (
                <div className="ml-1 border-l border-(--c-aqua-strong)/20 pl-1">
                  <SortableList
                    items={month.weeks}
                    disabled={disabled || readOnly}
                    label="semana"
                    className="grid min-w-0 gap-1"
                    onChange={(ordered) =>
                      reorder(
                        months.flatMap((entry) =>
                          (entry.id === month.id ? ordered : entry.weeks).flatMap((week) =>
                            week.items.map((item) => item.index)
                          )
                        )
                      )
                    }
                  >
                    {(week, _weekIndex, weekHandle) => (
                      <section key={week.id} aria-label={week.title} className="min-w-0">
                        <div className="rounded-t-xl bg-[#eaf7fb]">
                          <PlanningRow
                            title={week.title}
                            count={week.items.length}
                            countLabel="sesiones"
                            expanded={!collapsedWeeks[week.id]}
                            handle={readOnly ? undefined : weekHandle}
                            onToggle={() =>
                              setCollapsedWeeks((previous) => ({
                                ...previous,
                                [week.id]: !previous[week.id],
                              }))
                            }
                          />
                        </div>
                        {!collapsedWeeks[week.id] && (
                          <div className="ml-1 border-l border-(--c-aqua-strong)/20 pl-1">
                            <SortableList
                              items={week.items}
                              disabled={disabled || readOnly}
                              label="sesión"
                              className="grid min-w-0 gap-1"
                              onChange={(ordered) =>
                                reorder(
                                  months.flatMap((entry) =>
                                    entry.weeks.flatMap((group) =>
                                      (group.id === week.id ? ordered : group.items).map(
                                        (item) => item.index
                                      )
                                    )
                                  )
                                )
                              }
                            >
                              {(item, _index, handle) => {
                                const selected = item.index
                                const expanded = expandedIndex === selected
                                const title =
                                  value.objectiveTitles?.[selected]?.trim() ||
                                  (value.objectiveTitles
                                    ? ''
                                    : objectives[selected].split('\n')[0]) ||
                                  `Sesión ${selected + 1}`
                                return (
                                  <div
                                    key={item.id}
                                    className={`min-w-0 rounded-xl ${expanded ? 'bg-[#d5eeeb]' : ''}`}
                                  >
                                    <div
                                      style={{
                                        top: expanded
                                          ? 'calc(var(--app-header-h, 0px) + 72px)'
                                          : undefined,
                                      }}
                                      className={`${expanded ? 'sticky z-10 bg-[#bce0da]' : 'relative bg-[#eaf7fb]'} rounded-t-xl`}
                                    >
                                      <PlanningRow
                                        leading={
                                          value.objectiveDates?.[selected] === today ? (
                                            <span className="pointer-events-none absolute top-1/2 right-[calc(100%+4px)] z-20 -translate-y-1/2 rounded-full bg-[#176454] px-2 py-1 text-[10px] leading-none font-bold text-white ring-2 ring-(--c-surface)">
                                              Hoy
                                            </span>
                                          ) : undefined
                                        }
                                        title={title}
                                        dotLabel={
                                          workouts(selected).length ? 'Tiene sesión' : 'Sin sesión'
                                        }
                                        dotFilled={workouts(selected).length > 0}
                                        expanded={expanded}
                                        handle={readOnly ? undefined : handle}
                                        onToggle={() =>
                                          setExpandedIndex(expanded ? null : selected)
                                        }
                                      />
                                    </div>
                                    {expanded && (
                                      <div className="grid min-w-0 gap-3 pb-3">
                                        {objectives[selected]?.trim() && (
                                          <p className="whitespace-pre-wrap wrap-anywhere text-xs text-(--c-text-2)">
                                            {objectives[selected]}
                                          </p>
                                        )}
                                        <ObjectiveWorkouts
                                          workouts={workouts(selected)}
                                          sessionTitle={
                                            value.objectiveDates?.[selected]
                                              ? new Date(
                                                  `${value.objectiveDates[selected]}T12:00:00`
                                                ).toLocaleDateString('es-MX', {
                                                  weekday: 'long',
                                                  day: 'numeric',
                                                  month: 'short',
                                                })
                                              : title
                                          }
                                          disabled={disabled}
                                          readOnly={readOnly}
                                          onRequestEdit={onRequestEdit}
                                          onChange={(next) =>
                                            onChange({
                                              ...value,
                                              objectives,
                                              objectiveWorkouts: objectives.map((_, index) =>
                                                index === selected ? next : workouts(index)
                                              ),
                                            })
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>
                                )
                              }}
                            </SortableList>
                          </div>
                        )}
                      </section>
                    )}
                  </SortableList>
                </div>
              )}
            </section>
          )}
        </SortableList>
      )}
    </div>
  )
}
