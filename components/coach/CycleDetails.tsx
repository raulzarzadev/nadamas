'use client'

import { useState } from 'react'
import { FiChevronRight } from 'react-icons/fi'
import { LuWandSparkles } from 'react-icons/lu'
import SortableList from '@/components/ui/sortable-list'
import type { TrainingCycle } from '@/lib/training-planner'
import { buildDailySessions, sessionCalendarGroup } from '@/lib/training-session-builder'
import ObjectiveWorkouts, { normalizeObjectiveWorkout } from './ObjectiveWorkouts'

type Details = TrainingCycle
const addClass =
  'relative inline-flex cursor-pointer items-center rounded-full border border-(--c-aqua-strong)/30 px-2 py-1 text-[10px] font-medium leading-none text-(--c-aqua-strong) before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:cursor-not-allowed disabled:opacity-40'

export default function CycleDetails({
  value,
  onChange,
  disabled,
  readOnly = false,
}: {
  value: Details
  onChange: (value: Details) => void
  disabled: boolean
  readOnly?: boolean
}) {
  const objectives = value.objectives ?? [
    ...new Set(
      value.goal
        .split('\n')
        .map((goal) => goal.trim())
        .filter(Boolean)
    ),
  ]
  const items = objectives.map((_, index) => ({
    id: value.objectiveIds?.[index] ?? `objective-${index}`,
    index,
  }))
  const workouts = (index: number) =>
    (value.objectiveWorkouts?.[index] ?? []).map(normalizeObjectiveWorkout)
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({})
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({})
  const visibleItems = items.filter((item, index) => {
    const group = sessionCalendarGroup(value.objectiveDates?.[item.index] ?? '')
    if (!group) return true
    const previous = sessionCalendarGroup(value.objectiveDates?.[items[index - 1]?.index] ?? '')
    if (collapsedMonths[group.month]) return group.month !== previous?.month
    if (collapsedWeeks[`${group.month}-${group.week}`])
      return group.month !== previous?.month || group.week !== previous?.week
    return true
  })
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const add = () => {
    const next = [...objectives, '']
    onChange({
      ...value,
      objectives: next,
      objectiveDates: [...objectives.map((_, index) => value.objectiveDates?.[index] ?? ''), ''],
      objectiveIds: [...items.map((item) => item.id), crypto.randomUUID()],
      objectiveTitles: [
        ...objectives.map((goal, index) => value.objectiveTitles?.[index] ?? goal.split('\n')[0]),
        '',
      ],
      goal: next.join('\n'),
      objectiveWorkouts: [...objectives.map((_, index) => workouts(index)), []],
    })
    setExpandedIndex(next.length - 1)
  }
  return (
    <div className="my-3 grid min-w-0 gap-2 rounded-xl bg-(--c-surface) p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold">Sesiones</h3>
        {!readOnly && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              disabled={
                disabled ||
                !sessionCalendarGroup(value.startDate) ||
                !sessionCalendarGroup(value.endDate) ||
                value.endDate < value.startDate
              }
              onClick={() => {
                onChange(buildDailySessions(value, () => crypto.randomUUID()))
                setExpandedIndex(null)
              }}
              className={`${addClass} gap-1`}
            >
              <LuWandSparkles aria-hidden="true" />
              Construir sesiones
            </button>
            <button type="button" disabled={disabled} onClick={add} className={addClass}>
              + Agregar sesión
            </button>
          </div>
        )}
      </div>
      {objectives.length ? (
        <SortableList
          items={visibleItems}
          disabled={
            disabled ||
            readOnly ||
            Object.values(collapsedMonths).some(Boolean) ||
            Object.values(collapsedWeeks).some(Boolean)
          }
          label="sesión"
          className="grid min-w-0 gap-1"
          onChange={(ordered) => {
            const next = ordered.map((item) => objectives[item.index])
            onChange({
              ...value,
              objectives: next,
              goal: next.join('\n'),
              objectiveDates: ordered.map((item) => value.objectiveDates?.[item.index] ?? ''),
              objectiveIds: ordered.map((item) => item.id),
              objectiveTitles: ordered.map(
                (item) =>
                  value.objectiveTitles?.[item.index] ?? objectives[item.index].split('\n')[0]
              ),
              objectiveWorkouts: ordered.map((item) => workouts(item.index)),
            })
            setExpandedIndex(
              expandedIndex === null
                ? null
                : ordered.findIndex((item) => item.index === expandedIndex)
            )
          }}
        >
          {(item, _index, handle) => {
            const selected = item.index
            const group = sessionCalendarGroup(value.objectiveDates?.[selected] ?? '')
            const previousGroup = sessionCalendarGroup(
              value.objectiveDates?.[items[selected - 1]?.index] ?? ''
            )
            const monthClosed = group ? collapsedMonths[group.month] : false
            const weekKey = group ? `${group.month}-${group.week}` : ''
            const weekClosed = collapsedWeeks[weekKey]
            return (
              <div
                key={item.id}
                className={`min-w-0 rounded-xl ${expandedIndex === selected ? 'bg-[#d5eeeb]' : ''}`}
              >
                {group && group.month !== previousGroup?.month && (
                  <h4 className="pt-3">
                    <button
                      type="button"
                      aria-expanded={!monthClosed}
                      onClick={() =>
                        setCollapsedMonths((previous) => ({
                          ...previous,
                          [group.month]: !previous[group.month],
                        }))
                      }
                      className="flex min-h-9 w-full items-center gap-2 rounded text-left text-sm font-bold focus-visible:outline-2"
                    >
                      <FiChevronRight
                        aria-hidden="true"
                        className={`size-4 shrink-0 ${!monthClosed ? 'rotate-90' : ''}`}
                      />
                      {group.monthLabel}
                    </button>
                  </h4>
                )}
                {group &&
                  !monthClosed &&
                  (group.week !== previousGroup?.week || group.month !== previousGroup?.month) && (
                    <h5 className="border-t border-(--c-border)">
                      <button
                        type="button"
                        aria-expanded={!weekClosed}
                        onClick={() =>
                          setCollapsedWeeks((previous) => ({
                            ...previous,
                            [weekKey]: !previous[weekKey],
                          }))
                        }
                        className="flex min-h-8 w-full items-center gap-2 rounded text-left text-[10px] font-semibold text-(--c-text-2) focus-visible:outline-2"
                      >
                        <FiChevronRight
                          aria-hidden="true"
                          className={`size-3 shrink-0 ${!weekClosed ? 'rotate-90' : ''}`}
                        />
                        {group.weekLabel}
                      </button>
                    </h5>
                  )}
                {!group && (_index === 0 || previousGroup) && (
                  <h4 className="pt-3 pb-1 text-xs font-semibold">Sin fecha</h4>
                )}
                {!monthClosed && !weekClosed && (
                  <>
                    <div
                      style={{
                        top:
                          expandedIndex === selected
                            ? 'calc(var(--app-header-h, 0px) + 48px)'
                            : undefined,
                      }}
                      className={`${expandedIndex === selected ? 'sticky z-10 bg-[#bce0da]' : 'relative bg-[#eaf7fb]'} flex min-h-6 min-w-0 items-center rounded-t-xl`}
                    >
                      {!readOnly && handle}
                      <button
                        type="button"
                        aria-expanded={expandedIndex === selected}
                        onClick={() => {
                          const opening = expandedIndex !== selected
                          setExpandedIndex(opening ? selected : null)
                        }}
                        className={`flex min-h-6 w-full min-w-0 items-center gap-2 rounded-t-xl px-1 text-left text-xs leading-tight font-semibold text-(--c-ocean) outline-none focus-visible:ring-2 focus-visible:ring-(--c-aqua-strong) focus-visible:ring-inset ${expandedIndex === selected ? 'bg-[#bce0da]' : 'bg-[#eaf7fb]'}`}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {value.objectiveTitles?.[selected]?.trim() ||
                            (value.objectiveTitles
                              ? `Sesión ${selected + 1}`
                              : objectives[selected].split('\n')[0]) ||
                            `Sesión ${selected + 1}`}
                        </span>
                        <span className="shrink-0 text-[10px] font-normal text-(--c-text-2)">
                          {workouts(selected).length} entrenos
                        </span>
                        <FiChevronRight
                          aria-hidden="true"
                          className={`size-4 shrink-0 text-(--c-aqua-strong) ${expandedIndex === selected ? 'rotate-90' : ''}`}
                        />
                      </button>
                    </div>
                    {expandedIndex === selected && (
                      <div className="grid min-w-0 gap-3 pb-3">
                        {objectives[selected]?.trim() && (
                          <p className="whitespace-pre-wrap wrap-anywhere text-xs text-(--c-text-2)">
                            {objectives[selected]}
                          </p>
                        )}
                        <ObjectiveWorkouts
                          workouts={workouts(selected)}
                          disabled={disabled}
                          readOnly={readOnly}
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
                  </>
                )}
              </div>
            )
          }}
        </SortableList>
      ) : (
        <p className="text-[10px] text-(--c-text-2)">Aún no hay sesiones.</p>
      )}
    </div>
  )
}
