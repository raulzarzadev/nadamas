import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { PaymentRuleError, validateProduct } from '@/lib/payments/engine'
import type {
  PaymentAccount,
  PaymentMovement,
  PaymentOrder,
  PaymentProduct,
  PaymentReservation,
  PaymentSettings,
} from '@/lib/payments/model'
import { adminDb } from '@/lib/server/firebase-admin'
import { createNotification } from '@/lib/server/notifications'
import { paymentAccess } from '@/lib/server/payments/access'
import { notifyPendingPayment } from '@/lib/server/payments/notifications'
import { paymentHistory } from '@/lib/server/payments/reads'
import { paymentErrorResponse, settleOverduePayments } from '@/lib/server/payments/reservations'
import {
  accountRef,
  adjustPayment,
  movement,
  orderRef,
  paymentId,
  paymentSettings,
  refundPayment,
  reviewPayment,
  settingsRef,
} from '@/lib/server/payments/store'
import { runPaymentTransaction } from '@/lib/server/payments/transaction'

export const runtime = 'nodejs'
const invalid = () =>
  NextResponse.json({ error: 'Revisa los datos e inténtalo de nuevo.' }, { status: 400 })
export async function GET(request: Request) {
  try {
    const access = await paymentAccess(request)
    if (access.response) return access.response
    await settleOverduePayments(access.key)
    const [settings, products, orders, entries, accounts, reservations] = await Promise.all([
      paymentSettings(access.key),
      adminDb.collection('paymentProducts').where('scope', '==', access.key).get(),
      paymentHistory(
        'paymentOrders',
        access.key,
        access.students.map((student) => student.id),
        access.manager
      ),
      paymentHistory(
        'paymentMovements',
        access.key,
        access.students.map((student) => student.id),
        access.manager
      ),
      access.students.length
        ? adminDb.getAll(...access.students.map((student) => accountRef(access.key, student.id)))
        : [],
      paymentHistory(
        'paymentReservations',
        access.key,
        access.students.map((student) => student.id),
        access.manager
      ),
    ])
    const studentIds = new Set(access.students.map((student) => student.id))
    return NextResponse.json(
      {
        scope: access.scope,
        manager: access.manager,
        settings,
        students: access.students,
        products: products.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .filter((product) => access.manager || (product as PaymentProduct).active),
        orders: orders
          .map((doc) => doc as PaymentOrder)
          .filter((order) => studentIds.has(order.studentId))
          .sort((a, b) => b.createdAt - a.createdAt),
        movements: entries
          .map((doc) => doc as PaymentMovement)
          .filter((entry) => studentIds.has(entry.studentId))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 200),
        reservations: reservations
          .map((doc) => doc as PaymentReservation)
          .filter((hold) => studentIds.has(hold.studentId) && hold.state === 'consumed')
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 100),
        accounts: Object.fromEntries(
          access.students.map((student, index) => [
            student.id,
            (accounts[index]?.data() as PaymentAccount) || { grants: [] },
          ])
        ),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    reportServerError('PAYMENTS_READ', error, request)
    return NextResponse.json(
      { error: 'No pudimos cargar los pagos. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
export async function POST(request: Request) {
  try {
    const access = await paymentAccess(request)
    if (access.response) return access.response
    const body = (await request.json()) as Record<string, unknown>
    if (body.action === 'settings') {
      if (!access.manager) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
      const config = body.settings as PaymentSettings
      if (
        !config ||
        typeof config.classesEnabled !== 'boolean' ||
        typeof config.periodsEnabled !== 'boolean' ||
        (config.allowBookingWithoutBalance !== undefined &&
          typeof config.allowBookingWithoutBalance !== 'boolean') ||
        !Number.isInteger(config.cancellationHours) ||
        config.cancellationHours < 0 ||
        config.cancellationHours > 720 ||
        typeof config.transferInstructions !== 'string' ||
        config.transferInstructions.length > 2000
      )
        return invalid()
      const details = config.transferDetails
      const transferDetails = { bank: '', holder: '', account: '', clabe: '', reference: '' }
      if (details !== undefined) {
        if (!details || typeof details !== 'object' || Array.isArray(details)) return invalid()
        for (const key of Object.keys(transferDetails) as Array<keyof typeof transferDetails>) {
          if (typeof details[key] !== 'string' || details[key].length > 160) return invalid()
          transferDetails[key] = details[key].trim()
        }
        if (transferDetails.clabe && !/^\d{18}$/.test(transferDetails.clabe)) return invalid()
        if (transferDetails.account && !/^\d{4,30}$/.test(transferDetails.account)) return invalid()
      }
      // A scope's timezone is authoritative; a student cannot change billing dates.
      const timezone =
        access.scope.kind === 'school'
          ? (await adminDb.collection('schools').doc(access.scope.id).get()).data()?.timezone ||
            'America/Mazatlan'
          : 'America/Mazatlan'
      await settingsRef(access.key).set({
        classesEnabled: config.classesEnabled,
        periodsEnabled: config.periodsEnabled,
        allowBookingWithoutBalance: config.allowBookingWithoutBalance === true,
        cancellationHours: config.cancellationHours,
        transferInstructions: config.transferInstructions.trim(),
        transferDetails,
        timezone,
        updatedAt: Date.now(),
      })
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'product') {
      if (!access.manager) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
      const id =
        typeof body.id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(body.id)
          ? body.id
          : adminDb.collection('paymentProducts').doc().id
      const ref = adminDb.collection('paymentProducts').doc(id)
      const product = validateProduct(body.product, id)
      await runPaymentTransaction(async (tx) => {
        const existing = await tx.get(ref)
        if (existing.exists && existing.data()?.scope !== access.key)
          throw new PaymentRuleError('payment_invalid')
        tx.set(ref, { ...product, scope: access.key, updatedAt: Date.now() })
      })
      return NextResponse.json({ product })
    }
    if (body.action === 'review') {
      if (!access.manager) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
      if (
        typeof body.orderId !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,128}$/.test(body.orderId) ||
        !['approved', 'rejected'].includes(String(body.status))
      )
        return invalid()
      const result = await reviewPayment(
        access.key,
        body.orderId,
        body.status as 'approved' | 'rejected',
        access.caller.uid
      )
      if (result.changed && result.order.ownerId)
        await createNotification({
          recipientId: result.order.ownerId,
          actorId: access.caller.uid,
          type: 'payment_reviewed',
          title: result.order.status === 'approved' ? 'Pago confirmado' : 'Pago rechazado',
          body: `${result.order.studentName} · ${result.order.product.name}`,
          link: `/athlete/payments?${access.scope.kind === 'school' ? 'schoolId' : 'coachId'}=${encodeURIComponent(access.scope.id)}`,
        }).catch((error) => console.error('[PAYMENT_NOTIFICATION]', error))
      return NextResponse.json({ ok: true })
    }
    const student = access.students.find((item) => item.id === body.studentId)
    if (!student || (!access.manager && student.ownerId !== access.caller.uid))
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
    if (typeof body.operationId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.operationId))
      return invalid()
    if (body.action === 'refund') {
      if (!access.manager) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
      if (
        typeof body.reservationId !== 'string' ||
        !/^[a-zA-Z0-9_-]{1,128}$/.test(body.reservationId) ||
        typeof body.reason !== 'string' ||
        body.reason.trim().length < 3 ||
        body.reason.length > 300
      )
        return invalid()
      await refundPayment(
        access.key,
        student.id,
        body.reservationId,
        access.caller.uid,
        body.reason.trim()
      )
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'adjust') {
      if (!access.manager) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
      if (
        typeof body.quantity !== 'number' ||
        !Number.isInteger(body.quantity) ||
        !body.quantity ||
        Math.abs(body.quantity) > 10000 ||
        typeof body.reason !== 'string' ||
        body.reason.trim().length < 3 ||
        body.reason.length > 300
      )
        return invalid()
      await adjustPayment(
        access.key,
        student.id,
        access.caller.uid,
        body.quantity,
        body.reason.trim(),
        body.operationId
      )
      return NextResponse.json({ ok: true })
    }
    if (
      body.action !== 'purchase' ||
      typeof body.productId !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(body.productId) ||
      !['cash', 'transfer'].includes(String(body.method))
    )
      return invalid()
    const id = paymentId(access.key, access.caller.uid, body.operationId)
    const created = await runPaymentTransaction(async (tx) => {
      const [productDoc, existing, settingsDoc] = await tx.getAll(
        adminDb.collection('paymentProducts').doc(body.productId as string),
        orderRef(id),
        settingsRef(access.key)
      )
      if (existing.exists) return false
      const product = productDoc.data() as PaymentProduct & { scope: string }
      const config = settingsDoc.data()
      if (
        !product ||
        product.scope !== access.key ||
        !product.active ||
        (product.mode === 'classes' ? !config?.classesEnabled : !config?.periodsEnabled)
      )
        throw new PaymentRuleError('payment_invalid')
      const { scope: _scope, ...snapshot } = product
      const order: PaymentOrder = {
        id,
        scope: access.key,
        studentId: student.id,
        studentName: student.name,
        ownerId: student.ownerId,
        product: snapshot,
        method: body.method as 'cash' | 'transfer',
        status: 'pending',
        createdAt: Date.now(),
      }
      tx.set(orderRef(id), order)
      tx.set(
        adminDb.collection('paymentParticipants').doc(paymentId(access.key, student.id)),
        { ...student, scope: access.key },
        { merge: true }
      )
      const entry = movement(
        access.key,
        student.id,
        access.caller.uid,
        'payment_pending',
        `Pago pendiente: ${product.name}`
      )
      tx.set(adminDb.collection('paymentMovements').doc(entry.id), entry)
      return true
    })
    if (created)
      await notifyPendingPayment(access.scope, access.caller.uid, student.name).catch((error) =>
        console.error('[PAYMENT_PENDING_NOTIFICATION]', error)
      )
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    const paymentError = paymentErrorResponse(error)
    if (paymentError) return NextResponse.json(paymentError, { status: 409 })
    reportServerError('PAYMENTS_WRITE', error, request)
    return NextResponse.json(
      { error: 'No pudimos guardar el pago. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
