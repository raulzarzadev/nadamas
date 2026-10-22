'use client'

import { useState } from 'react'
import { FiCheck, FiChevronDown, FiChevronRight, FiEdit2, FiX } from 'react-icons/fi'
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
  onRequestEdit,
  macros = [],
  onEdit,
  onSave,
  onDiscard,
}: {
  cycles: TrainingCycle[]
  onChange: (cycles: TrainingCycle[]) => void
  disabled: boolean
  readOnly?: boolean
  onRequestEdit?: () => void
  macros?: TrainingCycle[]
  onEdit?: () => void
  onSave?: () => void
  onDiscard?: () => void
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
    <div className="grid min-w-0 gap-1 rounded-xl bg-[#d8eef5] p-1">
      <div
        className="sticky z-[26] rounded-t-xl bg-[#d8eef5]"
        style={{ top: 'calc(var(--app-header-h, 0px) + var(--training-toolbar-h, 0px))' }}
      >
        <PlanningRow
          title={macro.title}
          count={cycles.filter((cycle) => cycle.parentId === macro.id).length}
          countLabel="MESO-ciclos"
          expanded={macroExpanded}
          controls={
            <div className="flex items-center gap-1">
              {readOnly ? (
                onEdit && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={onEdit}
                    className="inline-flex min-h-6 items-center gap-1 rounded-full border border-(--c-border) bg-white px-2 text-[10px] font-semibold text-(--c-ocean) focus-visible:outline-2 disabled:opacity-50"
                  >
                    <FiEdit2 aria-hidden="true" />
                    Editar
                  </button>
                )
              ) : (
                <>
                  {onDiscard && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={onDiscard}
                      className="inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-[10px] font-semibold text-(--c-ocean) hover:bg-white/50 focus-visible:outline-2 disabled:opacity-50"
                    >
                      <FiX aria-hidden="true" />
                      Descartar
                    </button>
                  )}
                  {onSave && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={onSave}
                      className="inline-flex min-h-6 items-center gap-1 rounded-full bg-(--c-ocean) px-2 text-[10px] font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
                    >
                      <FiCheck aria-hidden="true" />
                      {disabled ? 'Guardando…' : 'Guardar'}
                    </button>
                  )}
                </>
              )}
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
            </div>
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
