import type { PaymentAccount } from './model'

export type StudentPaymentStatus = {
  // "$", "$5", "$ 7d", "$ -1d"
  label: string
  tone: 'none' | 'ok' | 'warn' | 'expired'
  description: string
}

const DAY = 24 * 60 * 60 * 1000
const days = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY)

/**
 * Compact payment status for a student list: remaining classes of active class packs,
 * days left of an active period plan, days since the last plan ended, or none.
 */
export function studentPaymentStatus(
  account: PaymentAccount | undefined,
  today: string
): StudentPaymentStatus {
  const grants = (account?.grants || []).filter((grant) => grant.startsOn <= today)
  if (!grants.length) return { label: '$', tone: 'none', description: 'Sin plan activo' }
  const current = grants.filter((grant) => !grant.endsBefore || today < grant.endsBefore)
  const classesLeft = current
    .filter((grant) => grant.product.mode === 'classes')
    .reduce(
      (sum, grant) => sum + Math.max(0, grant.product.classes - grant.used - grant.reserved),
      0
    )
  if (classesLeft > 0)
    return {
      label: `$${classesLeft}`,
      tone: classesLeft <= 1 ? 'warn' : 'ok',
      description: `${classesLeft} ${classesLeft === 1 ? 'clase disponible' : 'clases disponibles'}`,
    }
  const periods = current.filter((grant) => grant.product.mode === 'period')
  if (periods.length) {
    const ends = periods.map((grant) => grant.endsBefore).filter((end): end is string => !!end)
    if (ends.length < periods.length)
      return { label: '$', tone: 'ok', description: 'Plan vigente sin vencimiento' }
    const left = days(today, ends.sort().at(-1) as string)
    return {
      label: `$ ${left}d`,
      tone: left <= 3 ? 'warn' : 'ok',
      description: `Su plan vence en ${left} ${left === 1 ? 'día' : 'días'}`,
    }
  }
  // Had plans, none active: days since the last one ended (used-up packs count as today).
  const lastEnd = grants
    .map((grant) => (grant.endsBefore && grant.endsBefore <= today ? grant.endsBefore : today))
    .sort()
    .at(-1) as string
  const ago = days(lastEnd, today)
  return {
    label: ago ? `$ -${ago}d` : '$0',
    tone: 'expired',
    description: ago
      ? `Su plan terminó hace ${ago} ${ago === 1 ? 'día' : 'días'}`
      : 'Sin clases disponibles',
  }
}
