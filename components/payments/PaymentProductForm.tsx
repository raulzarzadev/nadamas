'use client'
import { useId, useState } from 'react'
import type { PaymentProduct } from '@/lib/payments/model'
import { paymentInputClass } from './payment-field'
export const money = (cents: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(cents / 100)
export default function PaymentProductForm({
  product,
  formId,
  onSave,
}: {
  product?: PaymentProduct
  formId?: string
  onSave: (product: PaymentProduct) => void
}) {
  const id = useId()
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
  const numeric = (
    key: 'classes' | 'months' | 'expiryDays' | 'perDay' | 'perWeek' | 'perPeriod',
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
      id={formId}
      className="grid w-full min-w-0 grid-cols-1 gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(form)
      }}
    >
      <label className="grid min-w-0 grid-cols-1 gap-1 text-sm" htmlFor={`${id}-name`}>
        Nombre
        <input
          id={`${id}-name`}
          className={paymentInputClass}
          maxLength={80}
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </label>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm">Modalidad</legend>
        <div className="grid min-w-0 grid-cols-2 gap-1 rounded-xl bg-base-200 p-1">
          {(
            [
              ['classes', 'Paquete de clases'],
              ['period', 'Plan por periodo'],
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
      {form.mode === 'classes' ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {numeric('classes', 'Número de clases')}
          {numeric('expiryDays', 'Caducidad en días (opcional)', true)}
          <p className="text-xs text-(--c-text-2) sm:col-span-2">
            Sin caducidad por defecto. Si la defines, comienza al confirmar el pago.
          </p>
        </div>
      ) : (
        <>
          {numeric('months', 'Vigencia en meses desde la activación')}
          <fieldset className="grid min-w-0 grid-cols-1 gap-3">
            <legend className="mb-2 text-sm font-bold">Límites de sesiones</legend>
            {numeric('perDay', 'Por día', true)}
            {numeric('perWeek', 'Por semana (lunes a domingo)', true)}
            {numeric('perPeriod', 'Por periodo', true)}
            <p className="text-xs text-(--c-text-2)">
              Define al menos un límite. Si combinas varios, se cumplen todos.
            </p>
          </fieldset>
        </>
      )}
    </form>
  )
}
