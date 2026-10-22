import type { PaymentProduct } from './model'

export function formatPlanDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function productDuration(product: PaymentProduct) {
  const count = product.durationCount ?? product.months
  const unit = product.durationUnit ?? 'month'
  const labels = { week: ['semana', 'semanas'], month: ['mes', 'meses'], year: ['año', 'años'] }
  return `${count} ${labels[unit][count === 1 ? 0 : 1]}`
}

// "8 clases · 30 días" / "1 mes desde activación"
export function productTerms(product: PaymentProduct) {
  return product.mode === 'classes'
    ? `${product.classes} clases${product.expiryDays ? ` · ${product.expiryDays} días` : ' · Sin caducidad'}`
    : `${productDuration(product)} desde activación`
}
