import type { SchoolSubscription } from './model'

const DAY = 86400000
/** One current milestone per deadline; overdue cron runs do not send every missed warning. */
export function subscriptionReminder(sub: SchoolSubscription, now: number) {
  if (sub.paymentExempt || sub.provisionalOrderId) return null
  const end = sub.periodEndsAt || sub.trialEndsAt
  if (!end) return null
  const remaining = end - now
  const milestone =
    remaining <= 0
      ? 0
      : remaining <= DAY
        ? 1
        : remaining <= 3 * DAY
          ? 3
          : remaining <= 7 * DAY
            ? 7
            : null
  if (milestone === null || now > end + DAY) return null
  const kind = sub.periodEndsAt ? 'renewal' : 'trial'
  return { id: `${sub.schoolId}-${kind}-${end}-${milestone}`, end, milestone, kind }
}
