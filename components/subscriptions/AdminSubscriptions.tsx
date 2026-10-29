'use client'

import { useCallback, useEffect, useState } from 'react'
import { FiPlus, FiSettings } from 'react-icons/fi'
import Sheet from '@/components/ui/sheet'
import { SubscriptionCRUD } from '@/firebase/subscriptions/main'
import { NADAMAS_PRICING } from '@/lib/pricing'
import { subscriptionAccess, subscriptionPrice } from '@/lib/subscriptions/engine'
import type {
  SubscriptionAdminSnapshot,
  SubscriptionBankDetails,
  SubscriptionOrder,
} from '@/lib/subscriptions/model'
import { reportInternalError } from '@/lib/user-facing-error'
import {
  orderState,
  subscriptionButton,
  subscriptionDate,
  subscriptionErrorMessage,
  subscriptionInput,
  subscriptionMoney,
  subscriptionSecondary,
  subscriptionState,
} from './subscription-ui'

const emptyBank: SubscriptionBankDetails = { bank: '', holder: '', account: '', clabe: '' }
export default function AdminSubscriptions({ query = '' }: { query?: string }) {
  const [data, setData] = useState<SubscriptionAdminSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('')
  const [modal, setModal] = useState<'bank' | 'code' | 'review' | 'exemption' | 'plan' | null>(null)
  const [bank, setBank] = useState(emptyBank)
  const [schoolId, setSchoolId] = useState('')
  const [code, setCode] = useState('')
  const [expires, setExpires] = useState('')
  const [review, setReview] = useState<SubscriptionOrder | null>(null)
  const [received, setReceived] = useState('')
  const [exemptionEnabled, setExemptionEnabled] = useState(true)
  const [exemptionReason, setExemptionReason] = useState('')
  const [planTeachers, setPlanTeachers] = useState('')
  const [planStudents, setPlanStudents] = useState('')
  const [planReason, setPlanReason] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await SubscriptionCRUD.getAdmin())
      setError('')
    } catch (cause) {
      reportInternalError('SUBSCRIPTION_ADMIN_LOAD', cause)
      setError(subscriptionErrorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  async function mutate(values: Record<string, unknown>, message: string) {
    if (saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await SubscriptionCRUD.updateAdmin(values)
      await load()
      setModal(null)
      setNotice(message)
      window.dispatchEvent(new Event('nadamas:subscription-updated'))
    } catch (cause) {
      reportInternalError('SUBSCRIPTION_ADMIN_SAVE', cause)
      setError(subscriptionErrorMessage(cause))
    } finally {
      setSaving(false)
    }
  }
  const needle = (query || filter).trim().toLocaleLowerCase('es-MX')
  const schools = data?.schools || []
  const name = (id: string) => schools.find((school) => school.id === id)?.name || id
  const matches = (...values: string[]) =>
    !needle || values.some((value) => value.toLocaleLowerCase('es-MX').includes(needle))
  const orders = (data?.orders || [])
    .filter((order) => matches(order.schoolName, order.reference))
    .sort(
      (a, b) =>
        Number(b.status === 'reported') - Number(a.status === 'reported') ||
        b.createdAt - a.createdAt
    )
  const codes = (data?.codes || []).filter((item) => matches(item.code, name(item.schoolId)))
  return (
    <section className="mt-5 grid min-w-0 gap-5" aria-busy={loading || saving}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Suscripciones de Nadamas</h2>
          <p className="mt-1 text-sm text-(--c-text-2)">
            $299 MXN al mes por escuela · $49 con código asignado.
          </p>
          <p className="mt-1 text-xs text-(--c-text-2)">
            Plan Básico: hasta {NADAMAS_PRICING.basicLimits.teachers} profes y{' '}
            {NADAMAS_PRICING.basicLimits.students} alumnos. Estos pagos son de escuelas a Nadamas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={subscriptionSecondary}
            disabled={!data || saving}
            onClick={() => {
              setBank(data?.settings || emptyBank)
              setError('')
              setModal('bank')
            }}
          >
            <FiSettings aria-hidden="true" />
            Datos bancarios
          </button>
          <button
            type="button"
            className={subscriptionButton}
            disabled={!data || saving || schools.length === 0}
            onClick={() => {
              setSchoolId(schools[0]?.id || '')
              setCode('')
              setExpires('')
              setError('')
              setModal('code')
            }}
          >
            <FiPlus aria-hidden="true" />
            Nuevo código
          </button>
          <button
            type="button"
            className={subscriptionSecondary}
            disabled={!data || saving || schools.length === 0}
            onClick={() => {
              setSchoolId(schools[0]?.id || '')
              setExemptionEnabled(true)
              setExemptionReason('')
              setError('')
              setModal('exemption')
            }}
          >
            Exentar escuela
          </button>
          <button
            type="button"
            className={subscriptionSecondary}
            disabled={loading || saving}
            onClick={load}
          >
            Actualizar
          </button>
        </div>
      </div>
      <label className="grid min-w-0 gap-2 text-sm font-semibold">
        Buscar escuela, referencia o código
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className={subscriptionInput}
          placeholder="Nombre, referencia o código"
        />
      </label>
      {notice && <output className="text-sm text-green-800">{notice}</output>}
      {error && !modal && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error}
          <button
            type="button"
            className="ml-2 min-h-11 font-bold underline"
            disabled={loading}
            onClick={load}
          >
            Reintentar
          </button>
        </div>
      )}
      {!data && loading ? (
        <output className="p-5 text-sm">Cargando suscripciones…</output>
      ) : (
        <>
          <section className="overflow-hidden bg-white sm:rounded-2xl sm:border sm:border-(--c-border)">
            <div className="border-b border-(--c-border) p-4">
              <h3 className="font-bold">Escuelas y acceso</h3>
            </div>
            {schools.filter((school) => matches(school.name)).length ? (
              <ul className="divide-y divide-(--c-border)">
                {schools
                  .filter((school) => matches(school.name))
                  .map((school) => {
                    const item = data?.subscriptions.find(
                      (subscription) => subscription.schoolId === school.id
                    )
                    const access = subscriptionAccess(item || null, Date.now())
                    const exempt = Boolean(item?.paymentExempt)
                    return (
                      <li
                        key={school.id}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4"
                      >
                        <div className="min-w-0">
                          <p className="break-words font-bold">{school.name}</p>
                          <p className="mt-1 text-xs text-(--c-text-2)">
                            {exempt
                              ? 'Exenta de pago'
                              : item
                                ? subscriptionState[access.state]
                                : 'Sin periodo registrado'}
                            {!exempt && item?.cancelAtPeriodEnd ? ' · Renovación cancelada' : ''}
                            {!exempt && access.accessEndsAt
                              ? ` · Hasta ${subscriptionDate(access.accessEndsAt)}`
                              : ''}
                          </p>
                          {exempt && item?.exemptionReason && (
                            <p className="mt-1 break-words text-xs text-(--c-text-2)">
                              Motivo: {item.exemptionReason}
                            </p>
                          )}
                        </div>
                        <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-(--c-border) bg-(--c-surface) p-3">
                          <p className="min-w-0 text-sm">
                            <span className="font-semibold">Plan: </span>
                            {item?.customLimits
                              ? `Personalizado · ${item.customLimits.teachers} profes · ${item.customLimits.students} alumnos`
                              : 'Básico'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={saving}
                              className={subscriptionSecondary}
                              onClick={() => {
                                setSchoolId(school.id)
                                setPlanTeachers(String(item?.customLimits?.teachers ?? ''))
                                setPlanStudents(String(item?.customLimits?.students ?? ''))
                                setPlanReason('')
                                setError('')
                                setModal('plan')
                              }}
                            >
                              {item?.customLimits ? 'Editar' : 'Pasar a Personalizado'}
                            </button>
                            {item?.customLimits && (
                              <button
                                type="button"
                                disabled={saving}
                                className={subscriptionSecondary}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `${school.name} volverá al plan Básico y se quitará la exención de pago.`
                                    )
                                  )
                                    void mutate(
                                      {
                                        action: 'setCustomPlan',
                                        schoolId: school.id,
                                        limits: null,
                                        reason: 'Vuelve al plan Básico',
                                      },
                                      'La escuela volvió al plan Básico.'
                                    )
                                }}
                              >
                                Volver a Básico
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-bold">
                            {exempt
                              ? 'Sin cobro'
                              : `${subscriptionMoney(subscriptionPrice(item || null, Date.now()))} MXN / mes`}
                          </span>
                          <button
                            type="button"
                            disabled={saving}
                            className={subscriptionSecondary}
                            onClick={() => {
                              setSchoolId(school.id)
                              setExemptionEnabled(!exempt)
                              setExemptionReason('')
                              setError('')
                              setModal('exemption')
                            }}
                          >
                            {exempt ? 'Quitar exención' : 'Exentar pagos'}
                          </button>
                        </div>
                      </li>
                    )
                  })}
              </ul>
            ) : (
              <p className="p-5 text-sm text-(--c-text-2)">
                {needle ? 'No hay coincidencias.' : 'Todavía no hay escuelas registradas.'}
              </p>
            )}
          </section>
          <section className="overflow-hidden bg-white sm:rounded-2xl sm:border sm:border-(--c-border)">
            <div className="border-b border-(--c-border) p-4">
              <h3 className="font-bold">Transferencias</h3>
              <p className="mt-1 text-xs text-(--c-text-2)">
                Reportadas mantienen acceso normal hasta que las confirmes o invalides.
              </p>
            </div>
            {orders.length ? (
              <ul className="divide-y divide-(--c-border)">
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-bold">{order.schoolName}</p>
                      <p className="mt-1 break-all text-sm">
                        {order.reference} · {subscriptionMoney(order.amountCents)} MXN
                      </p>
                      <p className="mt-1 text-xs text-(--c-text-2)">
                        {orderState[order.status]} · Creada {subscriptionDate(order.createdAt)}
                      </p>
                      {order.receivedAt && (
                        <p className="mt-1 text-xs text-(--c-text-2)">
                          Ingreso {subscriptionDate(order.receivedAt)} · Verificación{' '}
                          {subscriptionDate(order.reviewedAt)}
                        </p>
                      )}
                    </div>
                    {(order.status === 'pending' || order.status === 'reported') && (
                      <button
                        type="button"
                        className={subscriptionSecondary}
                        disabled={saving}
                        onClick={() => {
                          setReview(order)
                          setReceived(
                            new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                              .toISOString()
                              .slice(0, 16)
                          )
                          setError('')
                          setModal('review')
                        }}
                      >
                        Revisar
                      </button>
                    )}
                    {order.status === 'invalidated' && (
                      <button
                        type="button"
                        className={subscriptionSecondary}
                        disabled={saving}
                        onClick={() =>
                          void mutate(
                            { action: 'releasePayment', schoolId: order.schoolId },
                            'La escuela puede preparar un nuevo pago.'
                          )
                        }
                      >
                        Permitir nuevo pago
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-(--c-text-2)">
                {needle ? 'No hay coincidencias.' : 'Todavía no hay solicitudes de transferencia.'}
              </p>
            )}
          </section>
          <section className="overflow-hidden bg-white sm:rounded-2xl sm:border sm:border-(--c-border)">
            <div className="border-b border-(--c-border) p-4">
              <h3 className="font-bold">Códigos de $49</h3>
              <p className="mt-1 text-xs text-(--c-text-2)">
                Cada código pertenece a una escuela. Desactivarlo no retira beneficios ya
                concedidos.
              </p>
            </div>
            {codes.length ? (
              <ul className="divide-y divide-(--c-border)">
                {codes.map((item) => (
                  <li
                    key={item.id}
                    className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-bold">{name(item.schoolId)}</p>
                      <p className="mt-1 break-all font-mono text-sm">{item.code}</p>
                      <p className="mt-1 text-xs text-(--c-text-2)">
                        {item.redeemedAt ? 'Canjeado' : item.active ? 'Disponible' : 'Desactivado'}
                        {item.expiresAt
                          ? ` · Canjear antes del ${subscriptionDate(item.expiresAt)}`
                          : ''}
                      </p>
                    </div>
                    {item.active && !item.redeemedAt && (
                      <button
                        type="button"
                        disabled={saving}
                        className={subscriptionSecondary}
                        onClick={() =>
                          void mutate(
                            { action: 'disableCode', codeId: item.id },
                            'Código desactivado.'
                          )
                        }
                      >
                        Desactivar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-(--c-text-2)">
                {needle
                  ? 'No hay coincidencias.'
                  : 'Crea un código para ofrecer $49 a una escuela seleccionada.'}
              </p>
            )}
          </section>
        </>
      )}
      <Sheet
        open={modal === 'plan'}
        onClose={() => setModal(null)}
        label="Plan Personalizado"
        keyboardAware
        closeDisabled={saving}
        showFooterClose={false}
        footer={
          <ModalFooter
            form="subscription-plan"
            saving={saving}
            submit="Guardar plan"
            onClose={() => setModal(null)}
          />
        }
      >
        <h2 className="text-xl font-bold">Plan Personalizado</h2>
        <p className="mt-3 text-sm text-(--c-text-2)">
          {name(schoolId)} quedará exenta de pago con estos límites. Deben superar los del plan
          Básico.
        </p>
        <form
          id="subscription-plan"
          className="mt-4 grid min-w-0 grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void mutate(
              {
                action: 'setCustomPlan',
                schoolId,
                limits: { teachers: Number(planTeachers), students: Number(planStudents) },
                reason: planReason.trim(),
              },
              'Plan Personalizado guardado.'
            )
          }}
        >
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Profes
            <input
              aria-label="Profes"
              type="number"
              inputMode="numeric"
              className={subscriptionInput}
              value={planTeachers}
              onChange={(event) => setPlanTeachers(event.target.value)}
              min={6}
              max={100000}
              step={1}
              required
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Alumnos
            <input
              aria-label="Alumnos"
              type="number"
              inputMode="numeric"
              className={subscriptionInput}
              value={planStudents}
              onChange={(event) => setPlanStudents(event.target.value)}
              min={101}
              max={100000}
              step={1}
              required
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Nota
            <textarea
              aria-label="Nota"
              className={`${subscriptionInput} [field-sizing:content] min-h-20 py-3`}
              value={planReason}
              onChange={(event) => setPlanReason(event.target.value)}
              minLength={3}
              maxLength={300}
              rows={2}
              required
            />
            <span className="text-xs font-normal text-(--c-text-2)">
              Se registra en la auditoría de administración.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
        </form>
      </Sheet>
      <Sheet
        open={modal === 'exemption'}
        onClose={() => setModal(null)}
        label={exemptionEnabled ? 'Exentar escuela de pago' : 'Quitar exención de pago'}
        keyboardAware
        closeDisabled={saving}
        showFooterClose={false}
        footer={
          <ModalFooter
            form="subscription-exemption"
            saving={saving}
            submit={exemptionEnabled ? 'Exentar de pago' : 'Quitar exención'}
            onClose={() => setModal(null)}
          />
        }
      >
        <h2 className="text-xl font-bold">
          {exemptionEnabled ? 'Exentar escuela de pago' : 'Quitar exención de pago'}
        </h2>
        <p className="mt-3 text-sm text-(--c-text-2)">
          {exemptionEnabled
            ? 'La escuela tendrá todas las funciones disponibles sin pagar. Se detienen las renovaciones automáticas con tarjeta; no se devuelven pagos anteriores.'
            : `${name(schoolId)} volverá a usar sus fechas originales de prueba o periodo pagado. Si ya vencieron, tendrá acceso limitado. No se inicia otra prueba ni se reanudan cobros automáticos con tarjeta.`}
        </p>
        <p className="mt-2 text-xs text-(--c-text-2)">
          Los periodos existentes se conservan con sus fechas originales; el tiempo sigue
          transcurriendo durante la exención.
        </p>
        <form
          id="subscription-exemption"
          className="mt-4 grid min-w-0 grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void mutate(
              {
                action: 'setExemption',
                schoolId,
                enabled: exemptionEnabled,
                reason: exemptionReason.trim(),
              },
              exemptionEnabled
                ? 'Escuela exenta de pago. Todas sus funciones están disponibles.'
                : 'Exención retirada. La escuela vuelve a su acceso según las fechas vigentes.'
            )
          }}
        >
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Escuela
            <select
              className={subscriptionInput}
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
              disabled={!exemptionEnabled}
              aria-label="Escuela"
              required
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Motivo
            <textarea
              aria-label="Motivo"
              className={`${subscriptionInput} [field-sizing:content] min-h-20 py-3`}
              value={exemptionReason}
              onChange={(event) => setExemptionReason(event.target.value)}
              minLength={3}
              maxLength={300}
              rows={2}
              required
            />
            <span className="text-xs font-normal text-(--c-text-2)">
              Se registra en la auditoría de administración.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
        </form>
      </Sheet>
      <Sheet
        open={modal === 'bank'}
        onClose={() => setModal(null)}
        label="Datos bancarios de Nadamas"
        keyboardAware
        closeDisabled={saving}
        showFooterClose={false}
        footer={
          <ModalFooter form="subscription-bank" saving={saving} onClose={() => setModal(null)} />
        }
      >
        <h2 className="text-xl font-bold">Datos para transferencias</h2>
        <p className="mt-2 text-sm text-(--c-text-2)">
          Las escuelas verán estos datos al pagar su suscripción.
        </p>
        <form
          id="subscription-bank"
          className="mt-4 grid min-w-0 grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void mutate({ action: 'settings', settings: bank }, 'Datos bancarios guardados.')
          }}
        >
          {(
            [
              { key: 'bank', label: 'Banco' },
              { key: 'holder', label: 'Beneficiario' },
              { key: 'clabe', label: 'CLABE' },
              { key: 'account', label: 'Cuenta' },
            ] as const
          ).map(({ key, label }) => (
            <label key={key} className="grid min-w-0 gap-2 text-sm font-semibold">
              {label}
              <input
                className={subscriptionInput}
                value={bank[key]}
                onChange={(event) =>
                  setBank((current) => ({ ...current, [key]: event.target.value }))
                }
                required={key === 'bank' || key === 'holder'}
                inputMode={key === 'clabe' || key === 'account' ? 'numeric' : 'text'}
                maxLength={key === 'clabe' ? 18 : 160}
              />
            </label>
          ))}
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
        </form>
      </Sheet>
      <Sheet
        open={modal === 'code'}
        onClose={() => setModal(null)}
        label="Crear código promocional"
        keyboardAware
        closeDisabled={saving}
        showFooterClose={false}
        footer={
          <ModalFooter
            form="subscription-admin-code"
            saving={saving}
            submit="Crear código"
            onClose={() => setModal(null)}
          />
        }
      >
        <h2 className="text-xl font-bold">Código de $49 al mes</h2>
        <p className="mt-2 text-sm text-(--c-text-2)">
          La escuela conserva este precio mientras mantenga activa su suscripción.
        </p>
        <form
          id="subscription-admin-code"
          className="mt-4 grid min-w-0 grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void mutate(
              {
                action: 'createCode',
                schoolId,
                ...(code.trim() ? { code: code.trim() } : {}),
                ...(expires ? { expiresAt: new Date(`${expires}T23:59:59`).getTime() } : {}),
              },
              'Código creado. Ya puedes compartirlo con la escuela.'
            )
          }}
        >
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Escuela
            <select
              className={subscriptionInput}
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
              required
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Código (opcional)
            <input
              className={subscriptionInput}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
            />
            <span className="text-xs font-normal text-(--c-text-2)">
              Déjalo vacío para generar uno.
            </span>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold">
            Último día para canjear (opcional)
            <input
              type="date"
              className={subscriptionInput}
              value={expires}
              onChange={(event) => setExpires(event.target.value)}
            />
            <span className="text-xs font-normal text-(--c-text-2)">
              Esta fecha limita el canje; no la duración del precio.
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          )}
        </form>
      </Sheet>
      <Sheet
        open={modal === 'review'}
        onClose={() => setModal(null)}
        label="Verificar transferencia"
        keyboardAware
        closeDisabled={saving}
        showFooterClose={false}
        footer={
          <div className="mt-4 grid gap-2 border-t border-(--c-border) pt-3">
            <button
              type="submit"
              form="subscription-review"
              disabled={saving || !received}
              className={subscriptionButton}
            >
              {saving ? 'Guardando…' : 'Confirmar ingreso'}
            </button>
            <button
              type="button"
              disabled={saving}
              className={`${subscriptionSecondary} border-red-200 text-red-800`}
              onClick={() =>
                review &&
                void mutate(
                  { action: 'review', orderId: review.id, status: 'invalidated' },
                  'Transferencia invalidada. Se retiró el acceso provisional.'
                )
              }
            >
              Invalidar transferencia
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
        <h2 className="text-xl font-bold">Verificar transferencia</h2>
        {review && (
          <>
            <p className="mt-3 font-bold">{review.schoolName}</p>
            <p className="mt-1 break-all text-sm">
              {review.reference} · {subscriptionMoney(review.amountCents)} MXN
            </p>
            <p className="mt-3 text-sm text-(--c-text-2)">
              Confirma únicamente después de verificar el ingreso en el banco. Invalidar retira el
              acceso provisional; conserva cualquier periodo pagado o gracia vigente.
            </p>
            <form
              id="subscription-review"
              className="mt-4 grid min-w-0 gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                void mutate(
                  {
                    action: 'review',
                    orderId: review.id,
                    status: 'confirmed',
                    receivedAt: new Date(received).getTime(),
                  },
                  'Transferencia confirmada y periodo registrado.'
                )
              }}
            >
              <label className="grid min-w-0 gap-2 text-sm font-semibold">
                Fecha y hora reales del ingreso
                <input
                  type="datetime-local"
                  required
                  className={subscriptionInput}
                  value={received}
                  onChange={(event) => setReceived(event.target.value)}
                  max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16)}
                />
                <span className="text-xs font-normal text-(--c-text-2)">
                  Si entró dentro del plazo, conserva $49 aunque lo revises después.
                </span>
              </label>
              {error && (
                <p role="alert" className="text-sm text-red-800">
                  {error}
                </p>
              )}
            </form>
          </>
        )}
      </Sheet>
    </section>
  )
}
function ModalFooter({
  form,
  saving,
  onClose,
  submit = 'Guardar',
}: {
  form: string
  saving: boolean
  onClose: () => void
  submit?: string
}) {
  return (
    <div className="mt-4 grid gap-2 border-t border-(--c-border) pt-3">
      <button type="submit" form={form} disabled={saving} className={subscriptionButton}>
        {saving ? 'Guardando…' : submit}
      </button>
      <button type="button" disabled={saving} className={subscriptionSecondary} onClick={onClose}>
        Cancelar
      </button>
    </div>
  )
}
