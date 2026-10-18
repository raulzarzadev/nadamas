'use client'
import type { PaymentOrder } from '@/lib/payments/model'
import PaymentOrders from './PaymentOrders'
import { money } from './PaymentProductForm'

const RECENT_LIMIT = 5
const paidAt = (order: PaymentOrder) => order.reviewedAt || order.createdAt

/** Coach "Mis cobros": payments awaiting verification first, then this month's total and the latest payments. */
export default function CollectionsSummary({
  orders,
  busy,
  onReview,
  onDownload,
}: {
  orders: PaymentOrder[]
  busy: boolean
  onReview: (order: PaymentOrder, status: 'approved' | 'rejected') => void
  onDownload: (order: PaymentOrder) => void
}) {
  const pending = orders.filter((order) => order.status === 'pending')
  const recent = orders
    .filter((order) => order.status !== 'pending')
    .sort((a, b) => paidAt(b) - paidAt(a))
    .slice(0, RECENT_LIMIT)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const monthPaid = orders.filter(
    (order) => order.status === 'approved' && paidAt(order) >= monthStart
  )
  const monthTotal = monthPaid.reduce((sum, order) => sum + order.product.priceCents, 0)
  const monthName = now.toLocaleDateString('es-MX', { month: 'long' })

  return (
    <div className="grid gap-5">
      <section aria-labelledby="pending-payments-title" className="grid gap-2">
        <h2
          id="pending-payments-title"
          className="flex items-center gap-2 font-bold text-(--c-ocean)"
        >
          Pendientes de verificar
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length ? (
          <PaymentOrders
            orders={pending}
            canAccess={() => true}
            manager
            busy={busy}
            onReview={onReview}
            onUpload={() => {}}
            allowUpload={false}
            onDownload={onDownload}
          />
        ) : (
          <p className="rounded-xl bg-(--c-surface) p-3 text-sm text-(--c-text-2)">
            No tienes pagos por verificar.
          </p>
        )}
      </section>

      <section aria-labelledby="recent-payments-title" className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <h2 id="recent-payments-title" className="font-bold text-(--c-ocean)">
            Últimos pagos
          </h2>
          <p className="text-right text-xs text-(--c-text-2)">
            Cobrado en {monthName}
            <strong className="block text-lg leading-tight text-(--c-ocean)">
              {money(monthTotal)}
            </strong>
          </p>
        </div>
        {recent.length ? (
          <ul className="grid gap-2">
            {recent.map((order) => (
              <li
                key={order.id}
                className="flex items-center gap-3 rounded-xl border border-(--c-border) bg-white px-3 py-2"
              >
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-sm font-semibold text-(--c-ocean)">
                    {order.studentName}
                  </span>
                  <span className="truncate text-xs text-(--c-text-2)">
                    {order.product.name} ·{' '}
                    {new Date(paidAt(order)).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </span>
                <span className="grid shrink-0 justify-items-end gap-0.5">
                  <span
                    className={`text-sm font-bold ${order.status === 'approved' ? 'text-(--c-ocean)' : 'text-(--c-text-2) line-through'}`}
                  >
                    {money(order.product.priceCents)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${order.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}
                  >
                    {order.status === 'approved' ? 'Confirmado' : 'Rechazado'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-(--c-surface) p-3 text-sm text-(--c-text-2)">
            Todavía no has recibido pagos.
          </p>
        )}
      </section>
    </div>
  )
}
