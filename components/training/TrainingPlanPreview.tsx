'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { FiCheckCircle, FiShare2 } from 'react-icons/fi'
import TrainingSessionCard from '@/components/coach/TrainingSessionCard'
import Avatar from '@/components/ui/avatar'
import { CoachCRUD } from '@/firebase/coaches/main'
import { type PlanPreview, TrainingPlanSharing } from '@/firebase/training-plans/sharing'
import type { TrainingPlan } from '@/firebase/training-plans/training-plan.model'
import { AuthedApiError } from '@/lib/client/authed-api'
import { shareLink, trainingPlanUrl } from '@/lib/client/share-link'
import {
  getTrainingDateNeighbors,
  getTrainingSessionsForDate,
  localCalendarDate,
  sessionHasTraining,
} from '@/lib/today-training'
import {
  planRangeLabel,
  subscriberCountLabel,
  trainingPlanStatus,
  trainingPlanStatusLabel,
  weekdayLabels,
} from '@/lib/training-plan-summary'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import PlanSharingControls from './PlanSharingControls'

const NOT_AVAILABLE = 'Este entreno no está disponible o el enlace ya no es válido.'
const actionClass =
  'inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-(--c-border) bg-white px-4 text-sm font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'
const primaryClass =
  'inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-(--c-ocean) px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'

const dayLabel = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })

export default function TrainingPlanPreview({
  planId,
  invite,
}: {
  planId: string
  invite?: string
}) {
  const router = useRouter()
  const [preview, setPreview] = useState<PlanPreview | null>(null)
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const today = localCalendarDate(new Date())

  useEffect(() => {
    let active = true
    setLoading(true)
    setMessage('')
    TrainingPlanSharing.preview(planId, invite)
      .then((result) => {
        if (active) setPreview(result)
        return result.ownerId ? CoachCRUD.getPublic(result.ownerId).catch(() => null) : null
      })
      .then((coach) => {
        if (active) setVerified(coach?.verification?.status === 'verified')
      })
      .catch((cause) => {
        if (!active) return
        if (cause instanceof AuthedApiError && cause.status === 404) setMessage(NOT_AVAILABLE)
        else {
          reportInternalError('TRAINING_PLAN_PREVIEW', cause)
          setMessage(GENERIC_USER_ERROR)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [planId, invite])

  const samplePlan = useMemo<TrainingPlan | null>(
    () =>
      preview
        ? { id: preview.id, userId: preview.ownerId, createdAt: 0, cycles: preview.cycles }
        : null,
    [preview]
  )
  const sample = useMemo(() => {
    if (!samplePlan) return null
    const todays = getTrainingSessionsForDate([samplePlan], today).filter(sessionHasTraining)
    if (todays.length) return { date: today, sessions: todays }
    const { next, previous } = getTrainingDateNeighbors([samplePlan], today)
    const date = next ?? previous
    if (!date) return null
    return {
      date,
      sessions: getTrainingSessionsForDate([samplePlan], date).filter(sessionHasTraining),
    }
  }, [samplePlan, today])

  async function change(action: 'subscribe' | 'unsubscribe') {
    if (busy || !preview) return
    setBusy(true)
    setError('')
    try {
      if (action === 'subscribe') await TrainingPlanSharing.subscribe(planId, invite)
      else await TrainingPlanSharing.unsubscribe(planId)
      const next = await TrainingPlanSharing.preview(planId, invite)
      setPreview(next)
      // The token served its purpose; keep it out of history and analytics.
      if (action === 'subscribe' && invite) router.replace(`/athlete/training/plans/${planId}`)
    } catch (cause) {
      if (cause instanceof AuthedApiError && cause.status === 404) setError(NOT_AVAILABLE)
      else {
        reportInternalError('TRAINING_PLAN_SUBSCRIPTION', cause)
        setError(GENERIC_USER_ERROR)
      }
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    setError('')
    setStatus('')
    try {
      const outcome = await shareLink(
        trainingPlanUrl(planId, invite),
        preview?.summary.title ?? 'Entreno'
      )
      if (outcome === 'copied') setStatus('Enlace copiado')
    } catch (cause) {
      reportInternalError('TRAINING_PLAN_SHARE', cause)
      setError(GENERIC_USER_ERROR)
    }
  }

  if (loading)
    return (
      <p role="status" className="py-10 text-center text-sm text-(--c-text-2)">
        Cargando entreno…
      </p>
    )
  if (!preview)
    return (
      <p role="alert" className="py-10 text-center text-sm">
        {message || NOT_AVAILABLE}
      </p>
    )

  const { summary } = preview
  const macro = preview.cycles.find((cycle) => cycle.type === 'macro')
  const mesos = preview.cycles
    .filter((cycle) => cycle.type === 'meso' && cycle.parentId === macro?.id)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  const planStatus = trainingPlanStatusLabel(
    trainingPlanStatus(summary.startDate, summary.endDate, today)
  )
  const ownerPlan: TrainingPlan | null =
    preview.isOwner && samplePlan
      ? {
          ...samplePlan,
          visibility: preview.visibility,
          summary,
          subscriberCount: preview.subscriberCount,
        }
      : null

  return (
    <article className="mx-auto grid max-w-3xl min-w-0 gap-4 px-1 py-4 sm:px-0">
      <header className="grid min-w-0 gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={summary.authorName} src={summary.authorPhoto} size={40} />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-(--c-text-2)">
            {summary.authorName || 'Entrenador'}
          </p>
          {verified && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-(--c-ocean)">
              <FiCheckCircle aria-hidden="true" />
              Coach verificado
            </span>
          )}
        </div>
        <h1 className="wrap-anywhere text-2xl font-extrabold">{summary.title}</h1>
        <p className="text-sm text-(--c-text-2)">
          {planRangeLabel(summary.startDate, summary.endDate)}
        </p>
        <p className="flex flex-wrap gap-x-3 text-xs font-semibold text-(--c-text-2)">
          {summary.sessionWeekdays.length > 0 && (
            <span>{weekdayLabels(summary.sessionWeekdays)}</span>
          )}
          <span>{subscriberCountLabel(preview.subscriberCount)}</span>
          <span>{planStatus}</span>
        </p>
        {summary.goal.trim() && (
          <p className="whitespace-pre-wrap wrap-anywhere text-sm">{summary.goal}</p>
        )}
        {(macro?.content ?? summary.content).trim() && (
          <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed text-(--c-text-2)">
            {macro?.content || summary.content}
          </p>
        )}
      </header>

      {ownerPlan ? (
        <PlanSharingControls
          key={preview.id}
          plan={ownerPlan}
          onChange={(next) =>
            setPreview({
              ...preview,
              visibility: next.visibility ?? preview.visibility,
              subscriberCount: next.subscriberCount ?? preview.subscriberCount,
            })
          }
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {preview.isSubscribed ? (
            <>
              <span className="inline-flex min-h-11 items-center gap-1 rounded-full bg-(--c-surface) px-4 text-sm font-semibold text-(--c-ocean)">
                <FiCheckCircle aria-hidden="true" />
                Suscrito
              </span>
              <Link
                href={`/athlete/training?plan=${encodeURIComponent(planId)}`}
                className={primaryClass}
              >
                Ver entreno de hoy
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={() => void change('unsubscribe')}
                className={actionClass}
              >
                Dejar de seguir
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void change('subscribe')}
              className={primaryClass}
            >
              Suscribirme
            </button>
          )}
          <button type="button" onClick={() => void share()} className={actionClass}>
            <FiShare2 aria-hidden="true" />
            Compartir
          </button>
        </div>
      )}
      <p role="status" className="text-xs text-(--c-text-2) empty:hidden">
        {status}
      </p>
      {error && (
        <p role="alert" className="text-sm text-(--c-error,#b91c1c)">
          {error}
        </p>
      )}

      {mesos.length > 0 && (
        <section aria-label="Mesociclos" className="grid gap-2">
          <h2 className="text-lg font-extrabold">Mesociclos</h2>
          <ul className="grid gap-2">
            {mesos.map((meso) => (
              <li key={meso.id} className="rounded-xl border border-(--c-border) bg-white p-3">
                <p className="wrap-anywhere text-sm font-bold">{meso.title}</p>
                <p className="text-xs text-(--c-text-2)">
                  {planRangeLabel(meso.startDate, meso.endDate)}
                </p>
                {meso.goal.trim() && (
                  <p className="wrap-anywhere text-xs text-(--c-text-2)">{meso.goal}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sample && sample.sessions.length > 0 && (
        <section aria-label="Entreno de ejemplo" className="grid gap-2">
          <h2 className="text-lg font-extrabold">Entreno de ejemplo</h2>
          <p className="text-xs text-(--c-text-2)">{dayLabel(sample.date)}</p>
          {sample.sessions.map((session) => (
            <TrainingSessionCard
              key={`${session.micro.id}-${session.sessionIndex}`}
              session={session}
            />
          ))}
        </section>
      )}
    </article>
  )
}
