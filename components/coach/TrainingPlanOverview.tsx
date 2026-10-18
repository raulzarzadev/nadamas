'use client'

import { useEffect, useState } from 'react'
import { TrainingPlanCRUD } from '@/firebase/training-plans/main'
import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import { type TrainingCycle, validateTrainingCycle } from '@/lib/training-planner'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import MacroCycleBarsInput from './MacroCycleBarsInput'
import MacroCyclePeriodInput from './MacroCyclePeriodInput'

export default function TrainingPlanOverview({
  plan,
  onSaved,
  readOnly = false,
}: {
  plan: TrainingPlan
  onSaved: (cycles: TrainingCycle[]) => void
  readOnly?: boolean
}) {
  const [cycles, setCycles] = useState(plan.cycles)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setCycles(plan.cycles)
    setError('')
  }, [plan.cycles])
  const macro = cycles.find((cycle) => cycle.type === 'macro')
  const dirty = JSON.stringify(cycles) !== JSON.stringify(plan.cycles)
  if (!macro) return null
  const updateMacro = (changes: Partial<TrainingCycle>) =>
    setCycles((current) =>
      current.map((cycle) => (cycle.id === macro.id ? { ...cycle, ...changes } : cycle))
    )
  const save = async () => {
    const validation = cycles.map((cycle) => validateTrainingCycle(cycle, cycles)).find(Boolean)
    if (validation || cycles.length > 100) {
      setError(validation || 'Este macrociclo ya tiene 100 ciclos.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await TrainingPlanCRUD.update(plan.id, cycles)
      if (!result?.ok) throw new Error('TRAINING_OVERVIEW_SAVE_FAILED')
      onSaved(cycles)
    } catch (cause) {
      reportInternalError('TRAINING_OVERVIEW_SAVE', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid min-w-0 gap-1">
      <MacroCyclePeriodInput
        hideTitle
        value={macro}
        title={macro.title}
        onTitleChange={(title) => updateMacro({ title })}
        onChange={updateMacro}
        disabled={busy}
        readOnly={readOnly}
      />
      <MacroCycleBarsInput
        macro={macro}
        cycles={cycles}
        onChange={setCycles}
        disabled={busy}
        readOnly={readOnly}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-(--c-error,#b91c1c)">
          {error}
        </p>
      )}
      {dirty && !readOnly && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCycles(plan.cycles)
              setError('')
            }}
            className="min-h-11 rounded-full border border-(--c-border) px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
          >
            Descartar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="min-h-11 rounded-full bg-(--c-ocean) px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  )
}
