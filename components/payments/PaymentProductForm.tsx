'use client'
import { useEffect, useId, useRef, useState } from 'react'
import NumberStepper from '@/components/ui/number-stepper'
import { productTerms } from '@/lib/payments/format'
import type { PaymentProduct } from '@/lib/payments/model'
import { paymentInputClass } from './payment-field'
export const money = (cents: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100)
export default function PaymentProductForm({
  product,
  formId,
  onSave,
  step,
  onStepChange,
  busy,
}: {
  product?: PaymentProduct
  step: number
  onStepChange: (step: number) => void
  busy: boolean
  formId?: string
  onSave: (product: PaymentProduct) => void
}) {
  const id = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [completedStep, setCompletedStep] = useState(0)
  const [error, setError] = useState('')
  const newlyEnabledLimit = useRef<string | null>(null)
  useEffect(() => {
    if (step > 0) heading.current?.focus()
  }, [step])
  const [form, setForm] = useState<PaymentProduct>(
    product || {
      id: '',
      name: '',
      mode: 'classes',
      priceCents: 0,
      currency: 'MXN',
      classes: 1,
      months: 1,
      expiryDays: null,
      perDay: null,
      perWeek: null,
      perPeriod: null,
      active: true,
    }
  )
  const expiryEnabled = form.expiryCount != null || form.expiryDays != null
  const dailyEnabled = form.perDay != null
  const weeklyEnabled = form.perWeek != null
  const monthlyEnabled = form.perMonth != null
  useEffect(() => {
    if (
      !(dailyEnabled || weeklyEnabled || monthlyEnabled || expiryEnabled) ||
      !newlyEnabledLimit.current
    )
      return
    const key = newlyEnabledLimit.current
    newlyEnabledLimit.current = null
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(`${id}-${key}`)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [dailyEnabled, weeklyEnabled, monthlyEnabled, expiryEnabled, id])
  const termsStep = 1
  const dataStep = 2
  const steps = ['Tipo', 'Vigencia', 'Datos', 'Revisión']
  const numeric = (
    key: 'classes' | 'months' | 'expiryDays' | 'perDay' | 'perWeek' | 'perMonth' | 'perPeriod',
    label: string,
    optional = false
  ) => (
    <label className="grid min-w-0 grid-cols-1 gap-1 text-sm" htmlFor={`${id}-${key}`}>
      {label}
      <input
        id={`${id}-${key}`}
        type="number"
        min="1"
        max={key === 'months' ? 24 : 10000}
        step="1"
        required={!optional}
        value={form[key] || ''}
        onChange={(event) =>
          setForm({ ...form, [key]: event.target.value ? Number(event.target.value) : null })
        }
        className={paymentInputClass}
        placeholder={optional ? 'Sin límite' : undefined}
      />
    </label>
  )
  return (
    <form
      ref={formRef}
      id={formId}
      onChange={() => setCompletedStep(step)}
      className="grid w-full min-w-0 grid-cols-1 gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (busy) return
        if (step === dataStep && !form.name.trim()) return
        if (
          step === termsStep &&
          form.mode === 'period' &&
          form.perDay == null &&
          form.perWeek == null &&
          form.perMonth == null &&
          form.perPeriod == null
        ) {
          setError('Define al menos un límite de sesiones para continuar.')
          return
        }
        setError('')
        if (step < 3) {
          setCompletedStep(Math.max(completedStep, step + 1))
          onStepChange(step + 1)
        } else onSave({ ...form, name: form.name.trim() })
      }}
    >
      <section aria-label="Resumen del plan" className="rounded-xl bg-base-200 p-3 text-sm">
        <p className="break-words font-semibold">{form.name.trim() || 'Nuevo paquete o plan'}</p>
        <p className="text-(--c-text-2)">
          {form.mode === 'classes' ? 'Plan por clases' : 'Plan por tiempo'}
          {form.priceCents > 0 ? ` · ${money(form.priceCents)}` : ''}
        </p>
        {step >= termsStep && (
          <p className="mt-1 text-xs text-(--c-text-2)">
            {productTerms(form)}
            {form.mode === 'period'
              ? [
                  form.perDay != null && ` · ${form.perDay} por día`,
                  form.perWeek != null && ` · ${form.perWeek} por semana`,
                  form.perMonth != null && ` · ${form.perMonth} por mes`,
                  form.perPeriod != null && ` · ${form.perPeriod} por periodo`,
                ]
                  .filter(Boolean)
                  .join('')
              : ''}
          </p>
        )}
      </section>
      <ol aria-label="Pasos del formulario" className="grid grid-cols-4 gap-1 text-xs">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? 'step' : undefined}
            className={`border-t-4 pt-2 ${index <= step ? 'border-primary text-base-content' : 'border-base-200 text-(--c-text-2)'}`}
          >
            <button
              type="button"
              disabled={busy || index > completedStep}
              className="min-h-11 w-full rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default disabled:opacity-50"
              onClick={() => {
                if (index > step && !formRef.current?.reportValidity()) return
                setError('')
                onStepChange(index)
              }}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>
      <h3 ref={heading} tabIndex={-1} className="font-semibold outline-none">
        {
          [
            'Elige el tipo de plan',
            'Vigencia y límites',
            'Nombre y precio',
            'Revisa antes de guardar',
          ][step]
        }
      </h3>
      <fieldset disabled={busy} className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4">
        {step === 0 && (
          <fieldset className="min-w-0">
            <legend className="sr-only">Tipo de plan</legend>
            <div className="grid min-w-0 grid-cols-2 gap-1 rounded-xl bg-base-200 p-1">
              {(
                [
                  ['classes', 'Plan por clases'],
                  ['period', 'Plan por tiempo'],
                ] as const
              ).map(([mode, label]) => (
                <label key={mode} className="relative min-w-0 cursor-pointer">
                  <input
                    type="radio"
                    name={`${id}-mode`}
                    value={mode}
                    checked={form.mode === mode}
                    onChange={() => setForm({ ...form, mode })}
                    className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                  <span className="flex min-h-11 items-center justify-center rounded-lg border border-transparent px-2 py-2 text-center text-sm font-medium transition-colors peer-checked:border-primary peer-checked:bg-base-100 peer-checked:text-base-content peer-checked:shadow-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {step === dataStep && (
          <>
            <label className="grid min-w-0 grid-cols-1 gap-1 text-sm" htmlFor={`${id}-name`}>
              Nombre
              <input
                id={`${id}-name`}
                className={paymentInputClass}
                maxLength={80}
                pattern={'.*\\S.*'}
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label className="grid min-w-0 grid-cols-1 gap-1 text-sm" htmlFor={`${id}-price`}>
              Precio (MXN)
              <input
                id={`${id}-price`}
                className={paymentInputClass}
                type="number"
                min="0.01"
                step="0.01"
                max="1000000"
                required
                value={form.priceCents ? form.priceCents / 100 : ''}
                onChange={(event) =>
                  setForm({ ...form, priceCents: Math.round(Number(event.target.value) * 100) })
                }
              />
            </label>
          </>
        )}
        {step === termsStep &&
          (form.mode === 'classes' ? (
            <div className="grid min-w-0 grid-cols-1 gap-3">
              <div className="grid min-w-0 justify-items-start gap-2">
                <label htmlFor={`${id}-classes`} className="text-sm">
                  Número de clases
                </label>
                <NumberStepper
                  id={`${id}-classes`}
                  label="Número de clases"
                  value={form.classes}
                  min={1}
                  max={10000}
                  required
                  disabled={busy}
                  onValueChange={(classes) => {
                    setCompletedStep(step)
                    setForm({ ...form, classes })
                  }}
                />
              </div>
              <div className="grid min-w-0 justify-items-start gap-2">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm shrink-0 border-2 border-slate-500 bg-white checked:border-primary checked:bg-primary checked:text-white"
                    checked={expiryEnabled}
                    onChange={(event) => {
                      newlyEnabledLimit.current = event.target.checked ? 'expiryDays' : null
                      setForm({
                        ...form,
                        expiryDays: null,
                        expiryCount: event.target.checked ? 1 : null,
                        expiryUnit: form.expiryUnit ?? 'week',
                      })
                    }}
                  />
                  Definir caducidad
                </label>
                {expiryEnabled && (
                  <div className="grid w-full min-w-0 grid-cols-1 items-center gap-3 min-[480px]:flex">
                    <NumberStepper
                      id={`${id}-expiryDays`}
                      label="Cantidad de caducidad"
                      value={form.expiryCount ?? form.expiryDays ?? 1}
                      min={1}
                      max={10000}
                      required
                      disabled={busy}
                      onValueChange={(expiryCount) => {
                        setCompletedStep(step)
                        setForm({
                          ...form,
                          expiryDays:
                            form.expiryCount == null && form.expiryDays != null
                              ? expiryCount
                              : null,
                          expiryCount:
                            form.expiryCount == null && form.expiryDays != null
                              ? null
                              : expiryCount,
                        })
                      }}
                    />
                    <fieldset className="grid w-full min-w-0 flex-1 grid-cols-3 gap-1">
                      <legend className="sr-only">Unidad de caducidad</legend>
                      {(
                        [
                          ['week', 'Semana'],
                          ['month', 'Mes'],
                          ['year', 'Año'],
                        ] as const
                      ).map(([unit, label]) => (
                        <label key={unit} className="relative min-w-0 cursor-pointer">
                          <input
                            type="radio"
                            name={`${id}-expiry-unit`}
                            value={unit}
                            checked={form.expiryCount != null && form.expiryUnit === unit}
                            onChange={() =>
                              setForm({
                                ...form,
                                expiryDays: null,
                                expiryUnit: unit,
                                expiryCount: form.expiryCount ?? 1,
                              })
                            }
                            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                          />
                          <span className="flex min-h-11 items-center justify-center rounded-lg border border-(--c-border) px-2 text-sm peer-checked:border-primary peer-checked:bg-base-200 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-primary">
                            {label}
                          </span>
                        </label>
                      ))}
                      {form.expiryCount == null && form.expiryDays != null && (
                        <p className="col-span-3 text-xs text-(--c-text-2)">
                          Caducidad actual en días. Elige una unidad para cambiarla.
                        </p>
                      )}
                    </fieldset>
                  </div>
                )}
              </div>
              <p className="text-xs text-(--c-text-2)">
                Sin caducidad por defecto. Si la defines, comienza al confirmar el pago.
              </p>
            </div>
          ) : (
            <>
              <div className="grid min-w-0 grid-cols-1 items-center gap-3 min-[480px]:flex">
                <NumberStepper
                  id={`${id}-duration-count`}
                  label="Cantidad"
                  value={form.durationCount ?? form.months}
                  min={1}
                  max={form.durationUnit === 'week' ? 104 : form.durationUnit === 'year' ? 2 : 24}
                  required
                  disabled={busy}
                  decreaseLabel="Reducir vigencia"
                  increaseLabel="Aumentar vigencia"
                  onValueChange={(durationCount) => {
                    setCompletedStep(step)
                    setForm({ ...form, durationCount })
                  }}
                />
                <fieldset className="grid min-w-0 flex-1 grid-cols-3 gap-1">
                  <legend className="sr-only">Unidad de vigencia</legend>
                  {(
                    [
                      ['week', 'Semana'],
                      ['month', 'Mes'],
                      ['year', 'Año'],
                    ] as const
                  ).map(([unit, label]) => (
                    <label key={unit} className="relative min-w-0 cursor-pointer">
                      <input
                        type="radio"
                        name={`${id}-duration-unit`}
                        value={unit}
                        checked={(form.durationUnit ?? 'month') === unit}
                        onChange={() =>
                          setForm({
                            ...form,
                            durationUnit: unit,
                            durationCount: Math.max(
                              1,
                              Math.min(
                                form.durationCount ?? form.months,
                                unit === 'week' ? 104 : unit === 'year' ? 2 : 24
                              )
                            ),
                          })
                        }
                        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      />
                      <span className="flex min-h-11 items-center justify-center rounded-lg border border-(--c-border) px-2 text-sm peer-checked:border-primary peer-checked:bg-base-200 peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-primary">
                        {label}
                      </span>
                    </label>
                  ))}
                </fieldset>
              </div>
              <fieldset className="grid w-full min-w-0 max-w-full grid-cols-3 items-start gap-2">
                <legend className="mb-2 text-sm font-semibold">Límites de sesiones</legend>
                {(
                  [
                    ['perDay', 'Diario', 'Clases por día'],
                    ['perWeek', 'Semanal', 'Clases por semana'],
                    ['perMonth', 'Mensual', 'Clases por mes'],
                  ] as const
                ).map(([key, label, quantityLabel]) => (
                  <div key={key} className="grid w-full min-w-0 max-w-full grid-cols-1 gap-2">
                    <label className="flex min-h-11 items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm shrink-0 border-2 border-slate-500 bg-white checked:border-primary checked:bg-primary checked:text-white"
                        checked={form[key] != null}
                        onChange={(event) => {
                          newlyEnabledLimit.current = event.target.checked ? key : null
                          setForm({ ...form, [key]: event.target.checked ? 1 : null })
                        }}
                      />
                      {label}
                    </label>
                    {form[key] != null && (
                      <NumberStepper
                        compact
                        id={`${id}-${key}`}
                        label={quantityLabel}
                        min={0}
                        max={10000}
                        required
                        disabled={busy}
                        value={form[key] ?? 1}
                        onValueChange={(value) => {
                          setCompletedStep(step)
                          setForm({ ...form, [key]: value })
                        }}
                      />
                    )}
                  </div>
                ))}
                {form.perPeriod != null && (
                  <div className="col-span-3 min-w-0">
                    {numeric('perPeriod', 'Límite total del plan existente')}
                  </div>
                )}
              </fieldset>
            </>
          ))}
        {step === 3 && (
          <dl className="grid gap-3 rounded-xl bg-base-200 p-4 text-sm">
            <div>
              <dt className="text-(--c-text-2)">Nombre</dt>
              <dd className="break-words font-semibold">{form.name}</dd>
            </div>
            <div>
              <dt className="text-(--c-text-2)">Modalidad</dt>
              <dd>{form.mode === 'classes' ? 'Plan por clases' : 'Plan por tiempo'}</dd>
            </div>
            <div>
              <dt className="text-(--c-text-2)">Precio</dt>
              <dd>{money(form.priceCents)}</dd>
            </div>
            <div>
              <dt className="text-(--c-text-2)">Vigencia</dt>
              <dd>{productTerms(form)}</dd>
            </div>
            {form.mode === 'period' && (
              <div>
                <dt className="text-(--c-text-2)">Límites de sesiones</dt>
                <dd>
                  {[
                    form.perDay != null && `${form.perDay} por día`,
                    form.perWeek != null && `${form.perWeek} por semana`,
                    form.perMonth != null && `${form.perMonth} por mes`,
                    form.perPeriod != null && `${form.perPeriod} por periodo`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </dd>
              </div>
            )}
          </dl>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
    </form>
  )
}
