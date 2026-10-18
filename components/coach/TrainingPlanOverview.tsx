'use client'

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
  const macro = cycles.find((cycle) => cycle.type === 'macro')
  if (!macro) return null
  const updateMacro = (changes: Partial<TrainingCycle>) =>
    onChange(cycles.map((cycle) => (cycle.id === macro.id ? { ...cycle, ...changes } : cycle)))
  return (
    <div className="grid min-w-0 gap-1">
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
      />
    </div>
  )
}
