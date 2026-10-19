'use client'

import { useState } from 'react'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'
import type { TrainingCycle } from '@/lib/training-planner'
import CycleCompactSummary from './CycleCompactSummary'
import MacroCycleBarsInput from './MacroCycleBarsInput'
import MacroCyclePeriodInput from './MacroCyclePeriodInput'
import PlanningRow from './PlanningRow'

export default function TrainingPlanOverview({
  cycles,
  onChange,
  disabled,
  readOnly = false,
  macros = [],
}: {
  cycles: TrainingCycle[]
  onChange: (cycles: TrainingCycle[]) => void
  disabled: boolean
  readOnly?: boolean
  macros?: TrainingCycle[]
}) {
  const [macroExpanded, setMacroExpanded] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const macro = cycles.find((cycle) => cycle.type === 'macro')
  if (!macro) return null
  const expandableIds = cycles.filter((cycle) => cycle.type !== 'macro').map((cycle) => cycle.id)
  const allExpanded = macroExpanded && expandableIds.every((id) => expanded[id])
  const updateMacro = (changes: Partial<TrainingCycle>) =>
    onChange(cycles.map((cycle) => (cycle.id === macro.id ? { ...cycle, ...changes } : cycle)))
  return (
    <div className="grid min-w-0 gap-1 rounded-xl bg-[#d8eef5] pb-1">
      <div
        className="sticky z-[26] rounded-t-xl bg-[#d8eef5]"
        style={{ top: 'var(--app-header-h, 0px)' }}
      >
        <PlanningRow
          title={macro.title}
          count={cycles.filter((cycle) => cycle.parentId === macro.id).length}
          countLabel="MESO-ciclos"
          expanded={macroExpanded}
          controls={
            <button
              type="button"
              aria-pressed={allExpanded}
              onClick={() => {
                setMacroExpanded(!allExpanded)
                setExpanded(
                  allExpanded ? {} : Object.fromEntries(expandableIds.map((id) => [id, true]))
                )
              }}
              className="inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-[10px] font-semibold text-(--c-aqua-strong) focus-visible:outline-2"
            >
              {allExpanded ? (
                <FiChevronDown aria-hidden="true" />
              ) : (
                <FiChevronRight aria-hidden="true" />
              )}
              {allExpanded ? 'Contraer todo' : 'Expandir todo'}
            </button>
          }
        />
      </div>
      {!macroExpanded && (
        <CycleCompactSummary
          cycle={macro}
          periods={cycles.filter((cycle) => cycle.parentId === macro.id)}
          subPeriods={cycles.filter((cycle) => cycle.type === 'micro')}
        />
      )}
      {macroExpanded && (
        <div className="grid min-w-0 gap-1">
          <MacroCyclePeriodInput
            summary={(onEditDates) => (
              <CycleCompactSummary
                onEditDates={readOnly ? undefined : onEditDates}
                disabled={disabled}
                cycle={macro}
                periods={cycles.filter((cycle) => cycle.parentId === macro.id)}
                subPeriods={cycles.filter((cycle) => cycle.type === 'micro')}
              />
            )}
            hideTitle
            snapRanges={macros.filter((cycle) => cycle.id !== macro.id)}
            value={macro}
            title={macro.title}
            onTitleChange={(title) => updateMacro({ title })}
            onChange={updateMacro}
            disabled={disabled}
            readOnly={readOnly}
          />
          <div className="ml-2 min-w-0 border-l border-(--c-aqua-strong)/20 pl-2">
            <MacroCycleBarsInput
              macro={macro}
              cycles={cycles}
              onChange={onChange}
              disabled={disabled}
              readOnly={readOnly}
              expanded={expanded}
              onExpandedChange={setExpanded}
            />
          </div>
        </div>
      )}
    </div>
  )
}
