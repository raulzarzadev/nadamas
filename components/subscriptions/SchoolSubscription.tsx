'use client'

import { useCallback, useEffect, useState } from 'react'
import SchoolNoSelection from '@/components/school/SchoolNoSelection'
import SchoolSelector from '@/components/school/SchoolSelector'
import { useSchoolSelection } from '@/components/school/useSchoolSelection'
import Sheet from '@/components/ui/sheet'
import { SubscriptionCRUD } from '@/firebase/subscriptions/main'
import type { SubscriptionSnapshot } from '@/lib/subscriptions/model'
import { GENERIC_USER_ERROR, reportInternalError } from '@/lib/user-facing-error'
import {
  CopyDetail,
  orderState,
  subscriptionButton,
  subscriptionDate,
  subscriptionErrorMessage,
  subscriptionInput,
  subscriptionMoney,
  subscriptionSecondary,
  subscriptionState,
} from './subscription-ui'

export default function SchoolSubscription() {
  const { schools, selected, selectedId, status, selectSchool } = useSchoolSelection()
  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get('schoolId')
    if (id && id !== selectedId && schools.some(({ school }) => school.id === id)) selectSchool(id)
  }, [schools, selectedId, selectSchool])
  if (status === 'loading') return <output className="p-4 text-sm">Cargando escuela…</output>
  if (status === 'error')
    return (
      <p role="alert" className="p-4 text-sm">
        {GENERIC_USER_ERROR}
      </p>
    )
  if (!selected) return <SchoolNoSelection />
  return (
    <div className="grid min-w-0 gap-4">
      <SchoolSelector schools={schools} selectedId={selectedId || ''} onChange={selectSchool} />
      <SubscriptionContent key={selected.school.id} schoolId={selected.school.id} />
    </div>
  )
}

function SubscriptionContent({ schoolId }: { schoolId: string }) {
  const [data, setData] = useState<SubscriptionSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<'transfer' | 'code' | 'cancel' | null>(null)
  const [code, setCode] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await SubscriptionCRUD.get(schoolId))
      setError('')
    } catch (cause) {
      reportInternalError('SUBSCRIPTION_LOAD', cause)
      setError(subscriptionErrorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [schoolId])
  useEffect(() => {
    void load()
    const refresh = () => {
      if (document.visibilityState === 'visible') void load()
    }
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 60_000)
    return () => {
      window.removeEventListener('focus', refresh)
      window.clearInterval(timer)
    }
  }, [load])
  useEffect(() => {
    const end = data?.access.accessEndsAt
    if (!end || end <= Date.now()) return
    const timer = window.setTimeout(
      () => void load(),
      Math.min(end - Date.now() + 100, 2_147_483_647)
    )
    return () => window.clearTimeout(timer)
  }, [data?.access.accessEndsAt, load])
  async function mutate(values: Record<string, unknown>, message: string, close = true) {
    if (saving) return false
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await SubscriptionCRUD.update(schoolId, values)
      await load()
      if (close) setModal(null)
      setNotice(message)
      window.dispatchEvent(new Event('nadamas:subscription-updated'))
      return true
    } catch (cause) {
      reportInternalError('SUBSCRIPTION_SAVE', cause)
      setError(subscriptionErrorMessage(cause))
      return false
    } finally {
      setSaving(false)
    }
  }
  async function card(action: 'checkout' | 'cancel' | 'resume' | 'portal') {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const result = await SubscriptionCRUD.card(schoolId, { action })
      if (result.url) window.location.assign(result.url)
      else {
        await load()
        setModal(null)
        setNotice(action === 'cancel' ? 'Renovación cancelada.' : 'Renovación reanudada.')
        window.dispatchEvent(new Event('nadamas:subscription-updated'))
      }
    } catch (cause) {
      reportInternalError('SUBSCRIPTION_CARD', cause)
      setError(subscriptionErrorMessage(cause))
    } finally {
      setSaving(false)
    }
  }
  if (!data)
    return (
      <section className="bg-white p-5 sm:rounded-2xl">
        <p role={error ? 'alert' : 'status'}>{error || 'Cargando suscripción…'}</p>
        {error && (
          <button type="button" className={`${subscriptionSecondary} mt-3`} onClick={load}>
            Reintentar
          </button>
        )}
      </section>
    )
  const pending = data.orders.find(
    (order) => order.status === 'pending' || order.status === 'reported'
  )
  const provisional = data.access.state === 'pending_review'
  const state = provisional ? 'provisional' : data.access.state
  return (
    <>
      <section
        className="min-w-0 bg-white p-5 sm:rounded-2xl sm:border sm:border-(--c-border) sm:p-6"
        aria-busy={loading || saving}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-(--c-aqua-strong)">
          Nadamas · {data.schoolName}
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Suscripción de la escuela</h1>
            <p className="mt-2 text-sm text-(--c-text-2)">
              Una suscripción incluye a todos sus profesores.
            </p>
          </div>
          <span className="rounded-full bg-(--c-surface) px-3 py-2 text-xs font-bold">
            {subscriptionState[state] || state}
          </span>
        </div>
        <p className="mt-6">
          <strong className="text-4xl font-extrabold tabular-nums">
            {subscriptionMoney(data.priceCents)}
          </strong>
          <span className="ml-2 text-sm text-(--c-text-2)">MXN / mes</span>
        </p>
        {data.priceCents === 4900 && (
          <p className="mt-2 text-sm">
            Precio con código. Se conserva mientras mantengas activa tu suscripción.
          </p>
        )}
        {data.access.accessEndsAt && !provisional && (
          <p className="mt-3 text-sm text-(--c-text-2)">
            {data.access.state === 'trialing'
              ? 'Tu prueba termina'
              : data.access.state === 'grace'
                ? 'Tu periodo de gracia termina'
                : 'Acceso hasta'}
            : {subscriptionDate(data.access.accessEndsAt)}.
          </p>
        )}
        {provisional && (
          <p className="mt-3 rounded-xl bg-(--c-surface) p-3 text-sm">
            Tu transferencia está por verificar. Tu escuela sigue funcionando normalmente mientras
            la revisamos.
          </p>
        )}
        {!data.access.fullAccess && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
            Puedes consultar tu información y atender reservas existentes. Activa tu suscripción
            para agregar alumnos, horarios, reservas, ventas y progreso.
          </p>
        )}
        {data.subscription?.cancelAtPeriodEnd && (
          <p className="mt-3 text-sm">
            La renovación está cancelada. Al terminar el periodo pagado perderás el precio
            promocional, si lo tienes.
          </p>
        )}
        {notice && <output className="mt-4 text-sm text-green-800">{notice}</output>}
        {error && !modal && (
          <p role="alert" className="mt-4 text-sm text-red-800">
            {error}
          </p>
        )}
        {data.manager ? (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || (!pending && Boolean(data.subscription?.stripeSubscriptionId))}
                className={subscriptionButton}
                onClick={async () => {
                  if (pending || (await mutate({ action: 'createTransfer' }, '', false)))
                    setModal('transfer')
                }}
              >
                {pending ? 'Ver transferencia' : 'Pagar por transferencia'}
              </button>
              {data.cardAvailable && (
                <button
                  type="button"
                  disabled={saving}
                  className={subscriptionSecondary}
                  onClick={() =>
                    void card(data.subscription?.stripeSubscriptionId ? 'portal' : 'checkout')
                  }
                >
                  {data.subscription?.stripeSubscriptionId
                    ? 'Administrar tarjeta'
                    : 'Pagar con tarjeta'}
                </button>
              )}
              <button
                type="button"
                className={subscriptionSecondary}
                disabled={saving}
                onClick={() => {
                  setError('')
                  setModal('code')
                }}
              >
                Tengo un código
              </button>
            </div>
            {!data.cardAvailable && (
              <p className="mt-3 text-xs text-(--c-text-2)">
                El pago con tarjeta estará disponible cuando se habilite. Por ahora puedes pagar por
                transferencia.
              </p>
            )}
            {data.cardAvailable && (
              <p className="mt-3 text-xs text-(--c-text-2)">
                Con tarjeta, el cobro es inmediato y la renovación mensual es automática. Si estás
                en prueba, termina al confirmarse el primer pago.
              </p>
            )}
            {Boolean(
              data.subscription?.periodEndsAt || data.subscription?.stripeSubscriptionId
            ) && (
              <div className="mt-5 border-t border-(--c-border) pt-4">
                {data.subscription?.cancelAtPeriodEnd ? (
                  <button
                    type="button"
                    disabled={saving}
                    className={subscriptionSecondary}
                    onClick={() =>
                      data.subscription?.stripeSubscriptionId
                        ? void card('resume')
                        : void mutate({ action: 'resume' }, 'Renovación reanudada.')
                    }
                  >
                    Mantener mi suscripción
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    className="min-h-11 text-sm font-semibold underline focus-visible:outline-2"
                    onClick={() => {
                      setError('')
                      setModal('cancel')
                    }}
                  >
                    Cancelar renovación
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              className="mt-2 min-h-11 text-sm font-semibold underline focus-visible:outline-2"
              disabled={loading || saving}
              onClick={() => void load()}
            >
              Actualizar estado
            </button>
          </>
        ) : (
          <p className="mt-5 text-sm text-(--c-text-2)">
            La persona responsable de tu escuela administra esta suscripción.
          </p>
        )}
      </section>
      {data.manager && data.orders.length > 0 && (
        <section className="bg-white p-5 sm:rounded-2xl">
          <h2 className="font-bold">Pagos de la suscripción</h2>
          <ul className="mt-3 divide-y divide-(--c-border)">
            {data.orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold">{order.reference}</p>
                  <p className="mt-1 text-xs text-(--c-text-2)">
                    {orderState[order.status] || order.status} · {subscriptionDate(order.createdAt)}
                  </p>
                </div>
                <strong>{subscriptionMoney(order.amountCents)} MXN</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Sheet
        open={modal === 'transfer'}
        onClose={() => setModal(null)}
        label="Pagar suscripción por transferencia"
        closeDisabled={saving}
        showFooterClose={false}
        footer={
          <div className="mt-4 grid gap-2 border-t border-(--c-border) pt-3">
            {pending?.status === 'pending' && (
              <button
                type="button"
                className={subscriptionButton}
                disabled={saving}
                onClick={() =>
                  void mutate(
                    { action: 'reportTransfer', orderId: pending.id },
                    'Transferencia reportada. Tu escuela tiene acceso mientras la verificamos.'
                  )
                }
              >
                {saving ? 'Enviando…' : 'Ya transferí'}
              </button>
            )}
            {pending?.status === 'pending' && (
              <button
                type="button"
                disabled={saving}
                className={subscriptionSecondary}
                onClick={() =>
                  void mutate(
                    { action: 'cancelTransfer', orderId: pending.id },
                    'Solicitud cancelada. Puedes elegir otro medio de pago.'
                  )
                }
              >
                Cancelar solicitud de transferencia
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              className={subscriptionSecondary}
              onClick={() => setModal(null)}
            >
              Cerrar
            </button>
          </div>
        }
      >
        <h2 className="text-xl font-bold">Transferencia bancaria</h2>
        <p className="mt-2 text-sm text-(--c-text-2)">
          Usa el importe exacto y copia la referencia en el concepto de tu transferencia.
        </p>
        {pending ? (
          <>
            <p className="mt-4 text-3xl font-extrabold">
              {subscriptionMoney(pending.amountCents)}{' '}
              <span className="text-sm font-normal">MXN · un mes</span>
            </p>
            <dl className="mt-3 text-sm">
              <CopyDetail label="Banco" value={data.bankDetails?.bank} />
              <CopyDetail label="Beneficiario" value={data.bankDetails?.holder} />
              <CopyDetail label="CLABE" value={data.bankDetails?.clabe} />
              <CopyDetail label="Cuenta" value={data.bankDetails?.account} />
              <CopyDetail label="Concepto de transferencia" value={pending.reference} />
            </dl>
            <p className="mt-4 text-sm">
              {pending.status === 'reported'
                ? 'Ya reportaste esta transferencia. Mantienes acceso completo mientras la revisamos.'
                : 'Después de transferir, pulsa “Ya transferí”. Tendrás acceso mientras verificamos el ingreso.'}
            </p>
            {data.access.state === 'trialing' && (
              <p className="mt-2 text-xs text-(--c-text-2)">
                Al confirmar tu pago termina la prueba y comienza tu mes de suscripción.
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm">
            No se pudo preparar la transferencia. Cierra e inténtalo de nuevo.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </Sheet>
      <Sheet
        open={modal === 'code'}
        onClose={() => setModal(null)}
        label="Aplicar código de suscripción"
        keyboardAware
        closeDisabled={saving}
        showFooterClose={false}
        footer={
          <div className="mt-4 grid gap-2 border-t border-(--c-border) pt-3">
            <button
              type="submit"
              form="subscription-code"
              disabled={saving || !code.trim()}
              className={subscriptionButton}
            >
              {saving ? 'Aplicando…' : 'Aplicar código'}
            </button>
            <button
              type="button"
              className={subscriptionSecondary}
              disabled={saving}
              onClick={() => setModal(null)}
            >
              Cancelar
            </button>
          </div>
        }
      >
        <h2 className="text-xl font-bold">Tengo un código</h2>
        <p className="mt-2 text-sm text-(--c-text-2)">
          El código debe estar asignado a esta escuela. El precio se aplica a tu siguiente pago.
        </p>
        <form
          id="subscription-code"
          className="mt-4 grid min-w-0 gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void mutate(
              { action: 'redeemCode', code: code.trim() },
              'Código aplicado. Revisa el precio antes de pagar.'
            )
          }}
        >
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Código promocional
            <input
              className={subscriptionInput}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              required
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
        </form>
      </Sheet>
      <Sheet
        open={modal === 'cancel'}
        onClose={() => setModal(null)}
        label="Cancelar renovación"
        closeDisabled={saving}
        showFooterClose={false}
        footer={
          <div className="mt-4 grid gap-2 border-t border-(--c-border) pt-3">
            <button
              type="button"
              disabled={saving}
              className={`${subscriptionButton} bg-red-700`}
              onClick={() =>
                data.subscription?.stripeSubscriptionId
                  ? void card('cancel')
                  : void mutate(
                      { action: 'cancel' },
                      'Renovación cancelada. Conservas el acceso del periodo vigente.'
                    )
              }
            >
              {saving ? 'Cancelando…' : 'Cancelar renovación'}
            </button>
            <button
              type="button"
              disabled={saving}
              className={subscriptionSecondary}
              onClick={() => setModal(null)}
            >
              Volver
            </button>
          </div>
        }
      >
        <h2 className="text-xl font-bold">Cancelar renovación</h2>
        <p className="mt-3 text-sm">
          Conservas el acceso del periodo pagado. Al terminar, tu escuela tendrá acceso limitado y
          perderá el precio de $49, si lo tiene.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </Sheet>
    </>
  )
}
