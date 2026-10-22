'use client'

import { useEffect, useState } from 'react'
import Avatar from '@/components/ui/avatar'
import Sheet from '@/components/ui/sheet'
import { type PlanSubscriber, TrainingPlanSharing } from '@/firebase/training-plans/sharing'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'

interface Props {
  planId: string
  open: boolean
  onClose: () => void
  onCountChange: (count: number) => void
}

export default function PlanSubscribersSheet({ planId, open, onClose, onCountChange }: Props) {
  const [subscribers, setSubscribers] = useState<PlanSubscriber[] | null>(null)
  const [removing, setRemoving] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let active = true
    setSubscribers(null)
    setError('')
    TrainingPlanSharing.subscribers(planId)
      .then((rows) => {
        if (active) setSubscribers(rows)
      })
      .catch((cause) => {
        reportInternalError('TRAINING_PLAN_SUBSCRIBERS', cause)
        if (active) {
          setSubscribers([])
          setError(GENERIC_USER_ERROR)
        }
      })
    return () => {
      active = false
    }
  }, [open, planId])

  async function remove(uid: string) {
    if (removing || !subscribers) return
    setRemoving(uid)
    setError('')
    try {
      await TrainingPlanSharing.removeSubscriber(planId, uid)
      const next = subscribers.filter((row) => row.uid !== uid)
      setSubscribers(next)
      onCountChange(next.length)
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_REMOVE_SUBSCRIBER', cause)
      setError(GENERIC_USER_ERROR)
    } finally {
      setRemoving('')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="Suscriptores">
      <h2 className="mb-3 text-lg font-extrabold">Suscriptores</h2>
      {subscribers === null && (
        <p role="status" className="text-sm text-(--c-text-2)">
          Cargando…
        </p>
      )}
      {subscribers?.length === 0 && !error && (
        <p className="text-sm text-(--c-text-2)">Aún no hay suscriptores.</p>
      )}
      {error && (
        <p role="alert" className="mb-2 text-sm text-(--c-error,#b91c1c)">
          {error}
        </p>
      )}
      <ul className="grid gap-2">
        {subscribers?.map((row) => (
          <li key={row.uid} className="flex min-w-0 items-center gap-3">
            <Avatar name={row.name} src={row.photo} size={40} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {row.name || 'Atleta'}
            </span>
            <button
              type="button"
              disabled={Boolean(removing)}
              aria-label={`Quitar a ${row.name || 'Atleta'}`}
              onClick={() => void remove(row.uid)}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-(--c-border) bg-white px-3 text-xs font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  )
}
