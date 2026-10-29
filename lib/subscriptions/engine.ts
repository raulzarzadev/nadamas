import { NADAMAS_PRICING } from '../pricing'
import type { SchoolSubscription, SubscriptionAccess, SubscriptionCode } from './model'

export function subscriptionCodeUse(code: SubscriptionCode, schoolId: string) {
  return code.uses?.find((use) => use.schoolId === schoolId)
}

export function subscriptionCodeRedeemed(code: SubscriptionCode, schoolId: string) {
  return code.maxUses !== undefined
    ? Boolean(subscriptionCodeUse(code, schoolId)?.redeemedAt)
    : Boolean(code.redeemedAt)
}

export function subscriptionCodeAvailableForSchool(code: SubscriptionCode, schoolId: string) {
  return code.maxUses !== undefined
    ? Boolean(subscriptionCodeUse(code, schoolId))
    : code.schoolId === schoolId
}

export const SUBSCRIPTION_PRICE_CENTS = NADAMAS_PRICING.regularMonthly * 100
export const SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS = NADAMAS_PRICING.promotionalMonthly * 100
export const SUBSCRIPTION_TRIAL_MS = NADAMAS_PRICING.trialDays * 24 * 60 * 60 * 1000
export const SUBSCRIPTION_GRACE_MS = 3 * 24 * 60 * 60 * 1000

export class SubscriptionError extends Error {
  constructor(
    public code: string,
    message = 'Activa la suscripción de la escuela para realizar esta acción.',
    public status = 403
  ) {
    super(message)
  }
}

/** Missing records are legacy schools, explicitly migrated before restrictions apply. */
export function subscriptionAccess(
  subscription: SchoolSubscription | null,
  now: number
): SubscriptionAccess {
  if (subscription?.paymentExempt) return { state: 'exempt', fullAccess: true, accessEndsAt: null }
  if (!subscription) return { state: 'active', fullAccess: true, accessEndsAt: null }
  if (subscription.provisionalOrderId)
    return { state: 'pending_review', fullAccess: true, accessEndsAt: null }
  if (subscription.periodEndsAt && now < subscription.periodEndsAt)
    return { state: 'active', fullAccess: true, accessEndsAt: subscription.periodEndsAt }
  if (
    subscription.periodEndsAt &&
    !subscription.cancelAtPeriodEnd &&
    now < subscription.periodEndsAt + SUBSCRIPTION_GRACE_MS
  )
    return {
      state: 'grace',
      fullAccess: true,
      accessEndsAt: subscription.periodEndsAt + SUBSCRIPTION_GRACE_MS,
    }
  if (subscription.trialEndsAt && now < subscription.trialEndsAt)
    return { state: 'trialing', fullAccess: true, accessEndsAt: subscription.trialEndsAt }
  return {
    state: 'limited',
    fullAccess: false,
    accessEndsAt: subscription.periodEndsAt || subscription.trialEndsAt,
  }
}

export function subscriptionPrice(subscription: SchoolSubscription | null, now: number): number {
  if (subscription?.paymentExempt) return 0
  if (subscription?.provisionalOrderId)
    return subscription.provisionalPriceCents === SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS
      ? SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS
      : SUBSCRIPTION_PRICE_CENTS
  return subscription?.promotionalCodeId && subscriptionAccess(subscription, now).fullAccess
    ? SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS
    : SUBSCRIPTION_PRICE_CENTS
}

/** Calendar month in UTC with a clamped month-end, preserving the time of day. */
export function subscriptionMonthEnd(start: number): number {
  const date = new Date(start)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + 1)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return date.getTime()
}

export function newSchoolSubscription(
  schoolId: string,
  ownerId: string,
  trial: boolean,
  now: number
): SchoolSubscription {
  return {
    schoolId,
    ownerId,
    trialStartedAt: trial ? now : null,
    trialEndsAt: trial ? now + SUBSCRIPTION_TRIAL_MS : null,
    periodStartedAt: null,
    periodEndsAt: null,
    cancelAtPeriodEnd: false,
    promotionalCodeId: null,
    promotionalGrantedAt: null,
    pendingOrderId: null,
    provisionalOrderId: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function assertSubscriptionPayable(subscription: SchoolSubscription | null | undefined) {
  if (subscription?.paymentExempt || subscription?.exemptionChangeId)
    throw new SubscriptionError(
      'subscription_exempt',
      'Esta escuela está exenta de pago. No necesita contratar una suscripción.',
      409
    )
}
