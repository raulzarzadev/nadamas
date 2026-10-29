import type { SchoolPlanLimits, SeatUsage } from './plans'

export type SubscriptionState =
  | 'trialing'
  | 'active'
  | 'grace'
  | 'limited'
  | 'pending_review'
  | 'exempt'
export interface SchoolSubscription {
  paymentExempt?: boolean
  exemptionReason?: string
  exemptionUpdatedAt?: number
  exemptionUpdatedBy?: string
  exemptionChangeId?: string | null
  customLimits?: { teachers: number; students: number } | null
  customPlanReason?: string
  customPlanUpdatedAt?: number
  customPlanUpdatedBy?: string
  stripeSubscriptionId?: string | null
  stripeCustomerId?: string | null
  stripeCheckoutSessionId?: string | null
  stripeCheckoutExpiresAt?: number | null
  stripeCheckoutCreatedAt?: number | null
  stripeCheckoutPriceCents?: number | null
  stripeCheckoutPromotionalCodeId?: string | null
  stripeLastEventCreated?: number

  schoolId: string
  ownerId: string
  trialStartedAt: number | null
  trialEndsAt: number | null
  periodStartedAt: number | null
  periodEndsAt: number | null
  cancelAtPeriodEnd: boolean
  promotionalCodeId: string | null
  promotionalGrantedAt: number | null
  pendingOrderId: string | null
  provisionalOrderId: string | null
  provisionalPriceCents?: number | null
  createdAt: number
  updatedAt: number
}
export interface SubscriptionAccess {
  state: SubscriptionState
  fullAccess: boolean
  accessEndsAt: number | null
}
export interface SubscriptionBankDetails {
  bank: string
  holder: string
  account: string
  clabe: string
}
export interface SubscriptionOrder {
  id: string
  schoolId: string
  schoolName: string
  ownerId: string
  amountCents: number
  currency: 'MXN'
  reference: string
  status: 'pending' | 'reported' | 'confirmed' | 'invalidated' | 'cancelled'
  promotionalCodeId: string | null
  createdAt: number
  reportedAt: number | null
  reviewedAt: number | null
  reviewedBy: string | null
  receivedAt: number | null
  periodStartedAt: number | null
  periodEndsAt: number | null
}
export interface SubscriptionCode {
  id: string
  code: string
  /** Present on older codes restricted to one school. */
  schoolId?: string
  maxUses?: number
  uses?: Array<{
    schoolId: string
    actorId: string
    actorName?: string
    appliedAt: number
    redeemedAt: number | null
    redeemedOrderId: string | null
  }>
  active: boolean
  createdAt: number
  createdBy: string
  expiresAt: number | null
  redeemedAt: number | null
  redeemedOrderId: string | null
}
export interface SubscriptionSnapshot {
  schoolId: string
  schoolName: string
  manager: boolean
  subscription: SchoolSubscription | null
  access: SubscriptionAccess
  priceCents: number
  bankDetails: SubscriptionBankDetails | null
  orders: SubscriptionOrder[]
  cardAvailable: boolean
  /** Only for managers that asked for it (`usage=1`). */
  plan?: { limits: SchoolPlanLimits; usage: SeatUsage }
}
export interface SubscriptionAdminSnapshot {
  settings: SubscriptionBankDetails
  schools: Array<{ id: string; name: string }>
  subscriptions: SchoolSubscription[]
  orders: SubscriptionOrder[]
  codes: SubscriptionCode[]
}
