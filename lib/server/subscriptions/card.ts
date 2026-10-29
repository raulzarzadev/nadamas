import 'server-only'
import { randomUUID } from 'node:crypto'
import { adminDb } from '@/lib/server/firebase-admin'
import {
  assertSubscriptionPayable,
  SUBSCRIPTION_GRACE_MS,
  SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS,
  SubscriptionError,
  subscriptionCodeAvailableForSchool,
  subscriptionCodeRedeemed,
  subscriptionPrice,
} from '@/lib/subscriptions/engine'
import type { SchoolSubscription, SubscriptionCode } from '@/lib/subscriptions/model'
import { subscriptionRef } from './store'
import { type StripeObject, stripeConfigured, stripeRequest } from './stripe-client'

interface StripeSubscription extends StripeObject {
  status: string
  customer: string
  cancel_at_period_end: boolean
  metadata: { schoolId?: string; promotionalCodeId?: string }
  items: {
    data: Array<{
      id: string
      current_period_start: number
      current_period_end: number
      price: { unit_amount: number; currency: string }
    }>
  }
  latest_invoice:
    | string
    | {
        id: string
        paid: boolean
        amount_paid: number
        currency: string
        status: string
        lines: { data: Array<{ period: { start: number; end: number }; amount: number }> }
        status_transitions?: { paid_at: number }
      }
}
function appUrl() {
  const url = new URL(process.env.SUBSCRIPTION_APP_URL || '')
  if (
    url.protocol !== 'https:' &&
    !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost')
  )
    throw new Error('SUBSCRIPTION_APP_URL')
  return `${url.origin}/school/subscription`
}
export async function createCardCheckout(schoolId: string, actorId: string) {
  assertSubscriptionPayable(
    (await subscriptionRef(schoolId).get()).data() as SchoolSubscription | undefined
  )
  if (!stripeConfigured())
    throw new SubscriptionError(
      'card_unavailable',
      'El pago con tarjeta todavía no está disponible.',
      409
    )
  const now = Date.now()
  const attempt = randomUUID()
  const reservation = await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(subscriptionRef(schoolId))
    const sub = doc.data() as SchoolSubscription | undefined
    assertSubscriptionPayable(sub)
    if (!sub)
      throw new SubscriptionError(
        'subscription_missing',
        'Activa primero la suscripción de esta escuela.',
        409
      )
    if (sub.pendingOrderId)
      throw new SubscriptionError(
        'transfer_pending',
        'Resuelve el pago por transferencia antes de pagar con tarjeta.',
        409
      )
    if (sub.stripeSubscriptionId)
      throw new SubscriptionError(
        'card_exists',
        'Esta escuela ya tiene una suscripción con tarjeta. Administra su renovación.',
        409
      )
    if (sub.periodEndsAt && sub.periodEndsAt > now)
      throw new SubscriptionError(
        'period_active',
        'Puedes cambiar a tarjeta cuando termine el periodo pagado por transferencia.',
        409
      )
    if (
      sub.stripeCheckoutSessionId &&
      sub.stripeCheckoutExpiresAt &&
      sub.stripeCheckoutExpiresAt > now
    )
      return { attempt: sub.stripeCheckoutSessionId, sub, existing: true }
    const promoDoc = sub.promotionalCodeId
      ? await tx.get(adminDb.collection('subscriptionCodes').doc(sub.promotionalCodeId))
      : null
    const promo = promoDoc?.data() as SubscriptionCode | undefined
    const eligible =
      promo?.active &&
      subscriptionCodeAvailableForSchool(promo, schoolId) &&
      !subscriptionCodeRedeemed(promo, schoolId) &&
      (!promo.expiresAt || promo.expiresAt > now)
    const price = eligible
      ? SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS
      : promo && !subscriptionCodeRedeemed(promo, schoolId)
        ? 29900
        : subscriptionPrice(sub, now)
    tx.update(subscriptionRef(schoolId), {
      stripeCheckoutSessionId: attempt,
      stripeCheckoutCreatedAt: now,
      stripeCheckoutPriceCents: price,
      stripeCheckoutPromotionalCodeId: price === 4900 ? sub.promotionalCodeId : null,
      stripeCheckoutExpiresAt: now + 31 * 60000,
      updatedAt: now,
    })
    return { attempt, sub, existing: false, price }
  })
  if (reservation.existing && reservation.attempt.startsWith('cs_')) {
    const session = await stripeRequest<{ url: string; status: string }>(
      `checkout/sessions/${encodeURIComponent(reservation.attempt)}`
    )
    if (session.status === 'open' && session.url) return session.url
    throw new SubscriptionError(
      'checkout_pending',
      'Estamos confirmando tu pago. Actualiza en unos momentos.',
      409
    )
  }
  if (reservation.existing)
    throw new SubscriptionError(
      'checkout_pending',
      'Estamos preparando tu pago. Inténtalo de nuevo en unos momentos.',
      409
    )
  const params = new URLSearchParams({
    mode: 'subscription',
    success_url: `${appUrl()}?schoolId=${encodeURIComponent(schoolId)}&payment=processing`,
    cancel_url: `${appUrl()}?schoolId=${encodeURIComponent(schoolId)}`,
    'payment_method_types[0]': 'card',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'mxn',
    'line_items[0][price_data][unit_amount]': String(reservation.price),
    'line_items[0][price_data][recurring][interval]': 'month',
    'line_items[0][price_data][product_data][name]': 'Suscripción Nadamas por escuela',
    'metadata[schoolId]': schoolId,
    'metadata[attempt]': attempt,
    'subscription_data[metadata][schoolId]': schoolId,
    'subscription_data[metadata][promotionalCodeId]':
      reservation.price === 4900 ? reservation.sub.promotionalCodeId || '' : '',
    expires_at: String(Math.floor((now + 30 * 60000) / 1000)),
    locale: 'es',
  })
  const session = await stripeRequest<{ id: string; url: string; expires_at: number }>(
    'checkout/sessions',
    params,
    `school-checkout-${attempt}`
  )
  await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(subscriptionRef(schoolId))
    if (doc.data()?.stripeCheckoutSessionId !== attempt)
      throw new Error('CHECKOUT_RESERVATION_CHANGED')
    tx.update(subscriptionRef(schoolId), {
      stripeCheckoutSessionId: session.id,
      stripeCheckoutExpiresAt: session.expires_at * 1000,
    })
    tx.create(adminDb.collection('subscriptionAudit').doc(), {
      actorId,
      schoolId,
      action: 'card_checkout_created',
      sessionId: session.id,
      createdAt: Date.now(),
    })
  })
  return session.url
}
export async function createCardPortal(schoolId: string) {
  const sub = (await subscriptionRef(schoolId).get()).data() as SchoolSubscription | undefined
  assertSubscriptionPayable(sub)
  if (!sub?.stripeCustomerId)
    throw new SubscriptionError('card_missing', 'No hay una tarjeta registrada.', 409)
  const session = await stripeRequest<{ url: string }>(
    'billing_portal/sessions',
    new URLSearchParams({
      customer: sub.stripeCustomerId,
      return_url: `${appUrl()}?schoolId=${encodeURIComponent(schoolId)}`,
    })
  )
  return session.url
}
export async function changeCardRenewal(schoolId: string, cancel: boolean, actorId: string) {
  const doc = await subscriptionRef(schoolId).get()
  const sub = doc.data() as SchoolSubscription | undefined
  assertSubscriptionPayable(sub)
  if (!sub?.stripeSubscriptionId)
    throw new SubscriptionError('card_missing', 'No hay una suscripción con tarjeta.', 409)
  await stripeRequest(
    `subscriptions/${encodeURIComponent(sub.stripeSubscriptionId)}`,
    new URLSearchParams({ cancel_at_period_end: String(cancel) }),
    `renewal-${schoolId}-${cancel}-${sub.updatedAt}`
  )
  try {
    await adminDb.runTransaction(async (tx) => {
      const current = await tx.get(subscriptionRef(schoolId))
      assertSubscriptionPayable(current.data() as SchoolSubscription | undefined)
      if (current.data()?.stripeSubscriptionId !== sub.stripeSubscriptionId)
        throw new SubscriptionError(
          'subscription_changed',
          'La suscripción cambió. Actualiza la pantalla.',
          409
        )
      tx.update(subscriptionRef(schoolId), { cancelAtPeriodEnd: cancel, updatedAt: Date.now() })
    })
  } catch (error) {
    const current = (await subscriptionRef(schoolId).get()).data() as SchoolSubscription | undefined
    if (current?.paymentExempt || current?.exemptionChangeId) {
      await stripeRequest(
        `subscriptions/${encodeURIComponent(sub.stripeSubscriptionId)}`,
        new URLSearchParams({ invoice_now: 'false', prorate: 'false' }),
        `exempt-renewal-race-${schoolId}-${sub.updatedAt}`,
        'DELETE'
      )
    }
    throw error
  }
  await adminDb.collection('subscriptionAudit').add({
    actorId,
    schoolId,
    action: cancel ? 'card_cancelled' : 'card_resumed',
    createdAt: Date.now(),
  })
}
export async function handleStripeEvent(event: StripeObject) {
  const type = String(event.type)
  if (
    ![
      'checkout.session.completed',
      'invoice.paid',
      'invoice.payment_failed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ].includes(type)
  )
    return
  const object = (event.data as { object: StripeObject }).object
  let subscriptionId = ''
  if (type.startsWith('customer.subscription.')) subscriptionId = object.id
  else if (type.startsWith('checkout.')) subscriptionId = String(object.subscription || '')
  else {
    const parent = object.parent as { subscription_details?: { subscription?: string } } | undefined
    subscriptionId = parent?.subscription_details?.subscription || String(object.subscription || '')
  }
  if (!subscriptionId.startsWith('sub_')) return
  // Always read current provider state: old deliveries cannot undo a newer provider state.
  const live = await stripeRequest<StripeSubscription>(
    `subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=latest_invoice`
  )
  const schoolId = live.metadata?.schoolId
  if (!schoolId) return
  const exemption = (await subscriptionRef(schoolId).get()).data() as SchoolSubscription | undefined
  if (
    (exemption?.paymentExempt || exemption?.exemptionChangeId) &&
    !['canceled', 'incomplete_expired'].includes(live.status)
  ) {
    await stripeRequest(
      `subscriptions/${encodeURIComponent(live.id)}`,
      new URLSearchParams({ invoice_now: 'false', prorate: 'false' }),
      `exempt-webhook-${live.id}-${event.id}`,
      'DELETE'
    )
    live.cancel_at_period_end = true
    live.status = 'canceled'
  }
  const item = live.items.data[0]
  if (!item || live.items.data.length !== 1) throw new Error('STRIPE_ITEMS_INVALID')
  const invoice = typeof live.latest_invoice === 'object' ? live.latest_invoice : null
  const paid = Boolean(
    invoice?.paid &&
      invoice.status === 'paid' &&
      invoice.currency === 'mxn' &&
      invoice.amount_paid === item.price.unit_amount &&
      Number.isFinite(item.current_period_start) &&
      Number.isFinite(item.current_period_end) &&
      item.current_period_end > item.current_period_start &&
      invoice.lines?.data?.length === 1 &&
      invoice.lines.data[0].amount === item.price.unit_amount &&
      invoice.lines.data[0].period.start === item.current_period_start &&
      invoice.lines.data[0].period.end === item.current_period_end
  )
  const eventRef = adminDb.collection('subscriptionStripeEvents').doc(event.id)
  await adminDb.runTransaction(async (tx) => {
    const [seen, doc] = await tx.getAll(eventRef, subscriptionRef(schoolId))
    if (seen.exists) return
    const sub = doc.data() as SchoolSubscription | undefined
    if (!sub) throw new Error('STRIPE_SCHOOL_MISSING')
    if ((Number(event.created) || 0) < (sub.stripeLastEventCreated || 0)) {
      tx.create(eventRef, {
        type,
        schoolId,
        subscriptionId,
        processedAt: Date.now(),
        ignored: 'stale',
      })
      return
    }
    if (!sub.stripeSubscriptionId && ['canceled', 'incomplete_expired'].includes(live.status)) {
      tx.create(eventRef, {
        type,
        schoolId,
        subscriptionId,
        processedAt: Date.now(),
        ignored: 'closed',
      })
      return
    }
    if (sub.stripeSubscriptionId && sub.stripeSubscriptionId !== live.id)
      throw new Error('STRIPE_DUPLICATE_SUBSCRIPTION')
    const promoRef = live.metadata.promotionalCodeId
      ? adminDb.collection('subscriptionCodes').doc(live.metadata.promotionalCodeId)
      : null
    const promoDoc = promoRef ? await tx.get(promoRef) : null
    if (item.price.currency !== 'mxn' || ![4900, 29900].includes(item.price.unit_amount))
      throw new Error('STRIPE_PRICE_INVALID')
    if (item.price.unit_amount === 4900) {
      const promo = promoDoc?.data() as SubscriptionCode | undefined
      if (
        !promo ||
        !subscriptionCodeAvailableForSchool(promo, schoolId) ||
        sub.promotionalCodeId !== promoRef?.id
      )
        throw new Error('STRIPE_PROMO_INVALID')
      const recurringBenefit = Boolean(
        subscriptionCodeRedeemed(promo, schoolId) &&
          sub.promotionalGrantedAt &&
          sub.stripeSubscriptionId === live.id
      )
      if (!recurringBenefit) {
        const quotedAt = sub.stripeCheckoutCreatedAt
        const validQuote = Boolean(
          quotedAt &&
            sub.stripeCheckoutPriceCents === 4900 &&
            sub.stripeCheckoutPromotionalCodeId === promoRef?.id &&
            (!promo.expiresAt || quotedAt < promo.expiresAt)
        )
        if (
          subscriptionCodeRedeemed(promo, schoolId) ||
          !promo.active ||
          (promo.expiresAt && Date.now() >= promo.expiresAt && !validQuote)
        )
          throw new Error('STRIPE_PROMO_INVALID')
      } else if (paid && sub.periodEndsAt && item.current_period_end * 1000 > sub.periodEndsAt) {
        const paidAt = (invoice?.status_transitions?.paid_at || 0) * 1000
        const deadline = sub.periodEndsAt + (sub.cancelAtPeriodEnd ? 0 : SUBSCRIPTION_GRACE_MS)
        if (!paidAt || paidAt >= deadline) throw new Error('STRIPE_PROMO_LAPSED')
      }
    }
    const patch: Partial<SchoolSubscription> = {
      stripeSubscriptionId: live.id,
      stripeCustomerId: live.customer,
      cancelAtPeriodEnd: Boolean(
        sub.paymentExempt ||
          sub.exemptionChangeId ||
          live.cancel_at_period_end ||
          live.status === 'canceled'
      ),
      stripeLastEventCreated: Math.max(sub.stripeLastEventCreated || 0, Number(event.created) || 0),
      updatedAt: Date.now(),
    }
    if (paid && live.status !== 'incomplete_expired') {
      const start = item.current_period_start * 1000,
        end = item.current_period_end * 1000
      if (!sub.periodEndsAt || end >= sub.periodEndsAt) {
        patch.periodStartedAt = start
        patch.periodEndsAt = end
        patch.trialEndsAt = sub.trialEndsAt ? Math.min(sub.trialEndsAt, start) : null
        patch.promotionalCodeId =
          item.price.unit_amount === 4900 ? live.metadata.promotionalCodeId || null : null
        patch.promotionalGrantedAt = patch.promotionalCodeId
          ? sub.promotionalGrantedAt || start
          : null
      }
      const promo = promoDoc?.data() as SubscriptionCode | undefined
      if (promoRef && invoice && promo && !subscriptionCodeRedeemed(promo, schoolId))
        tx.update(
          promoRef,
          promo.maxUses !== undefined
            ? {
                uses: (promo.uses || []).map((use) =>
                  use.schoolId === schoolId
                    ? { ...use, redeemedAt: Date.now(), redeemedOrderId: invoice.id }
                    : use
                ),
              }
            : { redeemedAt: Date.now(), redeemedOrderId: invoice.id }
        )
    }
    if (live.status === 'canceled' || live.status === 'incomplete_expired') {
      patch.stripeSubscriptionId = null
      patch.stripeCheckoutSessionId = null
      patch.stripeCheckoutExpiresAt = null
    }
    tx.update(subscriptionRef(schoolId), patch)
    tx.create(eventRef, { type, schoolId, subscriptionId, processedAt: Date.now() })
  })
}
