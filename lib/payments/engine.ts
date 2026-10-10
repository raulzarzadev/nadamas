import type {
  PaymentAccount,
  PaymentGrant,
  PaymentProduct,
  PaymentReservation,
  PaymentSettings,
} from './model'

export class PaymentRuleError extends Error {
  constructor(
    readonly code:
      | 'payment_required'
      | 'package_confirmation_required'
      | 'payment_invalid'
      | 'payment_limit'
  ) {
    super(code)
  }
}
export function localPaymentDate(now: number, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  return ['year', 'month', 'day']
    .map((part) => parts.find((item) => item.type === part)?.value)
    .join('-')
}
export function addMonths(date: string, months: number) {
  const [year, month, day] = date.split('-').map(Number)
  const result = new Date(Date.UTC(year, month - 1 + months, 1))
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, last))
  return result.toISOString().slice(0, 10)
}
export function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}
export function paymentWeek(date: string) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() - ((value.getUTCDay() + 6) % 7))
  return value.toISOString().slice(0, 10)
}
export function validateProduct(input: unknown, id: string): PaymentProduct {
  const value = input as Partial<PaymentProduct> | null
  if (
    !value ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    value.name.length > 80 ||
    !['classes', 'period'].includes(value.mode || '') ||
    !Number.isSafeInteger(value.priceCents) ||
    (value.priceCents || 0) <= 0 ||
    (value.priceCents || 0) > 100_000_000
  )
    throw new PaymentRuleError('payment_invalid')
  const positive = (number: unknown, max: number) =>
    typeof number === 'number' && Number.isInteger(number) && number > 0 && number <= max
  for (const limit of [value.perDay, value.perWeek, value.perPeriod, value.expiryDays])
    if (limit !== null && limit !== undefined && !positive(limit, 10000))
      throw new PaymentRuleError('payment_invalid')
  if (value.mode === 'classes' && !positive(value.classes, 10000))
    throw new PaymentRuleError('payment_invalid')
  if (
    value.mode === 'period' &&
    (!positive(value.months, 24) || !(value.perDay || value.perWeek || value.perPeriod))
  )
    throw new PaymentRuleError('payment_invalid')
  return {
    id,
    name: value.name.trim(),
    mode: value.mode as PaymentProduct['mode'],
    priceCents: Number(value.priceCents),
    currency: 'MXN',
    classes: value.mode === 'classes' ? Number(value.classes) : 0,
    months: value.mode === 'period' ? Number(value.months) : 0,
    expiryDays: value.mode === 'classes' ? value.expiryDays || null : null,
    perDay: value.mode === 'period' ? value.perDay || null : null,
    perWeek: value.mode === 'period' ? value.perWeek || null : null,
    perPeriod: value.mode === 'period' ? value.perPeriod || null : null,
    active: value.active !== false,
  }
}
export function activateGrant(
  id: string,
  product: PaymentProduct,
  now: number,
  timezone: string
): PaymentGrant {
  const startsOn = localPaymentDate(now, timezone)
  return {
    id,
    product: structuredClone(product),
    startsOn,
    endsBefore:
      product.mode === 'period'
        ? addMonths(startsOn, product.months)
        : product.expiryDays
          ? addDays(startsOn, product.expiryDays)
          : null,
    used: 0,
    reserved: 0,
    buckets: {},
  }
}
function grantAvailable(grant: PaymentGrant, date: string, mode: PaymentProduct['mode']) {
  if (
    grant.product.mode !== mode ||
    date < grant.startsOn ||
    (grant.endsBefore && date >= grant.endsBefore)
  )
    return false
  if (mode === 'classes') return grant.used + grant.reserved < grant.product.classes
  if (grant.product.perPeriod && grant.used + grant.reserved >= grant.product.perPeriod)
    return false
  return [
    [`d:${date}`, grant.product.perDay],
    [`w:${paymentWeek(date)}`, grant.product.perWeek],
  ].every(([key, limit]) => {
    const bucket = grant.buckets[String(key)] || { used: 0, reserved: 0 }
    return !limit || bucket.used + bucket.reserved < Number(limit)
  })
}
export function reserveGrant(
  account: PaymentAccount,
  date: string,
  settings: PaymentSettings,
  _allowPackage: boolean
): PaymentGrant | null {
  const available = [...account.grants].sort((a, b) =>
    (a.endsBefore || '9999').localeCompare(b.endsBefore || '9999')
  )
  const plan =
    settings.periodsEnabled && available.find((grant) => grantAvailable(grant, date, 'period'))
  const pack =
    settings.classesEnabled && available.find((grant) => grantAvailable(grant, date, 'classes'))
  if (plan) return plan
  if (pack) return pack
  if (settings.allowBookingWithoutBalance) return null
  throw new PaymentRuleError('payment_required')
}
export function changeGrantUsage(
  grant: PaymentGrant,
  date: string,
  reservedDelta: number,
  usedDelta: number
) {
  grant.reserved = Math.max(0, grant.reserved + reservedDelta)
  grant.used = Math.max(0, grant.used + usedDelta)
  if (grant.product.mode === 'period')
    for (const key of [`d:${date}`, `w:${paymentWeek(date)}`]) {
      const current = grant.buckets[key] || { used: 0, reserved: 0 }
      grant.buckets[key] = {
        used: Math.max(0, current.used + usedDelta),
        reserved: Math.max(0, current.reserved + reservedDelta),
      }
    }
}
export function settleGrant(
  account: PaymentAccount,
  reservation: PaymentReservation,
  action: 'consume' | 'release',
  late: boolean
) {
  if (reservation.state !== 'reserved') return false
  const grant = account.grants.find((item) => item.id === reservation.grantId)
  if (!grant) throw new PaymentRuleError('payment_invalid')
  const consumed = action === 'consume' || late
  changeGrantUsage(grant, reservation.date, -1, consumed ? 1 : 0)
  reservation.state = consumed ? 'consumed' : 'released'
  return true
}
export function paymentAvailable(account: PaymentAccount, date: string) {
  return account.grants
    .filter(
      (grant) =>
        grant.product.mode === 'classes' &&
        date >= grant.startsOn &&
        (!grant.endsBefore || date < grant.endsBefore)
    )
    .reduce(
      (sum, grant) => sum + Math.max(0, grant.product.classes - grant.used - grant.reserved),
      0
    )
}
