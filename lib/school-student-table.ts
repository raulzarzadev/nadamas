import { localPaymentDate, paymentAvailable } from '@/lib/payments/engine'
import type { PaymentAccount } from '@/lib/payments/model'

export function studentAge(birthDate: string | undefined, today: string): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > today) return null
  const birth = new Date(`${birthDate}T12:00:00Z`)
  if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== birthDate)
    return null
  return (
    Number(today.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    (today.slice(5) < birthDate.slice(5) ? 1 : 0)
  )
}

export function studentPlanSummary(
  account: PaymentAccount | undefined,
  timezone: string,
  now = Date.now()
) {
  if (!account?.grants.length)
    return { name: 'Sin plan', validity: 'No aplica', expiresOn: null, remaining: null }
  const today = localPaymentDate(now, timezone)
  const active = account.grants.filter(
    (grant) => grant.startsOn <= today && (!grant.endsBefore || today < grant.endsBefore)
  )
  if (!active.length)
    return {
      name: 'Sin plan vigente',
      validity: 'Sin vigencia actual',
      expiresOn: null,
      remaining: 0,
    }
  const ends = active.flatMap((grant) => (grant.endsBefore ? [grant.endsBefore] : [])).sort()
  const expiresOn = ends[0] || null
  const days = expiresOn
    ? Math.round(
        (Date.parse(`${expiresOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000
      )
    : null
  const packages = active.filter((grant) => grant.product.mode === 'classes')
  const periods = active.filter((grant) => grant.product.mode === 'period')
  const unlimited = periods.some((grant) => !grant.product.perPeriod)
  const remaining = unlimited
    ? null
    : packages.length || periods.length
      ? paymentAvailable(account, today) +
        periods.reduce(
          (sum, grant) =>
            sum + Math.max(0, (grant.product.perPeriod || 0) - grant.used - grant.reserved),
          0
        )
      : null
  return {
    name: [...new Set(active.map((grant) => grant.product.name))].join(', '),
    validity: days === null ? 'Sin vencimiento' : `En ${days} ${days === 1 ? 'día' : 'días'}`,
    expiresOn,
    remaining,
  }
}
