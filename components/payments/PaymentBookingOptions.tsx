'use client'
import { useId } from 'react'
export type PaymentBookingChoice = { allowPackage: boolean; paymentExceptionReason: string }
export default function PaymentBookingOptions({
  value,
  onChange,
  canOverride = false,
}: {
  value: PaymentBookingChoice
  onChange: (value: PaymentBookingChoice) => void
  canOverride?: boolean
}) {
  const id = useId()
  if (!canOverride) return null
  return (
    <details className="py-2 text-sm">
      <summary className="cursor-pointer font-semibold">Opciones de pago</summary>
      <div className="grid gap-3 pt-3">
        {canOverride && (
          <label htmlFor={id} className="grid gap-1 text-xs">
            Agendar sin saldo (opcional)
            <textarea
              id={id}
              className="textarea w-full min-w-0"
              maxLength={300}
              value={value.paymentExceptionReason}
              onChange={(event) =>
                onChange({ ...value, paymentExceptionReason: event.target.value })
              }
              placeholder="Motivo obligatorio para autorizar una excepción"
            />
          </label>
        )}
      </div>
    </details>
  )
}
