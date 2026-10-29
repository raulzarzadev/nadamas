import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { adminDb } from '@/lib/server/firebase-admin'
import {
  subscriptionErrorResponse,
  subscriptionSchoolAccess,
} from '@/lib/server/subscriptions/access'
import { readSchoolSeats } from '@/lib/server/subscriptions/seats'
import {
  cancelSubscriptionTransfer,
  changeSubscriptionRenewal,
  createSubscriptionTransfer,
  EMPTY_SUBSCRIPTION_BANK,
  redeemSubscriptionCode,
  reportSubscriptionTransfer,
  subscriptionRef,
  subscriptionSettingsRef,
} from '@/lib/server/subscriptions/store'
import { stripeConfigured } from '@/lib/server/subscriptions/stripe-client'
import {
  assertSubscriptionPayable,
  SUBSCRIPTION_PRICE_CENTS,
  SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS,
  subscriptionAccess,
  subscriptionPrice,
} from '@/lib/subscriptions/engine'
import type {
  SchoolSubscription,
  SubscriptionBankDetails,
  SubscriptionCode,
  SubscriptionOrder,
  SubscriptionSnapshot,
} from '@/lib/subscriptions/model'

export const runtime = 'nodejs'
const validId = (id: unknown): id is string =>
  typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id)
const invalid = () =>
  NextResponse.json({ error: 'Revisa los datos e inténtalo de nuevo.' }, { status: 400 })
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const schoolId = params.get('schoolId')
    if (!validId(schoolId)) return invalid()
    const access = await subscriptionSchoolAccess(request, schoolId)
    // Seat counts read every membership and roster doc: only on demand, only for managers.
    const withUsage = access.manager && params.get('usage') === '1'
    const [doc, settings, orders, seats] = await Promise.all([
      subscriptionRef(schoolId).get(),
      access.manager ? subscriptionSettingsRef().get() : null,
      access.manager
        ? adminDb
            .collection('subscriptionOrders')
            .where('schoolId', '==', schoolId)
            .orderBy('createdAt', 'desc')
            .limit(200)
            .get()
        : null,
      withUsage ? readSchoolSeats(schoolId) : null,
    ])
    const sub = (doc.data() as SchoolSubscription) || null
    let priceCents = subscriptionPrice(sub, Date.now())
    if (access.manager && !sub?.paymentExempt && sub?.promotionalCodeId) {
      const code = (
        await adminDb.collection('subscriptionCodes').doc(sub.promotionalCodeId).get()
      ).data() as SubscriptionCode | undefined
      if (code && !code.redeemedAt) priceCents = SUBSCRIPTION_PRICE_CENTS
      if (code?.active && !code.redeemedAt && (!code.expiresAt || Date.now() < code.expiresAt))
        priceCents = SUBSCRIPTION_PROMOTIONAL_PRICE_CENTS
    }
    const snapshot: SubscriptionSnapshot = {
      schoolId,
      schoolName: access.schoolName,
      manager: access.manager,
      subscription: access.manager ? sub : null,
      access: subscriptionAccess(sub, Date.now()),
      priceCents: sub?.paymentExempt ? 0 : access.manager ? priceCents : SUBSCRIPTION_PRICE_CENTS,
      bankDetails: access.manager
        ? ({ ...EMPTY_SUBSCRIPTION_BANK, ...settings?.data() } as SubscriptionBankDetails)
        : null,
      orders:
        orders?.docs
          .map((item) => ({ ...item.data(), id: item.id }) as SubscriptionOrder)
          .sort((a, b) => b.createdAt - a.createdAt) || [],
      cardAvailable: stripeConfigured(),
      ...(seats && { plan: { limits: seats.limits, usage: seats.usage } }),
    }
    return NextResponse.json(snapshot, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const response = subscriptionErrorResponse(error)
    if (response) return response
    reportServerError('SUBSCRIPTIONS_READ', error, request)
    return NextResponse.json(
      { error: 'No pudimos cargar la suscripción. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    if (!validId(body.schoolId)) return invalid()
    const access = await subscriptionSchoolAccess(request, body.schoolId, true)
    if (body.action === 'createTransfer')
      return NextResponse.json({
        order: await createSubscriptionTransfer(
          body.schoolId,
          access.ownerId,
          access.schoolName,
          access.uid
        ),
      })
    if (body.action === 'cancelTransfer' && validId(body.orderId)) {
      await cancelSubscriptionTransfer(body.schoolId, body.orderId, access.uid)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'reportTransfer' && validId(body.orderId)) {
      await reportSubscriptionTransfer(body.schoolId, body.orderId, access.uid)
      return NextResponse.json({ ok: true })
    }
    if (
      body.action === 'redeemCode' &&
      typeof body.code === 'string' &&
      /^[a-zA-Z0-9-]{4,64}$/.test(body.code.trim())
    ) {
      await redeemSubscriptionCode(body.schoolId, body.code, access.uid)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'cancel' || body.action === 'resume') {
      // Stripe renewals must also be cancelled/resumed at the provider.
      const sub = (await subscriptionRef(body.schoolId).get()).data() as
        | SchoolSubscription
        | undefined
      assertSubscriptionPayable(sub)
      if (sub?.stripeSubscriptionId)
        return NextResponse.json(
          { error: 'Gestiona la renovación de tarjeta desde su opción de pago.' },
          { status: 409 }
        )
      await changeSubscriptionRenewal(body.schoolId, body.action === 'cancel', access.uid)
      return NextResponse.json({ ok: true })
    }
    return invalid()
  } catch (error) {
    const response = subscriptionErrorResponse(error)
    if (response) return response
    reportServerError('SUBSCRIPTIONS_WRITE', error, request)
    return NextResponse.json(
      { error: 'No pudimos guardar el cambio. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
