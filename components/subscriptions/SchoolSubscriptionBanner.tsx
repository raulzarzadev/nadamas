'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import { SubscriptionCRUD } from '@/firebase/subscriptions/main'
import type { SubscriptionSnapshot } from '@/lib/subscriptions/model'
import { subscriptionDate, subscriptionState } from './subscription-ui'

export default function SchoolSubscriptionBanner() {
  const { selectedId } = useSchoolSelection()
  const pathname = usePathname()
  const [data, setData] = useState<SubscriptionSnapshot | null>(null)
  useEffect(() => {
    let active = true
    setData(null)
    async function load() {
      if (!selectedId) return
      try {
        const next = await SubscriptionCRUD.get(selectedId)
        if (active) setData(next)
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
  if (
    state === 'trialing' ||
    state === 'exempt' ||
    (state === 'active' && !data.subscription?.cancelAtPeriodEnd)
  )
    return null
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
