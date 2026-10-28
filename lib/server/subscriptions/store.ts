import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import type { Transaction } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/server/firebase-admin'
import {
  assertSubscriptionPayable,
  newSchoolSubscription,
  SUBSCRIPTION_GRACE_MS,
  SUBSCRIPTION_PRICE_CENTS,
  SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS,
  SubscriptionError,
  subscriptionMonthEnd,
  subscriptionPrice,
} from '@/lib/subscriptions/engine'
import type {
  SchoolSubscription,
  SubscriptionBankDetails,
  SubscriptionCode,
  SubscriptionOrder,
} from '@/lib/subscriptions/model'
import { stripeRequest } from './stripe-client'

export const subscriptionRef = (schoolId: string) =>
  adminDb.collection('schoolSubscriptions').doc(schoolId)
const orderRef = (id: string) => adminDb.collection('subscriptionOrders').doc(id)
const codeRef = (id: string) => adminDb.collection('subscriptionCodes').doc(id)
export const subscriptionSettingsRef = () => adminDb.collection('subscriptionSettings').doc('bank')
export const EMPTY_SUBSCRIPTION_BANK: SubscriptionBankDetails = {
  bank: '',
  holder: '',
  account: '',
  clabe: '',
}
const hashCode = (code: string) =>
  createHash('sha256').update(code.trim().toUpperCase()).digest('hex')
const audit = (tx: Transaction, actorId: string, action: string, details: object, now: number) => {
  tx.set(adminDb.collection('subscriptionAudit').doc(), {
    actorId,
    action,
    ...details,
    createdAt: now,
  })
}

/** Read before any transaction writes, then invoke the returned callback with the creation writes. */
export async function prepareSchoolSubscriptionCreation(
  tx: Transaction,
  schoolId: string,
  ownerId: string,
  now = Date.now()
) {
  const marker = adminDb.collection('subscriptionTrialOwners').doc(ownerId)
  const [owner, existing] = await tx.getAll(marker, subscriptionRef(schoolId))
  return () => {
    if (existing.exists) return
    tx.set(subscriptionRef(schoolId), newSchoolSubscription(schoolId, ownerId, !owner.exists, now))
    if (!owner.exists) tx.create(marker, { ownerId, schoolId, usedAt: now })
  }
}

export async function createSubscriptionTransfer(
  schoolId: string,
  ownerId: string,
  schoolName: string,
  actorId: string
) {
  const now = Date.now()
  const id = randomBytes(12).toString('hex')
  return adminDb.runTransaction(async (tx) => {
    const [subDoc, bankDoc] = await tx.getAll(subscriptionRef(schoolId), subscriptionSettingsRef())
    const sub =
      (subDoc.data() as SchoolSubscription) || newSchoolSubscription(schoolId, ownerId, false, now)
    assertSubscriptionPayable(sub)
    const previous = sub.pendingOrderId ? await tx.get(orderRef(sub.pendingOrderId)) : null
    if (previous?.exists && ['pending', 'reported'].includes(previous.data()?.status))
      return previous.data() as SubscriptionOrder
    if (previous?.data()?.status === 'invalidated')
      throw new SubscriptionError(
        'payment_invalidated',
        'Contacta a Nadamas para revisar el pago invalidado.',
        409
      )
    if (
      sub.stripeSubscriptionId ||
      (sub.stripeCheckoutExpiresAt && sub.stripeCheckoutExpiresAt > now)
    )
      throw new SubscriptionError(
        'card_active',
        'Resuelve la suscripción o el pago de tarjeta antes de transferir.',
        409
      )
    const codeDoc = sub.promotionalCodeId ? await tx.get(codeRef(sub.promotionalCodeId)) : null
    const promo = codeDoc?.data() as SubscriptionCode | undefined
    const newCode =
      promo?.active && !promo.redeemedAt && (!promo.expiresAt || now < promo.expiresAt)
    const amountCents = newCode
      ? SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS
      : promo && !promo.redeemedAt
        ? SUBSCRIPTION_PRICE_CENTS
        : subscriptionPrice(sub, now)
    const bank = bankDoc.data() as SubscriptionBankDetails | undefined
    if (!bank?.bank || !bank.holder || (!bank.clabe && !bank.account))
      throw new SubscriptionError(
        'transfer_unavailable',
        'Las transferencias todavía no están disponibles. Inténtalo más tarde.',
        409
      )
    const order: SubscriptionOrder = {
      id,
      schoolId,
      schoolName,
      ownerId,
      amountCents,
      currency: 'MXN',
      reference: `ND${id.toUpperCase()}`,
      status: 'pending',
      promotionalCodeId:
        amountCents === SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS ? sub.promotionalCodeId : null,
      createdAt: now,
      reportedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      receivedAt: null,
      periodStartedAt: null,
      periodEndsAt: null,
    }
    tx.create(orderRef(id), order)
    tx.set(subscriptionRef(schoolId), { ...sub, pendingOrderId: id, updatedAt: now })
    audit(tx, actorId, 'transfer_created', { schoolId, orderId: id }, now)
    return order
  })
}

export async function reportSubscriptionTransfer(
  schoolId: string,
  orderId: string,
  actorId: string
) {
  const now = Date.now()
  await adminDb.runTransaction(async (tx) => {
    const [orderDoc, subDoc] = await tx.getAll(orderRef(orderId), subscriptionRef(schoolId))
    const order = orderDoc.data() as SubscriptionOrder | undefined
    const sub = subDoc.data() as SchoolSubscription | undefined
    if (!order || !sub || order.schoolId !== schoolId)
      throw new SubscriptionError('invalid_payment', 'No encontramos ese pago.', 404)
    if (order.status === 'confirmed') return
    assertSubscriptionPayable(sub)
    if (sub.pendingOrderId !== orderId)
      throw new SubscriptionError('invalid_payment', 'No encontramos ese pago.', 404)
    if (order.status === 'reported') return
    if (order.status !== 'pending')
      throw new SubscriptionError('invalid_payment', 'Ese pago ya fue invalidado.', 409)
    tx.update(orderRef(orderId), { status: 'reported', reportedAt: now })
    tx.update(subscriptionRef(schoolId), {
      provisionalOrderId: orderId,
      provisionalPriceCents: order.amountCents,
      updatedAt: now,
    })
    audit(tx, actorId, 'transfer_reported', { schoolId, orderId }, now)
  })
}

export async function redeemSubscriptionCode(schoolId: string, code: string, actorId: string) {
  const now = Date.now()
  await adminDb.runTransaction(async (tx) => {
    const ref = codeRef(hashCode(code))
    const [codeDoc, subDoc] = await tx.getAll(ref, subscriptionRef(schoolId))
    const promo = codeDoc.data() as SubscriptionCode | undefined
    const sub = subDoc.data() as SchoolSubscription | undefined
    assertSubscriptionPayable(sub)
    if (
      !promo ||
      !sub ||
      promo.schoolId !== schoolId ||
      !promo.active ||
      promo.redeemedAt ||
      (promo.expiresAt && now >= promo.expiresAt)
    )
      throw new SubscriptionError(
        'invalid_code',
        'El código no está disponible para esta escuela.',
        409
      )
    if (
      sub.stripeSubscriptionId ||
      (sub.stripeCheckoutExpiresAt && sub.stripeCheckoutExpiresAt > now)
    )
      throw new SubscriptionError(
        'card_active',
        'Resuelve la suscripción de tarjeta antes de aplicar otro código.',
        409
      )
    if (sub.pendingOrderId)
      throw new SubscriptionError(
        'payment_pending',
        'Resuelve el pago pendiente antes de aplicar otro código.',
        409
      )
    // Code is reserved to this school; only a confirmed payment consumes it.
    tx.update(subscriptionRef(schoolId), {
      promotionalCodeId: ref.id,
      promotionalGrantedAt: now,
      updatedAt: now,
    })
    audit(tx, actorId, 'code_applied', { schoolId, codeId: ref.id }, now)
  })
}

export async function reviewSubscriptionTransfer(
  orderId: string,
  status: 'confirmed' | 'invalidated',
  actorId: string,
  receivedAt?: number
) {
  const now = Date.now()
  return adminDb.runTransaction(async (tx) => {
    const orderDoc = await tx.get(orderRef(orderId))
    const order = orderDoc.data() as SubscriptionOrder | undefined
    if (!order) throw new SubscriptionError('not_found', 'No encontramos el pago.', 404)
    const subDoc = await tx.get(subscriptionRef(order.schoolId))
    const sub = subDoc.data() as SchoolSubscription | undefined
    const promoDoc = order.promotionalCodeId ? await tx.get(codeRef(order.promotionalCodeId)) : null
    if (!sub) throw new SubscriptionError('not_found', 'No encontramos la suscripción.', 404)
    if (order.status === status) return order
    if (
      order.status === 'confirmed' ||
      order.status === 'invalidated' ||
      order.status === 'cancelled'
    )
      throw new SubscriptionError('already_reviewed', 'Este pago ya fue revisado.', 409)
    if (
      status === 'confirmed' &&
      (!receivedAt || receivedAt > now || receivedAt < Math.floor(order.createdAt / 60000) * 60000)
    )
      throw new SubscriptionError('invalid_date', 'Revisa la fecha del ingreso bancario.', 400)
    if (status === 'confirmed') {
      const received = receivedAt as number
      const deadline = sub.periodEndsAt
        ? sub.periodEndsAt + (sub.cancelAtPeriodEnd ? 0 : SUBSCRIPTION_GRACE_MS)
        : null
      const promo = promoDoc?.data() as SubscriptionCode | undefined
      const newCode =
        promo &&
        !promo.redeemedAt &&
        promo.active &&
        (!promo.expiresAt || order.createdAt < promo.expiresAt)
      if (order.promotionalCodeId && !newCode && deadline && received >= deadline)
        throw new SubscriptionError(
          'price_expired',
          'El ingreso llegó fuera del plazo del precio especial. Revisa el importe antes de confirmarlo.',
          409
        )
      const start =
        sub.periodEndsAt &&
        received <= sub.periodEndsAt + SUBSCRIPTION_GRACE_MS &&
        !sub.cancelAtPeriodEnd
          ? sub.periodEndsAt
          : received
      const end = subscriptionMonthEnd(start)
      tx.update(orderRef(orderId), {
        status,
        reviewedAt: now,
        reviewedBy: actorId,
        receivedAt: received,
        periodStartedAt: start,
        periodEndsAt: end,
      })
      tx.update(subscriptionRef(order.schoolId), {
        trialEndsAt: sub.trialEndsAt ? Math.min(sub.trialEndsAt, received) : null,
        periodStartedAt: start,
        periodEndsAt: end,
        cancelAtPeriodEnd: false,
        promotionalCodeId: order.promotionalCodeId,
        promotionalGrantedAt: order.promotionalCodeId ? sub.promotionalGrantedAt || received : null,
        pendingOrderId: null,
        provisionalOrderId: null,
        provisionalPriceCents: null,
        updatedAt: now,
      })
      if (promo && !promo.redeemedAt)
        tx.update(codeRef(promo.id), { redeemedAt: now, redeemedOrderId: orderId })
    } else {
      tx.update(orderRef(orderId), { status, reviewedAt: now, reviewedBy: actorId })
      tx.update(subscriptionRef(order.schoolId), {
        provisionalOrderId: null,
        provisionalPriceCents: null,
        updatedAt: now,
      })
    }
    audit(
      tx,
      actorId,
      `transfer_${status}`,
      { orderId, schoolId: order.schoolId, receivedAt: receivedAt || null },
      now
    )
    return { ...order, status }
  })
}

export async function changeSubscriptionRenewal(
  schoolId: string,
  cancel: boolean,
  actorId: string
) {
  const now = Date.now()
  await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(subscriptionRef(schoolId))
    const sub = doc.data() as SchoolSubscription | undefined
    assertSubscriptionPayable(sub)
    if (sub?.stripeSubscriptionId)
      throw new SubscriptionError(
        'card_active',
        'Gestiona la renovación de tarjeta desde su opción de pago.',
        409
      )
    if (!sub?.periodEndsAt || now >= sub.periodEndsAt)
      throw new SubscriptionError('no_active_period', 'No hay un periodo pagado vigente.', 409)
    tx.update(subscriptionRef(schoolId), { cancelAtPeriodEnd: cancel, updatedAt: now })
    audit(tx, actorId, cancel ? 'renewal_cancelled' : 'renewal_resumed', { schoolId }, now)
  })
}

export async function createSubscriptionCode(
  schoolId: string,
  code: string,
  actorId: string,
  expiresAt: number | null
) {
  const now = Date.now()
  const normalized = code.trim().toUpperCase()
  const id = hashCode(normalized)
  await adminDb.runTransaction(async (tx) => {
    const [school, existing, subDoc] = await tx.getAll(
      adminDb.collection('schools').doc(schoolId),
      codeRef(id),
      subscriptionRef(schoolId)
    )
    assertSubscriptionPayable(subDoc.data() as SchoolSubscription | undefined)
    if (!school.exists) throw new SubscriptionError('not_found', 'No encontramos la escuela.', 404)
    if (existing.exists) throw new SubscriptionError('code_exists', 'Elige otro código.', 409)
    const promo: SubscriptionCode = {
      id,
      code: normalized,
      schoolId,
      active: true,
      createdAt: now,
      createdBy: actorId,
      expiresAt,
      redeemedAt: null,
      redeemedOrderId: null,
    }
    tx.create(codeRef(id), promo)
    audit(tx, actorId, 'code_created', { schoolId, codeId: id }, now)
  })
}

export async function disableSubscriptionCode(id: string, actorId: string) {
  await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(codeRef(id))
    if (!doc.exists) throw new SubscriptionError('not_found', 'No encontramos el código.', 404)
    tx.update(codeRef(id), { active: false })
    audit(tx, actorId, 'code_disabled', { codeId: id }, Date.now())
  })
}

/** Explicit support release prevents invalidated reports from restoring access by a retry. */
export async function releaseInvalidatedSubscriptionPayment(schoolId: string, actorId: string) {
  await adminDb.runTransaction(async (tx) => {
    const subDoc = await tx.get(subscriptionRef(schoolId))
    const sub = subDoc.data() as SchoolSubscription | undefined
    const order = sub?.pendingOrderId ? await tx.get(orderRef(sub.pendingOrderId)) : null
    if (!sub || order?.data()?.status !== 'invalidated')
      throw new SubscriptionError('invalid_payment', 'No hay un pago invalidado por resolver.', 409)
    tx.update(subscriptionRef(schoolId), {
      pendingOrderId: null,
      provisionalOrderId: null,
      provisionalPriceCents: null,
      updatedAt: Date.now(),
    })
    audit(tx, actorId, 'invalidated_payment_released', { schoolId, orderId: order.id }, Date.now())
  })
}

/** Only an unreported request may be abandoned without administrator review. */
export async function cancelSubscriptionTransfer(
  schoolId: string,
  orderId: string,
  actorId: string
) {
  await adminDb.runTransaction(async (tx) => {
    const [subDoc, orderDoc] = await tx.getAll(subscriptionRef(schoolId), orderRef(orderId))
    const sub = subDoc.data() as SchoolSubscription | undefined
    const order = orderDoc.data() as SubscriptionOrder | undefined
    if (!sub || !order || order.schoolId !== schoolId)
      throw new SubscriptionError('invalid_payment', 'No encontramos ese pago.', 404)
    if (order.status === 'cancelled') return
    if (order.status !== 'pending' || sub.pendingOrderId !== orderId)
      throw new SubscriptionError(
        'payment_reported',
        'Una transferencia reportada requiere revisión de Nadamas.',
        409
      )
    tx.update(orderRef(orderId), { status: 'cancelled' })
    tx.update(subscriptionRef(schoolId), { pendingOrderId: null, updatedAt: Date.now() })
    audit(tx, actorId, 'transfer_cancelled', { schoolId, orderId }, Date.now())
  })
}

/** Provider effects precede enabling the exemption, with a transaction lock against new payments. */
export async function setSchoolPaymentExemption(
  schoolId: string,
  enabled: boolean,
  reason: string,
  actorId: string
) {
  const token = randomBytes(16).toString('hex')
  const ref = subscriptionRef(schoolId)
  const reserved = await adminDb.runTransaction(async (tx) => {
    const [school, doc] = await tx.getAll(adminDb.collection('schools').doc(schoolId), ref)
    if (!school.exists) throw new SubscriptionError('not_found', 'No encontramos la escuela.', 404)
    const sub =
      (doc.data() as SchoolSubscription | undefined) ||
      newSchoolSubscription(
        schoolId,
        String(school.data()?.createdBy || school.data()?.directorId || ''),
        false,
        Date.now()
      )
    if (sub.exemptionChangeId)
      throw new SubscriptionError(
        'exemption_pending',
        'Hay un cambio de exención en proceso. Inténtalo de nuevo.',
        409
      )
    if (
      enabled &&
      sub.stripeCheckoutSessionId &&
      !sub.stripeCheckoutSessionId.startsWith('cs_') &&
      (sub.stripeCheckoutExpiresAt || 0) > Date.now()
    )
      throw new SubscriptionError(
        'checkout_pending',
        'Espera a que termine de prepararse el pago de tarjeta antes de exentar la escuela.',
        409
      )
    tx.set(ref, { ...sub, exemptionChangeId: token })
    return sub
  })
  let providerCancelled = false
  try {
    if (enabled && reserved.stripeSubscriptionId) {
      await stripeRequest(
        `subscriptions/${encodeURIComponent(reserved.stripeSubscriptionId)}`,
        new URLSearchParams({ invoice_now: 'false', prorate: 'false' }),
        `exempt-cancel-${schoolId}-${token}`,
        'DELETE'
      )
      providerCancelled = true
    }
    if (enabled && reserved.stripeCheckoutSessionId?.startsWith('cs_')) {
      const session = await stripeRequest<{ id: string; status: string }>(
        `checkout/sessions/${encodeURIComponent(reserved.stripeCheckoutSessionId)}`
      )
      if (session.status === 'open')
        await stripeRequest(
          `checkout/sessions/${encodeURIComponent(session.id)}/expire`,
          new URLSearchParams(),
          `exempt-expire-${schoolId}-${token}`
        )
      if (session.status === 'complete')
        throw new SubscriptionError(
          'checkout_completed',
          'El pago de tarjeta se está confirmando. Actualiza la suscripción antes de exentar la escuela.',
          409
        )
    }
    const now = Date.now()
    await adminDb.runTransaction(async (tx) => {
      const doc = await tx.get(ref)
      const current = doc.data() as SchoolSubscription | undefined
      if (
        !current ||
        current.exemptionChangeId !== token ||
        ((current.stripeSubscriptionId || null) !== (reserved.stripeSubscriptionId || null) &&
          !(providerCancelled && !current.stripeSubscriptionId)) ||
        (current.stripeCheckoutSessionId || null) !== (reserved.stripeCheckoutSessionId || null)
      )
        throw new SubscriptionError(
          'subscription_changed',
          'La suscripción cambió durante la operación. Revísala e inténtalo de nuevo.',
          409
        )
      tx.update(ref, {
        paymentExempt: enabled,
        exemptionReason: reason,
        exemptionUpdatedAt: now,
        exemptionUpdatedBy: actorId,
        exemptionChangeId: null,
        updatedAt: now,
        ...(enabled && reserved.stripeSubscriptionId
          ? { cancelAtPeriodEnd: true, stripeSubscriptionId: null }
          : {}),
        ...(enabled
          ? {
              stripeCheckoutSessionId: null,
              stripeCheckoutExpiresAt: null,
              stripeCheckoutCreatedAt: null,
              stripeCheckoutPriceCents: null,
              stripeCheckoutPromotionalCodeId: null,
            }
          : {}),
      })
      audit(
        tx,
        actorId,
        enabled ? 'school_payment_exempted' : 'school_payment_exemption_removed',
        { schoolId, reason },
        now
      )
    })
  } catch (error) {
    await adminDb
      .runTransaction(async (tx) => {
        const doc = await tx.get(ref)
        if (doc.data()?.exemptionChangeId === token)
          tx.update(ref, {
            exemptionChangeId: null,
            ...(providerCancelled &&
            doc.data()?.stripeSubscriptionId === reserved.stripeSubscriptionId
              ? { cancelAtPeriodEnd: true, stripeSubscriptionId: null }
              : {}),
          })
      })
      .catch(() => undefined)
    throw error
  }
}
