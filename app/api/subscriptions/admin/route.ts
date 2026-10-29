import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import { adminDb } from '@/lib/server/firebase-admin'
import {
  requireSubscriptionAdmin,
  subscriptionErrorResponse,
} from '@/lib/server/subscriptions/access'
import {
  createSubscriptionCode,
  disableSubscriptionCode,
  EMPTY_SUBSCRIPTION_BANK,
  releaseInvalidatedSubscriptionPayment,
  reviewSubscriptionTransfer,
  setSchoolCustomPlan,
  setSchoolPaymentExemption,
  subscriptionSettingsRef,
} from '@/lib/server/subscriptions/store'
import type {
  SchoolSubscription,
  SubscriptionAdminSnapshot,
  SubscriptionBankDetails,
  SubscriptionCode,
  SubscriptionOrder,
} from '@/lib/subscriptions/model'
export const runtime = 'nodejs'
const validId = (id: unknown): id is string =>
  typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id)
const invalid = () =>
  NextResponse.json({ error: 'Revisa los datos e inténtalo de nuevo.' }, { status: 400 })
export async function GET(request: Request) {
  try {
    await requireSubscriptionAdmin(request)
    const [settings, schools, subscriptions, orders, codes] = await Promise.all([
      subscriptionSettingsRef().get(),
      adminDb.collection('schools').select('name').get(),
      adminDb.collection('schoolSubscriptions').get(),
      adminDb.collection('subscriptionOrders').orderBy('createdAt', 'desc').limit(200).get(),
      adminDb.collection('subscriptionCodes').orderBy('createdAt', 'desc').limit(200).get(),
    ])
    const actorIds = [
      ...new Set(
        codes.docs.flatMap((doc) =>
          ((doc.data() as SubscriptionCode).uses || []).map((use) => use.actorId)
        )
      ),
    ]
    const actorDocs = actorIds.length
      ? await adminDb.getAll(...actorIds.map((id) => adminDb.collection('users').doc(id)))
      : []
    const actorNames = new Map(
      actorDocs.map((doc) => {
        const user = doc.data() || {}
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
        return [doc.id, fullName || user.displayName || user.name || user.email || doc.id]
      })
    )
    const result: SubscriptionAdminSnapshot = {
      settings: { ...EMPTY_SUBSCRIPTION_BANK, ...settings.data() },
      schools: schools.docs.map((doc) => ({ id: doc.id, name: String(doc.data().name || '') })),
      subscriptions: subscriptions.docs.map((doc) => doc.data() as SchoolSubscription),
      orders: orders.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as SubscriptionOrder),
      codes: codes.docs.map((doc) => {
        const code = { ...doc.data(), id: doc.id } as SubscriptionCode
        return {
          ...code,
          uses: code.uses?.map((use) => ({
            ...use,
            actorName: actorNames.get(use.actorId) || use.actorId,
          })),
        }
      }),
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const response = subscriptionErrorResponse(error)
    if (response) return response
    reportServerError('SUBSCRIPTIONS_ADMIN_READ', error, request)
    return NextResponse.json({ error: 'No pudimos cargar las suscripciones.' }, { status: 500 })
  }
}
export async function POST(request: Request) {
  try {
    const caller = await requireSubscriptionAdmin(request)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    if (body.action === 'setExemption' && validId(body.schoolId)) {
      if (
        typeof body.enabled !== 'boolean' ||
        typeof body.reason !== 'string' ||
        body.reason.trim().length < 3 ||
        body.reason.length > 300
      )
        return invalid()
      await setSchoolPaymentExemption(body.schoolId, body.enabled, body.reason.trim(), caller.uid)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'setCustomPlan' && validId(body.schoolId)) {
      const input = body.limits as { teachers?: unknown; students?: unknown } | null | undefined
      if (
        input === undefined ||
        (input !== null && (typeof input !== 'object' || Array.isArray(input))) ||
        typeof body.reason !== 'string' ||
        body.reason.trim().length < 3 ||
        body.reason.length > 300
      )
        return invalid()
      await setSchoolCustomPlan(
        body.schoolId,
        input === null
          ? null
          : { teachers: input.teachers as number, students: input.students as number },
        body.reason.trim(),
        caller.uid
      )
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'settings') {
      const input = body.settings as SubscriptionBankDetails | undefined
      if (!input) return invalid()
      const settings = { ...EMPTY_SUBSCRIPTION_BANK }
      for (const key of Object.keys(settings) as Array<keyof SubscriptionBankDetails>) {
        if (typeof input[key] !== 'string' || input[key].length > 160) return invalid()
        settings[key] = input[key].trim()
      }
      if (
        !settings.bank ||
        !settings.holder ||
        (!settings.account && !settings.clabe) ||
        (settings.clabe && !/^\d{18}$/.test(settings.clabe)) ||
        (settings.account && !/^\d{4,30}$/.test(settings.account))
      )
        return invalid()
      const now = Date.now()
      const batch = adminDb.batch()
      batch.set(subscriptionSettingsRef(), settings)
      batch.create(adminDb.collection('subscriptionAudit').doc(), {
        action: 'bank_settings_updated',
        actorId: caller.uid,
        createdAt: now,
      })
      await batch.commit()
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'createCode') {
      const code =
        body.code === undefined ? `ND-${randomBytes(5).toString('hex').toUpperCase()}` : body.code
      if (typeof code !== 'string' || !/^[a-zA-Z0-9-]{4,64}$/.test(code.trim())) return invalid()
      const expiresAt = body.expiresAt == null ? null : body.expiresAt
      if (
        expiresAt !== null &&
        (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt) || expiresAt <= Date.now())
      )
        return invalid()
      const maxUses = body.maxUses
      if (
        typeof maxUses !== 'number' ||
        !Number.isInteger(maxUses) ||
        maxUses < 1 ||
        maxUses > 1000
      )
        return invalid()
      await createSubscriptionCode(code, caller.uid, expiresAt as number | null, maxUses)
      return NextResponse.json({ ok: true, code: code.trim().toUpperCase() })
    }
    if (body.action === 'disableCode' && validId(body.codeId)) {
      await disableSubscriptionCode(body.codeId, caller.uid)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'releasePayment' && validId(body.schoolId)) {
      await releaseInvalidatedSubscriptionPayment(body.schoolId, caller.uid)
      return NextResponse.json({ ok: true })
    }
    if (
      body.action === 'review' &&
      validId(body.orderId) &&
      ['confirmed', 'invalidated'].includes(String(body.status))
    ) {
      if (
        body.receivedAt !== undefined &&
        (typeof body.receivedAt !== 'number' || !Number.isFinite(body.receivedAt))
      )
        return invalid()
      await reviewSubscriptionTransfer(
        body.orderId,
        body.status as 'confirmed' | 'invalidated',
        caller.uid,
        body.receivedAt as number | undefined
      )
      return NextResponse.json({ ok: true })
    }
    return invalid()
  } catch (error) {
    const response = subscriptionErrorResponse(error)
    if (response) return response
    reportServerError('SUBSCRIPTIONS_ADMIN_WRITE', error, request)
    return NextResponse.json(
      { error: 'No pudimos guardar el cambio. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
