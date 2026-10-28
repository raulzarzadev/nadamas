'use client'

import { useState } from 'react'
import { FiCopy } from 'react-icons/fi'
import { AuthedApiError } from '@/lib/client/authed-api'
import { GENERIC_USER_ERROR } from '@/lib/user-facing-error'

export const subscriptionButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-(--c-ocean) px-5 py-2 text-sm font-bold text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'
export const subscriptionSecondary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-(--c-border) bg-white px-4 py-2 text-sm font-semibold text-(--c-ocean) hover:bg-(--c-surface) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-aqua-strong) disabled:opacity-50'
export const subscriptionInput =
  'box-border min-h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-400 bg-white px-3 text-base text-(--c-ocean) outline-none focus:ring-2 focus:ring-inset focus:ring-(--c-aqua-strong)'
export const subscriptionMoney = (cents: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(cents / 100)
export const subscriptionDate = (value?: number | null) =>
  value
    ? new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Sin fecha'
export const subscriptionState: Record<string, string> = {
  trialing: 'Prueba gratuita',
  active: 'Suscripción activa',
  grace: 'Periodo de gracia',
  limited: 'Acceso limitado',
  pending_review: 'Transferencia por verificar',
  provisional: 'Transferencia por verificar',
}
export const orderState: Record<string, string> = {
  pending: 'Por transferir',
  reported: 'Por verificar',
  confirmed: 'Confirmada',
  invalidated: 'Invalidada',
  cancelled: 'Cancelada',
}

export function CopyDetail({ label, value }: { label: string; value?: string }) {
  const [feedback, setFeedback] = useState('')
  if (!value) return null
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-(--c-border) py-3 last:border-0">
      <div className="min-w-0">
        <dt className="text-xs text-(--c-text-2)">{label}</dt>
        <dd className="mt-1 break-all font-semibold">{value}</dd>
      </div>
      <button
        type="button"
        className={subscriptionSecondary}
        aria-label={`Copiar ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setFeedback('Copiado')
          } catch {
            setFeedback('Selecciona el dato para copiarlo')
          }
        }}
      >
        <FiCopy aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Copiar</span>
      </button>
      <output className="sr-only">{feedback}</output>
    </div>
  )
}

export function subscriptionErrorMessage(error: unknown) {
  if (!(error instanceof AuthedApiError)) return GENERIC_USER_ERROR
  const messages: Record<string, string> = {
    invalid_code:
      'El código no está disponible para esta escuela. Revisa el código o contacta a Nadamas.',
    payment_pending: 'Primero resuelve la transferencia pendiente para aplicar otro código.',
    payment_invalidated:
      'Tu transferencia fue invalidada. Contacta a Nadamas para revisar el pago.',
    transfer_unavailable: 'Las transferencias todavía no están disponibles. Inténtalo más tarde.',
    code_exists: 'Ese código ya existe. Elige otro.',
    invalid_date: 'Revisa la fecha y hora del ingreso bancario.',
    price_expired:
      'El ingreso llegó fuera del plazo del precio especial. Revisa el importe antes de confirmarlo.',
    no_active_period: 'No hay un periodo pagado vigente para cancelar o reanudar.',
    already_reviewed: 'Este pago ya fue revisado. Actualiza la lista.',
    transfer_pending: 'Resuelve la transferencia pendiente antes de pagar con tarjeta.',
    period_active: 'Puedes cambiar a tarjeta cuando termine el periodo pagado por transferencia.',
    checkout_pending: 'Estamos preparando o confirmando tu pago. Actualiza en unos momentos.',
    card_unavailable: 'El pago con tarjeta todavía no está disponible.',
    unauthenticated: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  }
  return messages[error.code || ''] || GENERIC_USER_ERROR
}
