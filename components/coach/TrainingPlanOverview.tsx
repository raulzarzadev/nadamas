'use client'

import { useState } from 'react'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'
import type { TrainingCycle } from '@/lib/training-planner'
import { countCycleSessions } from '@/lib/training-session-groups'
import CycleCompactSummary from './CycleCompactSummary'
import MacroCycleBarsInput from './MacroCycleBarsInput'
import MacroCyclePeriodInput from './MacroCyclePeriodInput'

export default function TrainingPlanOverview({
  cycles,
  onChange,
  disabled,
  readOnly = false,
  onRequestEdit,
  macros = [],
}: {
  cycles: TrainingCycle[]
  onChange: (cycles: TrainingCycle[]) => void
  disabled: boolean
  readOnly?: boolean
  onRequestEdit?: () => void
  macros?: TrainingCycle[]
}) {
  const [macroExpanded, setMacroExpanded] = useState(true)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const macro = cycles.find((cycle) => cycle.type === 'macro')
  if (!macro) return null
  const expandableIds = cycles.filter((cycle) => cycle.type !== 'macro').map((cycle) => cycle.id)
  const allExpanded = macroExpanded && expandableIds.every((id) => expanded[id])
  const expandToggle = (
    <button
      type="button"
      aria-pressed={allExpanded}
      onClick={() => {
        setMacroExpanded(!allExpanded)
        setExpanded(allExpanded ? {} : Object.fromEntries(expandableIds.map((id) => [id, true])))
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
  )
  const updateMacro = (changes: Partial<TrainingCycle>) =>
    onChange(cycles.map((cycle) => (cycle.id === macro.id ? { ...cycle, ...changes } : cycle)))
  return (
    <div className="grid min-w-0 gap-1 rounded-xl bg-[#d8eef5] p-1">
      {!macroExpanded && (
        <CycleCompactSummary
          cycle={macro}
          count={countCycleSessions(cycles, macro.id)}
          periods={cycles.filter((cycle) => cycle.parentId === macro.id)}
          subPeriods={cycles.filter((cycle) => cycle.type === 'micro')}
          toolbar={expandToggle}
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
                count={countCycleSessions(cycles, macro.id)}
                periods={cycles.filter((cycle) => cycle.parentId === macro.id)}
                subPeriods={cycles.filter((cycle) => cycle.type === 'micro')}
                toolbar={expandToggle}
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
          <div className="min-w-0">
            <MacroCycleBarsInput
              macro={macro}
              cycles={cycles}
              onChange={onChange}
              disabled={disabled}
              readOnly={readOnly}
              onRequestEdit={onRequestEdit}
              expanded={expanded}
              onExpandedChange={setExpanded}
            />
          </div>
        </div>
      )}
    </div>
  )
}
