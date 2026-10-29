'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { SubscriptionCRUD } from '@/firebase/subscriptions/main'
import type { SubscriptionSnapshot } from '@/lib/subscriptions/model'
import { planOverLimit, planOverLimitMessage } from '@/lib/subscriptions/plans'
import { PlanLimitText } from './PlanLimitNotice'
import { subscriptionDate, subscriptionState } from './subscription-ui'

export default function SchoolSubscriptionBanner() {
  const { selectedId } = useSchoolSelection()
  const pathname = usePathname()
  const [data, setData] = useState<SubscriptionSnapshot | null>(null)
  // Seat usage is costly to count: fetched once per school, not on every poll.
  const [plan, setPlan] = useState<SubscriptionSnapshot['plan']>(undefined)
  useEffect(() => {
    let active = true
    let usageLoaded = false
    setData(null)
    setPlan(undefined)
    async function load() {
      if (!selectedId) return
      try {
        const withUsage = !usageLoaded
        const next = await SubscriptionCRUD.get(selectedId, { usage: withUsage })
        if (!active) return
        if (withUsage) {
          usageLoaded = true
          setPlan(next.plan)
        }
        setData(next)
      } catch {
        /* The subscription page provides a retry; keep workspace available. */
      }
    }
    void load()
    window.addEventListener('nadamas:subscription-updated', load)
    window.addEventListener('focus', load)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 60_000)
    return () => {
      active = false
      window.removeEventListener('nadamas:subscription-updated', load)
      window.removeEventListener('focus', load)
      window.clearInterval(timer)
    }
  }, [selectedId])
  if (!data || pathname === '/school/subscription' || data.schoolId !== selectedId) return null
  const provisional = data.access.state === 'pending_review'
  const state = provisional ? 'provisional' : data.access.state
  const overLimit = !!plan && planOverLimit(plan.limits, plan.usage)
  if (
    !overLimit &&
    (state === 'exempt' || (state === 'active' && !data.subscription?.cancelAtPeriodEnd))
  )
    return null
  if (plan && (state === 'exempt' || (state === 'active' && !data.subscription?.cancelAtPeriodEnd)))
    return <OverLimitNotice message={planOverLimitMessage(plan.limits)} />
  return (
    <aside
      aria-label="Estado de suscripción"
      className={`mb-4 flex flex-wrap items-center justify-between gap-2 border-y px-4 py-3 text-sm sm:rounded-xl sm:border ${!data.access.fullAccess ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-(--c-border) bg-white'}`}
    >
      <div className="min-w-0">
        <p className="font-bold">{subscriptionState[state] || 'Suscripción'}</p>
        <p className="mt-1 text-xs">
          {provisional
            ? 'Tu escuela sigue funcionando mientras verificamos tu transferencia.'
            : !data.access.fullAccess
              ? 'Consulta tu historial y atiende reservas existentes. Las nuevas operaciones requieren suscripción.'
              : data.subscription?.cancelAtPeriodEnd
                ? 'La renovación está cancelada.'
                : `Hasta el ${subscriptionDate(data.access.accessEndsAt)}.`}
        </p>
        {overLimit && plan && (
          <p role="status" className="mt-2 text-xs font-semibold">
            <PlanLimitText message={planOverLimitMessage(plan.limits)} />
          </p>
        )}
      </div>
      {data.manager ? (
        <Link
          href="/school/subscription"
          className="inline-flex min-h-11 items-center font-bold underline focus-visible:outline-2"
        >
          Ver suscripción
        </Link>
      ) : (
        <p className="text-xs">La persona responsable administra la suscripción.</p>
      )}
    </aside>
  )
}

function OverLimitNotice({ message }: { message: string }) {
  return (
    <aside
      aria-label="Límites del plan"
      className="mb-4 border-y border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:rounded-xl sm:border"
    >
      <p role="status">
        <PlanLimitText message={message} />
      </p>
    </aside>
  )
}
