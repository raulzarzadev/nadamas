'use client'

import { useState } from 'react'
import { FiShare2 } from 'react-icons/fi'
import { TrainingPlanCRUD } from '@/firebase/training-plans/main'
import { TrainingPlanSharing } from '@/firebase/training-plans/sharing'
import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import { shareLink, trainingPlanUrl } from '@/lib/client/share-link'
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
  const [token, setToken] = useState('')
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false)
  const [subscribersOpen, setSubscribersOpen] = useState(false)
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
      let invite: string | undefined
      if (!isPublic) {
        invite = token || (await TrainingPlanSharing.createInvite(plan.id))
        setToken(invite)
      }
      const outcome = await shareLink(
        trainingPlanUrl(plan.id, invite),
        plan.summary?.title ?? 'Macrociclo'
      )
      if (outcome === 'copied') setStatus('Enlace copiado')
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_SHARE', cause)
      setError(GENERIC_USER_ERROR)
    }
  }

  async function regenerate() {
    if (busy) return
    setBusy(true)
    setError('')
    setStatus('')
    setConfirmingRegenerate(false)
    try {
      setToken(await TrainingPlanSharing.createInvite(plan.id))
      setStatus('Enlace nuevo listo. Pulsa Compartir para enviarlo.')
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_INVITE', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setBusy(false)
    }
  }

  const secondaryClass =
    'inline-flex min-h-11 items-center justify-center rounded-full border border-(--c-border) bg-white px-3 text-xs font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'

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
            <button
              type="button"
              onClick={() => setSubscribersOpen(true)}
              className="min-h-11 text-left font-semibold text-(--c-ocean) underline focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
            >
              {count === 1 ? '1 suscriptor' : `${count} suscriptores`}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!isPublic && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmingRegenerate(true)}
            className={secondaryClass}
          >
            Generar nuevo enlace
          </button>
        )}
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-(--c-border) bg-white px-3 text-xs font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong)"
        >
          <FiShare2 aria-hidden="true" />
          Compartir
        </button>
      </div>
      {confirmingRegenerate && (
        <div className="flex basis-full flex-wrap items-center gap-2 text-xs">
          <p className="flex-1">Los enlaces anteriores dejarán de funcionar.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void regenerate()}
            className={secondaryClass}
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => setConfirmingRegenerate(false)}
            className={secondaryClass}
          >
            Cancelar
          </button>
        </div>
      )}
      <p role="status" className="basis-full text-xs text-(--c-text-2) empty:hidden">
        {status}
      </p>
      {error && (
        <p role="alert" className="basis-full text-xs text-(--c-error,#b91c1c)">
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
