'use client'
import { useEffect, useState } from 'react'
import { FiChevronRight } from 'react-icons/fi'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { getAuthed } from '@/lib/client/authed-api'
import { productTerms } from '@/lib/payments/format'
import type { PaymentProduct } from '@/lib/payments/model'
import type { NamedPaymentScope } from './MyPlansList'
import { money } from './PaymentProductForm'

type PopularPlan = { scope: NamedPaymentScope; product: PaymentProduct }

/** Top-selling plans (max 5) shown under Pagos' "Buscar" view. */
export default function PopularPlansList({
  schoolId,
  onOpen,
}: {
  schoolId?: string
  onOpen: (scope: NamedPaymentScope) => void
}) {
  const path = `/api/payments/popular${schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : ''}`
  const [result, setResult] = useState<{ path: string; plans: PopularPlan[] | null }>()
  useEffect(() => {
    let active = true
    getAuthed(path)
      .then(
        (response) =>
          response.json() as Promise<{
            plans: Array<{ scope: PopularPlan['scope']; name: string; product: PaymentProduct }>
          }>
      )
      .then((payload) => {
        if (active)
          setResult({
            path,
            plans: payload.plans.map(({ scope, name, product }) => ({
              scope: { ...scope, name },
              product,
            })),
          })
      })
      .catch(() => {
        if (active) setResult({ path, plans: null })
      })
    return () => {
      active = false
    }
  }, [path])

  if (!result || result.path !== path) return <ProfileLoadingSkeleton />
  return (
    <section aria-labelledby="popular-plans-title" className="grid gap-3">
      <h2 id="popular-plans-title" className="text-base font-bold text-(--c-ocean)">
        Planes populares
      </h2>
      {result.plans === null ? (
        <p role="alert" className="text-sm text-(--c-text-2)">
          No pudimos cargar los planes. Inténtalo de nuevo más tarde.
        </p>
      ) : result.plans.length ? (
        <ul className="grid gap-3">
          {result.plans.map(({ scope, product }) => (
            <li key={`${scope.kind}:${scope.id}:${product.id}`}>
              <button
                type="button"
                onClick={() => onOpen(scope)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-(--c-border) bg-white p-3 text-left transition-colors hover:border-(--c-aqua-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
              >
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <strong className="truncate text-base text-(--c-ocean)">{product.name}</strong>
                  <span className="truncate text-xs font-semibold text-(--c-text-2)">
                    {scope.name}
                  </span>
                  <span className="text-xs text-(--c-text-2)">
                    {money(product.priceCents)} · {productTerms(product)}
                  </span>
                </span>
                <FiChevronRight aria-hidden="true" className="shrink-0 text-(--c-text-2)" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-(--c-text-2)">Todavía no hay planes disponibles.</p>
      )}
    </section>
  )
}
