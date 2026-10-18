'use client'

import { useState } from 'react'
import { FiMinus, FiPlus } from 'react-icons/fi'
import type { TrainingCycle } from '@/lib/training-planner'
import MacroCycleBarsInput from './MacroCycleBarsInput'
import MacroCyclePeriodInput from './MacroCyclePeriodInput'

export default function TrainingPlanOverview({
  cycles,
  onChange,
  disabled,
  readOnly = false,
}: {
  cycles: TrainingCycle[]
  onChange: (cycles: TrainingCycle[]) => void
  disabled: boolean
  readOnly?: boolean
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const macro = cycles.find((cycle) => cycle.type === 'macro')
  if (!macro) return null
  const expandableIds = cycles.filter((cycle) => cycle.type !== 'macro').map((cycle) => cycle.id)
  const allExpanded = expandableIds.length > 0 && expandableIds.every((id) => expanded[id])
  const updateMacro = (changes: Partial<TrainingCycle>) =>
    onChange(cycles.map((cycle) => (cycle.id === macro.id ? { ...cycle, ...changes } : cycle)))
  return (
    <div className="grid min-w-0 gap-1">
      {expandableIds.length > 0 && (
        <div className="-mt-2 flex justify-end">
          <button
            type="button"
            aria-pressed={allExpanded}
            onClick={() =>
              setExpanded(
                allExpanded ? {} : Object.fromEntries(expandableIds.map((id) => [id, true]))
              )
            }
            className="inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[10px] font-semibold text-(--c-aqua-strong) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
          >
            {allExpanded ? <FiMinus aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
            {allExpanded ? 'Contraer todo' : 'Expandir todo'}
          </button>
        </div>
      )}
      <MacroCyclePeriodInput
        hideTitle
        value={macro}
        title={macro.title}
        onTitleChange={(title) => updateMacro({ title })}
        onChange={updateMacro}
        disabled={disabled}
        readOnly={readOnly}
      />
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
  )
}
