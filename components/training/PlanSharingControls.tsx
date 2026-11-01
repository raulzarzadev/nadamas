'use client'

import { useState } from 'react'
import { FiShare2 } from 'react-icons/fi'
import { TrainingPlanCRUD } from '@/firebase/training-plans/main'
import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import { shareLink, trainingPlanShareText, trainingPlanUrl } from '@/lib/client/share-link'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import PlanSubscribersSheet from './PlanSubscribersSheet'

interface Props {
  plan: TrainingPlan
  onChange: (plan: TrainingPlan) => void
}

export default function PlanSharingControls({ plan, onChange }: Props) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [subscribersOpen, setSubscribersOpen] = useState(false)
  const count = plan.subscriberCount ?? 0

  async function share() {
    if (busy) return
    setError('')
    setStatus('')
    setBusy(true)
    try {
      if (plan.visibility !== 'public') {
        const result = await TrainingPlanCRUD.setVisibility(plan.id, 'public')
        if (!result?.ok) throw new Error('VISIBILITY_FAILED')
        onChange({ ...plan, visibility: 'public' })
      }
      const title = plan.summary?.title || 'Macrociclo'
      const outcome = await shareLink(
        trainingPlanUrl(plan.id),
        title,
        trainingPlanShareText(title, true)
      )
      if (outcome === 'copied') setStatus('Enlace copiado')
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_SHARE', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {count > 0 && (
        <button
          type="button"
          onClick={() => setSubscribersOpen(true)}
          className="inline-flex min-h-7 items-center justify-center rounded-full px-2 text-[10px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
        >
          {count === 1 ? '1 suscriptor' : `${count} suscriptores`}
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void share()}
        className="inline-flex min-h-7 items-center justify-center gap-1 rounded-full border border-(--c-border) bg-white px-2 text-[10px] font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
      >
        <FiShare2 aria-hidden="true" />
        Compartir
      </button>
      <p role="status" className="basis-full text-right text-[10px] text-(--c-text-2) empty:hidden">
        {status}
      </p>
      {error && (
        <p role="alert" className="basis-full text-right text-[10px] text-(--c-error,#b91c1c)">
          {error}
        </p>
      )}
      <PlanSubscribersSheet
        planId={plan.id}
        open={subscribersOpen}
        onClose={() => setSubscribersOpen(false)}
        onCountChange={(next) => onChange({ ...plan, subscriberCount: next })}
      />
    </div>
  )
}
