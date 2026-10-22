'use client'
import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiDollarSign, FiEdit2, FiPlus, FiSettings } from 'react-icons/fi'
import { TbClockCheck } from 'react-icons/tb'
import ProfileLoadingSkeleton from '@/components/ui/profile-loading-skeleton'
import Sheet from '@/components/ui/sheet'
import { useUser } from '@/context/UserContext'
import { PaymentCRUD } from '@/firebase/payments/main'
import { getAuthed, getCachedAuthedData, postAuthed } from '@/lib/client/authed-api'
import { localPaymentDate, paymentAvailable } from '@/lib/payments/engine'
import { formatPlanDate, productDuration, productTerms } from '@/lib/payments/format'
import { paymentMessage } from '@/lib/payments/messages'
import type {
  PaymentOrder,
  PaymentProduct,
  PaymentReservation,
  PaymentSettings,
  PaymentSnapshot,
} from '@/lib/payments/model'
import CollectionsSummary from './CollectionsSummary'
import PaymentOrders, { receiptData } from './PaymentOrders'
import PaymentProductForm, { money } from './PaymentProductForm'
import { paymentInputClass, paymentTextareaClass } from './payment-field'
import ReceiptPreview from './ReceiptPreview'
import StudentPlansSummary from './StudentPlansSummary'

export default function PaymentsPanel({
  endpoint,
  initialStudentId,
  initialTab = 'account',
  hideTitle = false,
  emptyPlansText = 'Todavía no hay paquetes o planes disponibles.',
  plansOnly = false,
  hidePlans = false,
  settingsSlot,
  collections = false,
  onPurchased,
}: {
  endpoint: string
  initialStudentId?: string
  hideTitle?: boolean
  emptyPlansText?: string
  // Athlete Pagos > Buscar: show only the Planes catalog (balances and payments live in
  // "Mis planes"); onPurchased lets the host switch there after buying.
  plansOnly?: boolean
  // Coach "Alumnos" view: balances, payments and history without the Planes tab.
  hidePlans?: boolean
  // When set, the manager's settings button renders (icon-only) into this header slot.
  settingsSlot?: HTMLElement | null
  // Coach "Mis cobros": payments to verify, latest payments with this month's total, and
  // students' current/finished plans (replaces the tabs).
  collections?: boolean
  onPurchased?: () => void
  initialTab?: 'account' | 'plans' | 'orders' | 'history'
}) {
  const { user } = useUser()
  const viewerId = user?.uid || user?.id || ''
  const operationId = useRef('')
  const id = useId()
  const [data, setData] = useState<PaymentSnapshot | undefined>(() => getCachedAuthedData(endpoint))
  const [studentId, setStudentId] = useState(initialStudentId || '')
  const [studentSearch, setStudentSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [productForm, setProductForm] = useState<PaymentProduct | null | false>(false)
  const [productStep, setProductStep] = useState(0)
  useEffect(() => {
    if (productForm === false) setProductStep(0)
  }, [productForm])
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [purchase, setPurchase] = useState<PaymentProduct | null>(null)
  const [method, setMethod] = useState<'cash' | 'transfer'>('transfer')
  const [file, setFile] = useState<File | null>(null)
  const [adjust, setAdjust] = useState(false)
  const [refund, setRefund] = useState<PaymentReservation | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')
  const [tab, setTab] = useState<'account' | 'plans' | 'orders' | 'history'>(
    plansOnly ? 'plans' : hidePlans && initialTab === 'plans' ? 'account' : initialTab
  )
  const reload = useCallback(async () => {
    const next = await PaymentCRUD.get(endpoint)
    setData(next)
    return next
  }, [endpoint])
  useEffect(() => {
    let active = true
    setError('')
    const cached = getCachedAuthedData<PaymentSnapshot>(endpoint)
    setData(cached)
    PaymentCRUD.get(endpoint)
      .then((next) => {
        if (active) {
          setData(next)
          setStudentId(initialStudentId || (next.manager ? '' : next.students[0]?.id || ''))
        }
      })
      .catch(() => {
        if (active) setError('No pudimos cargar los pagos. Inténtalo de nuevo.')
      })
    return () => {
      active = false
    }
  }, [endpoint, initialStudentId])
  useEffect(() => {
    let active = true
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      PaymentCRUD.get(endpoint)
        .then((next) => {
          if (active) setData(next)
        })
        .catch(() => {})
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [endpoint])
  async function perform(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      await reload()
    } catch (error) {
      setError(paymentMessage(error))
    } finally {
      setBusy(false)
    }
  }
  const upload = async (order: Pick<PaymentOrder, 'id'>, receipt: File) => {
    const encoded = await receiptData(receipt)
    await postAuthed(
      `${endpoint.replace('/api/payments?', '/api/payments/receipts?')}&orderId=${encodeURIComponent(order.id)}`,
      { data: encoded }
    )
  }
  async function download(order: PaymentOrder) {
    await perform(async () => {
      const response = await getAuthed(
        `${endpoint.replace('/api/payments?', '/api/payments/receipts?')}&orderId=${encodeURIComponent(order.id)}`
      )
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = order.receiptType === 'application/pdf' ? 'comprobante.pdf' : 'comprobante'
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
  }
  const review = (order: PaymentOrder, status: 'approved' | 'rejected') =>
    void perform(async () => {
      await PaymentCRUD.update(endpoint, { action: 'review', orderId: order.id, status })
      setNotice(status === 'approved' ? 'Pago confirmado y saldo actualizado.' : 'Pago rechazado.')
    })
  if (!data)
    return error ? (
      <div role="alert" className="grid gap-3 p-3">
        <p>{error}</p>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() =>
            void reload().catch(() => setError('No pudimos cargar los pagos. Inténtalo de nuevo.'))
          }
        >
          Volver a intentar
        </button>
      </div>
    ) : (
      <ProfileLoadingSkeleton />
    )
  const today = localPaymentDate(Date.now(), data.settings.timezone)
  const student = data.students.find((item) => item.id === studentId)
  const account = student ? data.accounts[student.id] || { grants: [] } : undefined
  const orders = data.orders.filter((order) => !studentId || order.studentId === studentId)
  const visibleStudents = data.students.filter((item) =>
    item.name.toLocaleLowerCase('es').includes(studentSearch.trim().toLocaleLowerCase('es'))
  )
  const products = data.products.filter((product) => data.manager || product.active)
  const submitFooter = (form: string, label: string) => (
    <button
      type="submit"
      form={`${id}-${form}`}
      disabled={busy}
      className="btn btn-primary min-h-11 w-full"
    >
      {busy ? 'Guardando…' : label}
    </button>
  )
  const input = paymentInputClass
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4">
      {data.manager &&
        settingsSlot &&
        createPortal(
          <button
            type="button"
            aria-label="Configuración de pagos"
            title="Configuración"
            className="grid size-10 cursor-pointer place-items-center rounded-full border border-(--c-border) bg-white text-(--c-ocean) transition-colors hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong)"
            onClick={() => setSettings({ ...data.settings })}
          >
            <FiSettings aria-hidden="true" className="size-5" />
          </button>,
          settingsSlot
        )}
      <div
        className={
          hideTitle && (!data.manager || settingsSlot)
            ? 'hidden'
            : 'flex min-w-0 flex-wrap items-center justify-between gap-3'
        }
      >
        {!hideTitle && <h1 className="text-2xl font-extrabold">Planes y pagos</h1>}
        {data.manager && (
          <button
            type="button"
            className="btn btn-ghost min-h-11 gap-1 text-xs"
            onClick={() => setSettings({ ...data.settings })}
          >
            <FiSettings aria-hidden="true" /> Configuración
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {collections && data.manager && (
        <CollectionsSummary
          orders={data.orders}
          busy={busy}
          onReview={review}
          onDownload={(order) => void download(order)}
        />
      )}
      {data.manager && !collections && tab === 'account' && (
        <div className="grid min-w-0 gap-2">
          <label
            className="grid min-w-0 grid-cols-1 gap-1 text-sm"
            htmlFor={`${id}-student-search`}
          >
            Buscar alumno
            <input
              id={`${id}-student-search`}
              type="search"
              className="input w-full min-w-0 max-w-full"
              placeholder="Nombre del alumno"
              value={studentSearch}
              onChange={(event) => {
                setStudentSearch(event.target.value)
                setStudentId('')
              }}
            />
          </label>
          {student && (
            <button
              type="button"
              className="btn btn-ghost justify-self-start text-xs"
              onClick={() => setStudentId('')}
            >
              Todos los alumnos
            </button>
          )}
        </div>
      )}
      {!data.manager && data.students.length > 1 && (
        <section aria-label="Elegir perfil de alumno" className="grid gap-2">
          <p className="text-xs font-semibold text-(--c-text-2)">Consultar para</p>
          <div className="flex flex-wrap gap-2">
            {[...data.students]
              .sort((a, b) => Number(Boolean(b.isSelf)) - Number(Boolean(a.isSelf)))
              .map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={studentId === item.id}
                  className={`btn min-h-8 h-auto max-w-full whitespace-normal rounded-full px-3 py-1.5 text-xs ${studentId === item.id ? 'btn-primary ring-2 ring-(--c-ocean) ring-offset-2' : 'btn-outline'}`}
                  onClick={() => setStudentId(item.id)}
                >
                  {item.name}
                  {item.isSelf ? ' (yo)' : ''}
                </button>
              ))}
          </div>
        </section>
      )}
      {data.guest ? (
        <p className="rounded-xl bg-(--c-surface) p-3 text-sm">
          Para adquirir un plan necesitas inscribirte en esta escuela.{' '}
          <Link
            href={`/athlete/search/school/${encodeURIComponent(data.scope.id)}`}
            className="font-semibold text-(--c-ocean) underline"
          >
            Ver escuela
          </Link>
        </p>
      ) : (
        !data.manager &&
        !data.students.length && (
          <p className="text-sm">
            Todavía no tienes un perfil de alumno vinculado en este espacio.
          </p>
        )
      )}
      <div
        className={
          plansOnly || collections ? 'hidden' : 'flex flex-wrap items-center justify-between gap-2'
        }
      >
        <nav aria-label="Secciones de pagos" className="flex flex-wrap gap-2">
          {(
            [
              ['account', 'Saldos'],
              ['plans', 'Planes'],
              [
                'orders',
                `Pagos${orders.some((order) => order.status === 'pending') ? ` · ${orders.filter((order) => order.status === 'pending').length} pendientes` : ''}`,
              ],
              ['history', 'Movimientos'],
            ] as const
          )
            .filter(
              ([value]) =>
                (data.manager || value !== 'history') && !(hidePlans && value === 'plans')
            )
            .map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setTab(value)}
                aria-pressed={tab === value}
                title={value === 'account' ? 'Saldos' : undefined}
                aria-label={
                  value === 'account'
                    ? `Saldos (${account ? paymentAvailable(account, today) : 0} clases disponibles)`
                    : undefined
                }
                className={`btn min-h-9 h-9 text-xs ${tab === value ? 'btn-primary' : 'btn-ghost'}`}
              >
                {value === 'account' ? (
                  <>
                    Saldos <TbClockCheck aria-hidden="true" className="size-4" /> (
                    {account ? paymentAvailable(account, today) : 0})
                  </>
                ) : (
                  label
                )}
              </button>
            ))}
        </nav>
        {!data.manager && (
          <button
            type="button"
            onClick={() => setTab('plans')}
            className="btn btn-primary min-h-9 h-9 gap-1 px-3 text-xs"
          >
            <FiPlus aria-hidden="true" /> Adquirir más clases
          </button>
        )}
      </div>
      {!collections && tab === 'account' && (
        <>
          {!data.settings.classesEnabled && !data.settings.periodsEnabled && (
            <p className="rounded-xl bg-(--c-surface) p-3 text-sm">
              {data.manager
                ? 'Activa una o ambas modalidades en Configuración para comenzar.'
                : 'Los pagos todavía no están habilitados en este espacio.'}
            </p>
          )}
          {student && account ? (
            <section aria-label="Saldo del alumno" className="grid gap-3">
              <div className="rounded-xl border border-(--c-border) bg-(--c-surface) p-3">
                <h2 className="mb-2 text-xs font-semibold text-(--c-text-2)">Saldo de clases</h2>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-base">
                    {paymentAvailable(account, today)} clases disponibles
                  </strong>
                  {data.manager && (
                    <button
                      type="button"
                      onClick={() => {
                        operationId.current = crypto.randomUUID()
                        setAdjust(true)
                      }}
                      className="btn btn-ghost min-h-11 text-xs"
                    >
                      Ajustar saldo
                    </button>
                  )}
                </div>
              </div>
              {account.grants
                .filter(
                  (grant) =>
                    grant.product.mode === 'period' &&
                    grant.startsOn <= today &&
                    (!grant.endsBefore || today < grant.endsBefore)
                )
                .map((grant) => (
                  <div
                    key={grant.id}
                    className="rounded-xl border border-(--c-border) bg-(--c-surface) p-3"
                  >
                    <h2 className="mb-2 text-xs font-semibold text-(--c-text-2)">Plan vigente</h2>
                    <strong className="block text-base">{grant.product.name}</strong>
                    <p className="mt-2 text-xs text-(--c-text-2)">
                      Vigencia: {productDuration(grant.product)}
                    </p>
                    <p className="text-xs text-(--c-text-2)">
                      Inicia el {formatPlanDate(grant.startsOn)}
                      {grant.endsBefore
                        ? ` · Vence el ${formatPlanDate(grant.endsBefore)}`
                        : ' · Sin vencimiento'}
                    </p>
                    <p className="mt-2 text-xs text-(--c-text-2)">
                      {grant.used} consumidas · {grant.reserved} reservadas
                      {grant.product.perPeriod
                        ? ` · ${Math.max(0, grant.product.perPeriod - grant.used - grant.reserved)} disponibles en el periodo`
                        : ''}
                    </p>
                    <p className="text-xs text-(--c-text-2)">
                      {[
                        grant.product.perDay != null && `${grant.product.perDay} al día`,
                        grant.product.perWeek != null && `${grant.product.perWeek} a la semana`,
                        grant.product.perMonth != null && `${grant.product.perMonth} al mes`,
                        grant.product.perPeriod != null && `${grant.product.perPeriod} por periodo`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                ))}
              <p className="text-xs text-(--c-text-2)">
                Al agendar se reserva una sesión. Al asistir o faltar se consume. Cancelación sin
                cargo hasta {data.settings.cancellationHours} horas antes.
              </p>
            </section>
          ) : (
            <ul className="grid gap-2">
              {!visibleStudents.length && (
                <li className="py-3 text-sm text-(--c-text-2)">
                  No hay alumnos que coincidan con la búsqueda.
                </li>
              )}
              {visibleStudents.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setStudentId(item.id)}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-(--c-border) px-3 py-2 text-left text-sm"
                  >
                    <strong>{item.name}</strong>
                    <span className="text-xs">
                      {paymentAvailable(data.accounts[item.id] || { grants: [] }, today)}{' '}
                      disponibles →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {tab === 'plans' && (
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Planes</h2>
            {data.manager && products.length > 0 && (
              <button
                type="button"
                onClick={() => setProductForm(null)}
                className="btn btn-primary min-h-11 gap-1.5 rounded-full px-4 text-sm"
              >
                <FiPlus aria-hidden="true" className="size-4" /> Crear plan
              </button>
            )}
          </div>
          {!products.length &&
            (data.manager ? (
              <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-(--c-border) bg-(--c-surface) px-4 py-8 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-white text-(--c-ocean) shadow-[var(--shadow-sm)]">
                  <FiDollarSign aria-hidden="true" className="size-6" />
                </span>
                <div className="grid gap-1">
                  <p className="font-bold text-(--c-ocean)">Aún no tienes planes</p>
                  <p className="text-sm text-(--c-text-2)">
                    Crea paquetes de clases o membresías para que tus alumnos los adquieran.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProductForm(null)}
                  className="btn btn-primary min-h-12 gap-2 rounded-full px-6 text-base"
                >
                  <FiPlus aria-hidden="true" className="size-5" /> Crea tu primer plan
                </button>
              </div>
            ) : (
              <p className="text-sm text-(--c-text-2)">{emptyPlansText}</p>
            ))}
          {products.map((product) => (
            <article
              key={product.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-(--c-border) p-3"
            >
              <div className="min-w-0 flex-1">
                <strong className="text-sm">
                  {product.name}
                  {!product.active ? ' · Inactivo' : ''}
                </strong>
                <p className="text-sm">
                  {money(product.priceCents)} · {productTerms(product)}
                </p>
                {product.mode === 'period' && (
                  <p className="text-xs text-(--c-text-2)">
                    {[
                      product.perDay != null && `${product.perDay}/día`,
                      product.perWeek != null && `${product.perWeek}/semana`,
                      product.perMonth != null && `${product.perMonth}/mes`,
                      product.perPeriod != null && `${product.perPeriod}/periodo`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {!data.manager &&
                  !(product.mode === 'classes'
                    ? data.settings.classesEnabled
                    : data.settings.periodsEnabled) && (
                    <p className="mt-1 text-xs text-(--c-text-2)">
                      El entrenador todavía no habilita el cobro de este plan.
                    </p>
                  )}
              </div>
              {data.manager && (
                <button
                  type="button"
                  className="btn btn-ghost min-h-11"
                  aria-label={`Editar ${product.name}`}
                  onClick={() => setProductForm(product)}
                >
                  <FiEdit2 aria-hidden="true" />
                </button>
              )}
              {/* In the plans-only catalog a manager has no student picked, so registering a payment doesn't apply. */}
              {!(data.manager && plansOnly) && (
                <button
                  type="button"
                  disabled={
                    !student ||
                    !product.active ||
                    (!data.manager &&
                      !(product.mode === 'classes'
                        ? data.settings.classesEnabled
                        : data.settings.periodsEnabled)) ||
                    busy ||
                    (!data.manager && student.ownerId !== viewerId)
                  }
                  onClick={() => {
                    operationId.current = crypto.randomUUID()
                    setPurchase(product)
                    setFile(null)
                  }}
                  className="btn btn-outline min-h-11 text-xs"
                >
                  {data.manager ? 'Registrar pago' : 'Adquirir'}
                </button>
              )}
            </article>
          ))}
        </section>
      )}
      {!collections && tab === 'orders' && (
        <PaymentOrders
          orders={orders}
          canAccess={(order) =>
            data.manager ||
            data.students.some((item) => item.id === order.studentId && item.ownerId === viewerId)
          }
          manager={data.manager}
          busy={busy}
          onReview={review}
          onUpload={(order, receipt) =>
            void perform(async () => {
              await upload(order, receipt)
              setNotice('Comprobante enviado. Espera la confirmación.')
            })
          }
          onDownload={(order) => void download(order)}
        />
      )}
      {!collections && tab === 'history' && (
        <section className="grid gap-2">
          <h2 className="font-bold">Movimientos recientes</h2>
          {data.manager &&
            data.reservations
              ?.filter((hold) => !studentId || hold.studentId === studentId)
              .map((hold) => (
                <div key={hold.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    {data.students.find((item) => item.id === hold.studentId)?.name} · {hold.date}{' '}
                    {hold.startTime} · Clase consumida
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-11 text-xs"
                    onClick={() => {
                      setRefund(hold)
                      setReason('')
                    }}
                  >
                    Devolver clase
                  </button>
                </div>
              ))}
          {!data.movements.length && (
            <p className="text-sm text-(--c-text-2)">Todavía no hay movimientos.</p>
          )}
          {data.movements
            .filter((entry) => !studentId || entry.studentId === studentId)
            .map((entry) => (
              <div key={entry.id} className="border-b border-(--c-border) py-2">
                <p className="text-sm">{entry.description}</p>
                <p className="text-xs text-(--c-text-2)">
                  {data.students.find((item) => item.id === entry.studentId)?.name} ·{' '}
                  {new Date(entry.createdAt).toLocaleString('es-MX')}
                  {entry.quantity ? ` · ${entry.quantity > 0 ? '+' : ''}${entry.quantity}` : ''}
                </p>
              </div>
            ))}
        </section>
      )}
      {collections && data.manager && (
        <StudentPlansSummary students={data.students} accounts={data.accounts} today={today} />
      )}
      <Sheet
        open={productForm !== false}
        onClose={() => setProductForm(false)}
        label={productForm ? 'Editar paquete o plan' : 'Crear paquete o plan'}
        keyboardAware
        footer={
          <div className="flex gap-2 pt-4">
            {productStep > 0 && (
              <button
                type="button"
                disabled={busy}
                className="btn btn-outline min-h-11"
                onClick={() => setProductStep(productStep - 1)}
              >
                Atrás
              </button>
            )}
            <div className="min-w-0 flex-1">
              {submitFooter(
                'product',
                productStep < 3 ? 'Continuar' : productForm ? 'Guardar cambios' : 'Crear'
              )}
            </div>
          </div>
        }
        closeDisabled={busy}
      >
        {productForm !== false && (
          <div className="grid min-w-0 grid-cols-1 gap-4">
            <h2 className="text-xl font-bold">
              {productForm ? 'Editar paquete o plan' : 'Crear paquete o plan'}
            </h2>
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
            <PaymentProductForm
              key={productForm?.id || 'new'}
              product={productForm || undefined}
              formId={`${id}-product`}
              step={productStep}
              onStepChange={setProductStep}
              busy={busy}
              onSave={(product) =>
                void perform(async () => {
                  await PaymentCRUD.update(endpoint, {
                    action: 'product',
                    id: product.id || undefined,
                    product,
                  })
                  setProductForm(false)
                })
              }
            />
            {productForm && (
              <button
                type="button"
                disabled={busy}
                className="btn btn-ghost min-h-11"
                onClick={() =>
                  void perform(async () => {
                    await PaymentCRUD.update(endpoint, {
                      action: 'product',
                      id: productForm.id,
                      product: { ...productForm, active: !productForm.active },
                    })
                    setProductForm(false)
                  })
                }
              >
                {productForm.active ? 'Desactivar' : 'Activar'}
              </button>
            )}
          </div>
        )}
      </Sheet>
      <Sheet
        open={Boolean(settings)}
        onClose={() => setSettings(null)}
        label="Configuración de pagos"
        keyboardAware
        footer={submitFooter('settings', 'Guardar')}
        closeDisabled={busy}
      >
        {settings && (
          <form
            id={`${id}-settings`}
            className="grid min-w-0 grid-cols-1 gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void perform(async () => {
                await PaymentCRUD.update(endpoint, { action: 'settings', settings })
                setSettings(null)
              })
            }}
          >
            <h2 className="text-xl font-bold">Configuración de pagos</h2>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={settings.classesEnabled}
                onChange={(event) =>
                  setSettings({ ...settings, classesEnabled: event.target.checked })
                }
              />
              Pago por clase
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={settings.periodsEnabled}
                onChange={(event) =>
                  setSettings({ ...settings, periodsEnabled: event.target.checked })
                }
              />
              Pago por periodos
            </label>
            <label className="flex min-h-11 items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-1 shrink-0"
                checked={Boolean(settings.allowBookingWithoutBalance)}
                onChange={(event) =>
                  setSettings({ ...settings, allowBookingWithoutBalance: event.target.checked })
                }
              />
              <span>
                Permitir agendar sin créditos o plan vigente
                <span className="mt-1 block text-xs text-(--c-text-2)">
                  Si no hay saldo disponible, la reserva se permite sin descontar clases ni generar
                  deuda.
                </span>
              </span>
            </label>
            <label htmlFor={`${id}-cancel`} className="grid min-w-0 grid-cols-1 gap-1 text-sm">
              Horas para cancelar sin cargo
              <input
                id={`${id}-cancel`}
                type="number"
                min="0"
                max="720"
                required
                className={input}
                value={settings.cancellationHours}
                onChange={(event) =>
                  setSettings({ ...settings, cancellationHours: Number(event.target.value) })
                }
              />
            </label>
            <fieldset className="grid min-w-0 grid-cols-1 gap-3">
              <legend className="mb-2 text-sm font-semibold">Datos para transferencias</legend>
              {(
                [
                  ['bank', 'Banco'],
                  ['holder', 'Titular de la cuenta'],
                  ['account', 'Número de cuenta'],
                  ['clabe', 'CLABE'],
                  ['reference', 'Referencia'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  htmlFor={`${id}-transfer-${key}`}
                  className="grid min-w-0 grid-cols-1 gap-1 text-sm"
                >
                  {label}
                  <input
                    id={`${id}-transfer-${key}`}
                    className={paymentInputClass}
                    type="text"
                    inputMode={key === 'account' || key === 'clabe' ? 'numeric' : undefined}
                    maxLength={key === 'clabe' ? 18 : key === 'account' ? 30 : 160}
                    pattern={
                      key === 'clabe' ? '[0-9]{18}' : key === 'account' ? '[0-9]{4,30}' : undefined
                    }
                    title={
                      key === 'clabe'
                        ? '18 dígitos'
                        : key === 'account'
                          ? 'Entre 4 y 30 dígitos'
                          : undefined
                    }
                    value={settings.transferDetails?.[key] || ''}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        transferDetails: {
                          bank: '',
                          holder: '',
                          account: '',
                          clabe: '',
                          reference: '',
                          ...settings.transferDetails,
                          [key]: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </fieldset>
            <p className="text-xs text-(--c-text-2)">
              La activación aplica a nuevas reservas. Cada alumno conserva su saldo individual.
            </p>
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
          </form>
        )}
      </Sheet>
      <Sheet
        open={Boolean(purchase)}
        onClose={() => setPurchase(null)}
        label="Adquirir clases"
        keyboardAware
        footer={submitFooter('purchase', 'Enviar para confirmación')}
        closeDisabled={busy}
      >
        {purchase && (
          <form
            id={`${id}-purchase`}
            className="grid min-w-0 grid-cols-1 gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!student) return
              void perform(async () => {
                if (method === 'transfer' && !file) throw { code: 'receipt_required' }
                if (file) await receiptData(file)
                const order = await PaymentCRUD.update(endpoint, {
                  action: 'purchase',
                  studentId,
                  productId: purchase.id,
                  method,
                  operationId: operationId.current,
                })
                if (file) {
                  try {
                    await upload(order, file)
                  } catch {
                    throw { code: 'receipt_upload_failed' }
                  }
                }
                setPurchase(null)
                if (onPurchased) return onPurchased()
                setTab('orders')
                setNotice('Pago registrado. Espera la confirmación para activar tu saldo o plan.')
              })
            }}
          >
            <h2 className="text-xl font-bold">{purchase.name}</h2>
            <p>
              {student?.name} · {money(purchase.priceCents)}
            </p>
            <fieldset className="min-w-0">
              <legend className="mb-2 text-sm">Método de pago</legend>
              <div className="grid min-w-0 grid-cols-2 gap-1 rounded-xl bg-base-200 p-1">
                {(
                  [
                    ['transfer', 'Transferencia'],
                    ['cash', 'Efectivo'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="relative min-w-0 cursor-pointer">
                    <input
                      type="radio"
                      name={`${id}-method`}
                      value={value}
                      checked={method === value}
                      onChange={() => {
                        setMethod(value)
                        setFile(null)
                      }}
                      className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    />
                    <span className="flex min-h-11 items-center justify-center rounded-lg border border-transparent px-2 py-2 text-center text-sm font-medium peer-checked:border-primary peer-checked:bg-white peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                      {label}
                    </span>
                  </label>
                ))}
                <button
                  type="button"
                  disabled
                  className="col-span-2 min-h-11 rounded-lg px-2 py-2 text-xs text-slate-500"
                >
                  Pago en línea · Próximamente
                </button>
              </div>
            </fieldset>
            {method === 'transfer' ? (
              <>
                {Object.values(data.settings.transferDetails || {}).some(Boolean) ? (
                  <dl className="grid min-w-0 gap-2 rounded-xl bg-(--c-surface) p-3 text-sm">
                    {(
                      [
                        ['bank', 'Banco'],
                        ['holder', 'Titular'],
                        ['account', 'Cuenta'],
                        ['clabe', 'CLABE'],
                        ['reference', 'Referencia'],
                      ] as const
                    ).map(([key, label]) =>
                      data.settings.transferDetails?.[key] ? (
                        <div key={key} className="min-w-0">
                          <dt className="text-xs text-(--c-text-2)">{label}</dt>
                          <dd className="break-all font-medium">
                            {data.settings.transferDetails[key]}
                          </dd>
                        </div>
                      ) : null
                    )}
                  </dl>
                ) : (
                  <p className="whitespace-pre-wrap rounded-xl bg-(--c-surface) p-3 text-sm">
                    {data.settings.transferInstructions ||
                      'Solicita los datos de transferencia al responsable.'}
                  </p>
                )}
                <label className="grid min-w-0 grid-cols-1 gap-1 text-sm" htmlFor={`${id}-receipt`}>
                  Comprobante
                  <input
                    id={`${id}-receipt`}
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    required
                    className={`${paymentInputClass} h-auto min-h-11 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-base-200 file:px-3 file:py-2 file:text-sm file:font-medium`}
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </label>
                {file && <ReceiptPreview key={`${file.name}-${file.lastModified}`} file={file} />}
                <p className="text-xs text-(--c-text-2)">
                  PNG o JPG: optimizamos las imágenes grandes automáticamente. PDF: máximo 2 MB.
                </p>
              </>
            ) : (
              <p className="text-sm text-(--c-text-2)">
                El responsable confirmará cuando reciba el efectivo.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
          </form>
        )}
      </Sheet>
      <Sheet
        open={Boolean(refund)}
        onClose={() => setRefund(null)}
        label="Devolver clase"
        closeDisabled={busy}
      >
        {refund && (
          <form
            className="grid min-w-0 grid-cols-1 gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              void perform(async () => {
                await PaymentCRUD.update(endpoint, {
                  action: 'refund',
                  studentId: refund.studentId,
                  reservationId: refund.id,
                  reason,
                  operationId: crypto.randomUUID(),
                })
                setRefund(null)
                setReason('')
              })
            }}
          >
            <h2 className="text-xl font-bold">Devolver clase</h2>
            <p className="text-sm">
              {refund.date} · {refund.startTime}. Se devuelve la sesión al paquete o plan original;
              conserva su vigencia.
            </p>
            <label className="grid min-w-0 grid-cols-1 gap-1 text-sm">
              Motivo
              <textarea
                className={paymentTextareaClass}
                required
                minLength={3}
                maxLength={300}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary min-h-11" disabled={busy}>
              Confirmar devolución
            </button>
          </form>
        )}
      </Sheet>
      <Sheet
        open={adjust}
        onClose={() => setAdjust(false)}
        label="Ajustar saldo"
        keyboardAware
        footer={submitFooter('adjust', 'Guardar ajuste')}
        closeDisabled={busy}
      >
        <form
          id={`${id}-adjust`}
          className="grid min-w-0 grid-cols-1 gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void perform(async () => {
              await PaymentCRUD.update(endpoint, {
                action: 'adjust',
                studentId,
                quantity: Number(quantity),
                reason,
                operationId: operationId.current,
              })
              setAdjust(false)
              setReason('')
            })
          }}
        >
          <h2 className="text-xl font-bold">Ajustar saldo · {student?.name}</h2>
          <label htmlFor={`${id}-quantity`} className="grid min-w-0 grid-cols-1 gap-1 text-sm">
            Clases a agregar o quitar
            <input
              id={`${id}-quantity`}
              className={input}
              type="number"
              min="-10000"
              max="10000"
              step="1"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <p className="text-xs text-(--c-text-2)">
            Usa un número negativo para quitar clases disponibles. No afecta sesiones reservadas.
          </p>
          <label htmlFor={`${id}-reason`} className="grid min-w-0 grid-cols-1 gap-1 text-sm">
            Motivo
            <textarea
              id={`${id}-reason`}
              className={paymentTextareaClass}
              minLength={3}
              maxLength={300}
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
        </form>
      </Sheet>
    </div>
  )
}
