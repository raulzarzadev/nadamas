'use client'
import { useCallback, useEffect, useState } from 'react'
import { FiChevronDown, FiChevronRight, FiDownload, FiUpload } from 'react-icons/fi'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import { PaymentCRUD } from '@/firebase/payments/main'
import { getAuthed, postAuthed } from '@/lib/client/authed-api'
import { localPaymentDate } from '@/lib/payments/engine'
import { formatPlanDate, productTerms } from '@/lib/payments/format'
import { paymentMessage } from '@/lib/payments/messages'
import type {
  PaymentGrant,
  PaymentOrder,
  PaymentProduct,
  PaymentScope,
  PaymentSnapshot,
} from '@/lib/payments/model'
import { receiptData } from './PaymentOrders'
import { money } from './PaymentProductForm'

export type NamedPaymentScope = PaymentScope & { name: string }

type Tone = 'ok' | 'warn' | 'bad' | 'muted'
const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-emerald-50 text-emerald-800',
  warn: 'bg-amber-50 text-amber-800',
  bad: 'bg-rose-50 text-rose-800',
  muted: 'bg-slate-100 text-slate-600',
}
const STATUS: Record<PaymentOrder['status'], { label: string; tone: Tone }> = {
  pending: { label: 'Pago pendiente', tone: 'warn' },
  approved: { label: 'Pagado', tone: 'ok' },
  rejected: { label: 'Rechazado', tone: 'bad' },
}

type PlanItem = {
  key: string
  scope: NamedPaymentScope
  name: string
  studentName?: string
  summary: string
  status: { label: string; tone: Tone }
  pending: boolean
  product: PaymentProduct
  grant?: PaymentGrant
  // Payments shown when the card is expanded: the plan's own orders, or the pending one.
  orders: PaymentOrder[]
  // yyyy-mm-dd used to list past items newest first.
  sortAt: string
}

const scopeQuery = (scope: PaymentScope) =>
  `${scope.kind === 'school' ? 'schoolId' : 'coachId'}=${encodeURIComponent(scope.id)}`
const scopePath = (scope: PaymentScope) => `/api/payments?${scopeQuery(scope)}&view=student`
const receiptPath = (scope: PaymentScope, order: PaymentOrder) =>
  `/api/payments/receipts?${scopeQuery(scope)}&view=student&orderId=${encodeURIComponent(order.id)}`

// One scope's plans: current grants (classes or period left) and pending payments, plus
// past ones (expired, used up, or rejected payments) for the collapsed history.
function planItems(scope: NamedPaymentScope, data: PaymentSnapshot) {
  const today = localPaymentDate(Date.now(), data.settings.timezone)
  const showStudent = data.students.length > 1
  const current: PlanItem[] = []
  const past: PlanItem[] = []
  for (const student of data.students) {
    for (const grant of data.accounts[student.id]?.grants || []) {
      if (grant.startsOn > today) continue
      const expired = Boolean(grant.endsBefore && today >= grant.endsBefore)
      const left = grant.product.classes - grant.used - grant.reserved
      const usedUp = grant.product.mode === 'classes' && left <= 0
      const item: PlanItem = {
        key: `${scope.kind}:${scope.id}:${grant.id}`,
        scope,
        name: grant.product.name,
        studentName: showStudent ? student.name : undefined,
        summary: expired
          ? `Venció el ${formatPlanDate(grant.endsBefore as string)}`
          : usedUp
            ? `Usaste ${grant.used} de ${grant.product.classes} clases`
            : grant.endsBefore
              ? `Vence el ${formatPlanDate(grant.endsBefore)}`
              : 'Sin vencimiento',
        status: expired
          ? { label: 'Vencido', tone: 'muted' }
          : usedUp
            ? { label: 'Agotado', tone: 'muted' }
            : grant.product.mode === 'classes'
              ? { label: `${left} ${left === 1 ? 'clase' : 'clases'}`, tone: 'ok' }
              : { label: 'Vigente', tone: 'ok' },
        pending: false,
        product: grant.product,
        grant,
        orders: data.orders.filter(
          (order) =>
            order.studentId === student.id &&
            order.product.id === grant.product.id &&
            order.status === 'approved'
        ),
        sortAt: grant.endsBefore || grant.startsOn,
      }
      ;(expired || usedUp ? past : current).push(item)
    }
  }
  for (const order of data.orders) {
    if (order.status === 'approved') continue
    const item: PlanItem = {
      key: `${scope.kind}:${scope.id}:order:${order.id}`,
      scope,
      name: order.product.name,
      studentName: showStudent ? order.studentName : undefined,
      summary: `${money(order.product.priceCents)} · ${productTerms(order.product)}`,
      status: STATUS[order.status],
      pending: order.status === 'pending',
      product: order.product,
      orders: [order],
      sortAt: new Date(order.createdAt).toISOString().slice(0, 10),
    }
    ;(order.status === 'pending' ? current : past).push(item)
  }
  return { current, past }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-0.5 rounded-lg bg-(--c-surface) px-3 py-2">
      <dt className="text-[11px] text-(--c-text-2)">{label}</dt>
      <dd className="truncate text-sm font-semibold text-(--c-ocean)">{value}</dd>
    </div>
  )
}

// Key numbers of the plan as tiles: price, what it includes, validity and usage.
function PlanStats({ product, grant }: { product: PaymentProduct; grant?: PaymentGrant }) {
  const limits = [
    product.perDay && `${product.perDay} al día`,
    product.perWeek && `${product.perWeek} a la semana`,
    product.perPeriod && `${product.perPeriod} por periodo`,
  ].filter(Boolean)
  const includes =
    product.mode === 'classes'
      ? `${product.classes} ${product.classes === 1 ? 'clase' : 'clases'}`
      : `${product.months} ${product.months === 1 ? 'mes' : 'meses'}`
  const validity = grant
    ? grant.endsBefore
      ? `Hasta ${formatPlanDate(grant.endsBefore)}`
      : 'Sin vencimiento'
    : product.mode === 'classes'
      ? product.expiryDays
        ? `${product.expiryDays} días`
        : 'Sin caducidad'
      : 'Desde activación'
  return (
    <div className="grid gap-2">
      <dl className={`grid gap-2 ${grant ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        <Stat label="Precio" value={money(product.priceCents)} />
        <Stat label="Incluye" value={includes} />
        <Stat label="Vigencia" value={validity} />
        {grant && (
          <Stat
            label="Uso"
            value={`${grant.used} usadas${grant.reserved ? ` · ${grant.reserved} reservadas` : ''}`}
          />
        )}
      </dl>
      {(grant || limits.length > 0) && (
        <p className="text-xs text-(--c-text-2)">
          {grant ? `Activo desde el ${formatPlanDate(grant.startsOn)}` : ''}
          {grant && limits.length ? ' · ' : ''}
          {limits.length ? `Límite: ${limits.join(' · ')}` : ''}
        </p>
      )}
    </div>
  )
}

/** "Mis planes": the athlete's current plans across the given coaches/schools. */
export default function MyPlansList({
  scopes,
  onOpen,
}: {
  scopes: NamedPaymentScope[]
  onOpen: (scope: NamedPaymentScope) => void
}) {
  const scopesKey = scopes.map((scope) => `${scope.kind}:${scope.id}`).join('|')
  const [result, setResult] = useState<{
    key: string
    items: PlanItem[]
    past: PlanItem[]
    failed: boolean
  }>()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: scopesKey captures the scope list
  const load = useCallback(
    () =>
      Promise.allSettled(
        scopes.map(async (scope) => planItems(scope, await PaymentCRUD.get(scopePath(scope))))
      ).then((settled) => {
        const loaded = settled.flatMap((item) => (item.status === 'fulfilled' ? [item.value] : []))
        return {
          key: scopesKey,
          items: loaded.flatMap((item) => item.current),
          past: loaded
            .flatMap((item) => item.past)
            .sort((a, b) => b.sortAt.localeCompare(a.sortAt)),
          failed: settled.some((item) => item.status === 'rejected'),
        }
      }),
    [scopesKey]
  )
  useEffect(() => {
    let active = true
    load().then((next) => {
      if (active) setResult(next)
    })
    return () => {
      active = false
    }
  }, [load])

  async function perform(action: () => Promise<void>, success: string) {
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      await action()
      setResult(await load())
      setMessage({ text: success, error: false })
    } catch (error) {
      setMessage({ text: paymentMessage(error), error: true })
    } finally {
      setBusy(false)
    }
  }

  const upload = (scope: PaymentScope, order: PaymentOrder, file: File) =>
    perform(async () => {
      await postAuthed(receiptPath(scope, order), { data: await receiptData(file) })
    }, 'Comprobante enviado. Espera la confirmación.')
  const download = (scope: PaymentScope, order: PaymentOrder) =>
    perform(async () => {
      const response = await getAuthed(receiptPath(scope, order))
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = order.receiptType === 'application/pdf' ? 'comprobante.pdf' : 'comprobante'
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'Comprobante descargado.')

  const renderItem = (item: PlanItem) => {
    const open = expanded === item.key
    const panelId = `plan-${item.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
    return (
      <li
        key={item.key}
        className={`overflow-hidden rounded-xl border bg-white transition-shadow ${open ? 'border-(--c-aqua-strong) shadow-[var(--shadow-sm)]' : 'border-(--c-border)'}`}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setExpanded(open ? null : item.key)}
          className="flex w-full cursor-pointer items-start gap-3 p-3 text-left transition-colors hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
        >
          <span className="grid min-w-0 flex-1 gap-0.5">
            <strong className="truncate text-base text-(--c-ocean)">{item.name}</strong>
            <span className="truncate text-xs font-semibold text-(--c-text-2)">
              {item.scope.name}
              {item.studentName ? ` · ${item.studentName}` : ''}
            </span>
            {!open && <span className="truncate text-xs text-(--c-text-2)">{item.summary}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[item.status.tone]}`}
            >
              {item.status.label}
            </span>
            <FiChevronDown
              aria-hidden="true"
              className={`text-(--c-text-2) transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </span>
        </button>
        {open && (
          <div id={panelId} className="grid gap-4 border-t border-(--c-border) p-3">
            <PlanStats product={item.product} grant={item.grant} />
            {item.orders.length > 0 && (
              <section className="grid gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-(--c-text-2)">
                  {item.orders.length === 1 ? 'Pago' : 'Pagos'}
                </h3>
                <ul className="grid gap-2">
                  {item.orders.map((order) => {
                    const canUpload = order.status === 'pending' && order.method === 'transfer'
                    const actions = Number(Boolean(order.receiptPath)) + Number(canUpload)
                    return (
                      <li
                        key={order.id}
                        className="grid gap-3 rounded-lg border border-(--c-border) p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="grid min-w-0 gap-0.5">
                            <span className="text-sm font-semibold text-(--c-ocean)">
                              {order.method === 'cash' ? 'Efectivo' : 'Transferencia'}
                            </span>
                            <span className="text-xs text-(--c-text-2)">
                              {new Date(order.createdAt).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </span>
                          {!item.pending && (
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[STATUS[order.status].tone]}`}
                            >
                              {STATUS[order.status].label}
                            </span>
                          )}
                        </div>
                        {canUpload && !order.receiptPath && (
                          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            Sube tu comprobante para que confirmen el pago (PNG, JPG o PDF, máximo 2
                            MB).
                          </p>
                        )}
                        {actions > 0 && (
                          <div className={`grid gap-2 ${actions > 1 ? 'grid-cols-2' : ''}`}>
                            {order.receiptPath && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void download(item.scope, order)}
                                className="btn btn-outline min-h-11 gap-1.5 text-xs"
                              >
                                <FiDownload aria-hidden="true" /> Ver comprobante
                              </button>
                            )}
                            {canUpload && (
                              <label
                                className={`btn relative min-h-11 gap-1.5 text-xs ${order.receiptPath ? 'btn-outline' : 'btn-primary'} ${busy ? 'pointer-events-none opacity-50' : ''}`}
                              >
                                <FiUpload aria-hidden="true" />
                                {order.receiptPath ? 'Cambiar' : 'Subir comprobante'}
                                <input
                                  disabled={busy}
                                  aria-label={`${order.receiptPath ? 'Cambiar' : 'Subir'} comprobante de ${order.product.name}`}
                                  type="file"
                                  accept="image/png,image/jpeg,application/pdf"
                                  className="absolute inset-0 cursor-pointer opacity-0"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0]
                                    if (file) void upload(item.scope, order, file)
                                    event.target.value = ''
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
            <button
              type="button"
              onClick={() => onOpen(item.scope)}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1 justify-self-end text-xs font-semibold text-(--c-ocean) hover:underline"
            >
              Ver planes de {item.scope.name} <FiChevronRight aria-hidden="true" />
            </button>
          </div>
        )}
      </li>
    )
  }

  if (!scopes.length)
    return (
      <p className="p-3 text-sm text-(--c-text-2)">
        Todavía no tienes planes. Busca un entrenador o escuela para adquirir uno.
      </p>
    )
  if (!result || result.key !== scopesKey) return <ProfileLoadingSkeleton />
  return (
    <section aria-label="Mis planes" className="grid gap-3">
      {result.failed && (
        <p role="alert" className="text-sm text-(--c-text-2)">
          No pudimos cargar algunos de tus planes. Inténtalo de nuevo más tarde.
        </p>
      )}
      {message && (
        <p
          role={message.error ? 'alert' : 'status'}
          className={`text-sm ${message.error ? 'text-rose-700' : 'text-emerald-800'}`}
        >
          {message.text}
        </p>
      )}
      {result.items.length ? (
        <ul className="grid gap-3">{result.items.map(renderItem)}</ul>
      ) : (
        !result.failed && (
          <p className="p-3 text-sm text-(--c-text-2)">
            No tienes planes vigentes. Busca un entrenador o escuela para adquirir uno.
          </p>
        )
      )}
      {result.past.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-(--c-text-2) hover:text-(--c-ocean) [&::-webkit-details-marker]:hidden">
            <FiChevronDown
              aria-hidden="true"
              className="transition-transform group-open:rotate-180"
            />
            Vencidos o pasados ({result.past.length})
          </summary>
          <ul className="grid gap-3 opacity-80">{result.past.map(renderItem)}</ul>
        </details>
      )}
    </section>
  )
}
