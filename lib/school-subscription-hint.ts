import type { SubscriptionAccess } from './subscriptions/model'

export function schoolSubscriptionHint(access: SubscriptionAccess | undefined, now = Date.now()) {
  if (!access) return ''
  if (access.state === 'trialing') {
    if (!access.accessEndsAt) return 'Gratuita'
    const days = Math.max(0, Math.ceil((access.accessEndsAt - now) / 86400000))
    return days === 0
      ? 'Prueba finalizada'
      : days === 1
        ? 'Gratuita · queda 1 día'
        : `Gratuita · quedan ${days} días`
  }
  if (access.state === 'exempt') return 'Exenta de pago'
  if (access.state === 'pending_review') return 'Pago por verificar'
  if (access.state === 'grace') return 'Periodo de gracia'
  if (access.state === 'limited') return 'Acceso limitado'
  return 'Activa'
}
