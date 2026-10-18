import type { PaymentProduct } from './model'

export function formatPlanDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

// "8 clases · 30 días" / "1 mes desde activación"
export function productTerms(product: PaymentProduct) {
  return product.mode === 'classes'
    ? `${product.classes} clases${product.expiryDays ? ` · ${product.expiryDays} días` : ' · Sin caducidad'}`
    : `${product.months} ${product.months === 1 ? 'mes' : 'meses'} desde activación`
}
