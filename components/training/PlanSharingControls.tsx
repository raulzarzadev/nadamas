'use client'

import { useState } from 'react'
import { FiShare2 } from 'react-icons/fi'
import { TrainingPlanCRUD } from '@/firebase/training-plans/main'
import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import { shareLink, trainingPlanUrl } from '@/lib/client/share-link'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

interface Props {
  plan: TrainingPlan
  onChange: (plan: TrainingPlan) => void
}

export default function PlanSharingControls({ plan, onChange }: Props) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const isPublic = (plan.visibility ?? 'private') === 'public'
  const count = plan.subscriberCount ?? 0

  async function toggle() {
    if (busy) return
    const next = isPublic ? 'private' : 'public'
    setBusy(true)
    setError('')
    setStatus('')
    onChange({ ...plan, visibility: next })
    try {
      const result = await TrainingPlanCRUD.setVisibility(plan.id, next)
      if (!result?.ok) throw new Error('VISIBILITY_FAILED')
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_VISIBILITY', cause)
      onChange({ ...plan, visibility: isPublic ? 'public' : 'private' })
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    setError('')
    setStatus('')
    try {
      const outcome = await shareLink(trainingPlanUrl(plan.id), plan.summary?.title ?? 'Macrociclo')
      if (outcome === 'copied') setStatus('Enlace copiado')
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_SHARE', cause)
      setError(GENERIC_USER_ERROR)
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--c-border) bg-(--c-surface) px-3 py-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label="Público"
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50 ${isPublic ? 'bg-(--c-ocean)' : 'bg-(--c-border)'}`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-5' : ''}`}
          />
        </button>
        <div className="text-xs">
          <p className="font-semibold">Público</p>
          <p className="text-(--c-text-2)">
            {isPublic
              ? 'Cualquiera puede encontrarlo y seguirlo.'
              : 'Solo tú y las personas que invites.'}
          </p>
          {count > 0 && (
            <p className="text-(--c-text-2)">
              {count === 1 ? '1 suscriptor' : `${count} suscriptores`}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-(--c-border) bg-white px-3 text-xs font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
      >
        <FiShare2 aria-hidden="true" />
        Compartir
      </button>
      <p role="status" className="basis-full text-xs text-(--c-text-2) empty:hidden">
        {status}
      </p>
      {error && (
        <p role="alert" className="basis-full text-xs text-(--c-error,#b91c1c)">
          {error}
        </p>
      )}
    </div>
  )
}
