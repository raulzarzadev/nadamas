import { runPaymentTransaction } from './transaction'
import 'server-only'
import { createHash } from 'node:crypto'
import {
  activateGrant,
  changeGrantUsage,
  localPaymentDate,
  PaymentRuleError,
} from '@/lib/payments/engine'
import {
  DEFAULT_PAYMENT_SETTINGS,
  type PaymentAccount,
  type PaymentMovement,
  type PaymentOrder,
  type PaymentProduct,
  type PaymentSettings,
} from '@/lib/payments/model'
import { adminDb } from '../firebase-admin'

export const paymentId = (...parts: string[]) =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex')
export const settingsRef = (scope: string) => adminDb.collection('paymentSettings').doc(scope)
export const accountRef = (scope: string, studentId: string) =>
  adminDb.collection('paymentAccounts').doc(paymentId(scope, studentId))
export const orderRef = (id: string) => adminDb.collection('paymentOrders').doc(id)
export function movement(
  scope: string,
  studentId: string,
  actorId: string,
  type: string,
  description: string,
  quantity?: number
): PaymentMovement {
  return {
    id: adminDb.collection('paymentMovements').doc().id,
    scope,
    studentId,
    actorId,
    type,
    description,
    createdAt: Date.now(),
    ...(quantity !== undefined ? { quantity } : {}),
  }
}
export async function paymentSettings(scope: string): Promise<PaymentSettings> {
  const snapshot = await settingsRef(scope).get()
  return { ...DEFAULT_PAYMENT_SETTINGS, ...snapshot.data() } as PaymentSettings
}
export async function reviewPayment(
  scope: string,
  id: string,
  status: 'approved' | 'rejected',
  actorId: string
) {
  return runPaymentTransaction(async (tx) => {
    const ref = orderRef(id)
    const orderDoc = await tx.get(ref)
    const order = orderDoc.data() as PaymentOrder | undefined
    if (!order || order.scope !== scope) throw new PaymentRuleError('payment_invalid')
    if (status === 'approved' && order.method === 'transfer' && !order.receiptPath)
      throw new PaymentRuleError('payment_invalid')
    if (order.status !== 'pending') {
      if (order.status === status) return { changed: false, order }
      throw new PaymentRuleError('payment_invalid')
    }
    const walletRef = accountRef(scope, order.studentId)
    const [wallet, config] = await tx.getAll(walletRef, settingsRef(scope))
    const settings = { ...DEFAULT_PAYMENT_SETTINGS, ...config.data() }
    const account: PaymentAccount = (wallet.data() as PaymentAccount) || { grants: [] }
    const now = Date.now()
    if (status === 'approved') {
      if (account.grants.length >= 200) throw new PaymentRuleError('payment_limit')
      account.grants.push(activateGrant(order.id, order.product, now, settings.timezone))
      tx.set(walletRef, { ...account, scope, studentId: order.studentId, updatedAt: now })
    }
    const reviewed = { ...order, status, reviewedAt: now, reviewedBy: actorId }
    tx.update(ref, { status, reviewedAt: now, reviewedBy: actorId })
    const entry = movement(
      scope,
      order.studentId,
      actorId,
      `payment_${status}`,
      `${status === 'approved' ? 'Pago confirmado' : 'Pago rechazado'}: ${order.product.name}`
    )
    tx.set(adminDb.collection('paymentMovements').doc(entry.id), entry)
    return { changed: true, order: reviewed }
  })
}
export async function adjustPayment(
  scope: string,
  studentId: string,
  actorId: string,
  quantity: number,
  reason: string,
  operationId: string
) {
  const entryRef = adminDb
    .collection('paymentMovements')
    .doc(paymentId(scope, studentId, operationId))
  return runPaymentTransaction(async (tx) => {
    const walletRef = accountRef(scope, studentId)
    const [wallet, entry, config] = await tx.getAll(walletRef, entryRef, settingsRef(scope))
    if (entry.exists) return
    const account: PaymentAccount = (wallet.data() as PaymentAccount) || { grants: [] }
    const timezone = config.data()?.timezone || DEFAULT_PAYMENT_SETTINGS.timezone
    const date = localPaymentDate(Date.now(), timezone)
    if (quantity > 0) {
      if (account.grants.length >= 200) throw new PaymentRuleError('payment_limit')
      const product: PaymentProduct = {
        id: entryRef.id,
        name: 'Ajuste manual',
        mode: 'classes',
        priceCents: 0,
        currency: 'MXN',
        classes: quantity,
        months: 0,
        expiryDays: null,
        perDay: null,
        perWeek: null,
        perPeriod: null,
        active: true,
      }
      account.grants.push(activateGrant(entryRef.id, product, Date.now(), timezone))
    } else {
      let remaining = -quantity
      for (const grant of account.grants) {
        if (
          grant.product.mode !== 'classes' ||
          grant.startsOn > date ||
          (grant.endsBefore && grant.endsBefore <= date)
        )
          continue
        const available = Math.max(0, grant.product.classes - grant.used - grant.reserved)
        const subtract = Math.min(available, remaining)
        changeGrantUsage(grant, date, 0, subtract)
        remaining -= subtract
      }
      if (remaining) throw new PaymentRuleError('payment_required')
    }
    tx.set(walletRef, { ...account, scope, studentId, updatedAt: Date.now() })
    tx.set(entryRef, {
      ...movement(scope, studentId, actorId, 'adjustment', reason, quantity),
      id: entryRef.id,
    })
  })
}

/** Restore the exact consumed package/period quota, including its original day/week. */
export async function refundPayment(
  scope: string,
  studentId: string,
  reservationId: string,
  actorId: string,
  reason: string
) {
  return runPaymentTransaction(async (tx) => {
    const ref = adminDb.collection('paymentReservations').doc(reservationId)
    const walletRef = accountRef(scope, studentId)
    const [snapshot, wallet] = await tx.getAll(ref, walletRef)
    const hold = snapshot.data() as import('@/lib/payments/model').PaymentReservation | undefined
    if (!hold || hold.scope !== scope || hold.studentId !== studentId)
      throw new PaymentRuleError('payment_invalid')
    if (hold.state === 'released') return
    if (hold.state !== 'consumed') throw new PaymentRuleError('payment_invalid')
    const account = wallet.data() as PaymentAccount | undefined
    const grant = account?.grants.find((item) => item.id === hold.grantId)
    if (!account || !grant) throw new PaymentRuleError('payment_invalid')
    changeGrantUsage(grant, hold.date, 0, -1)
    tx.set(walletRef, { ...account, scope, studentId, updatedAt: Date.now() })
    tx.update(ref, { state: 'released', reason, refundedAt: Date.now(), refundedBy: actorId })
    const entry = movement(
      scope,
      studentId,
      actorId,
      'refund',
      `Devolución · ${hold.date} ${hold.startTime}: ${reason}`,
      1
    )
    tx.set(adminDb.collection('paymentMovements').doc(entry.id), entry)
  })
}
