import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/analytics/server'
import type { PaymentOrder, PaymentProduct, PaymentScope } from '@/lib/payments/model'
import { publicNameFromUser } from '@/lib/public-name'
import { adminDb } from '@/lib/server/firebase-admin'
import { getSchoolCaller, requireSchoolAccess } from '@/lib/server/school-access'

export const runtime = 'nodejs'

const LIMIT = 5

// Display name of a plan's owner, or null when it no longer exists.
async function scopeName(kind: 'coach' | 'school', id: string) {
  const data = (
    await adminDb
      .collection(kind === 'school' ? 'schools' : 'users')
      .doc(id)
      .get()
  ).data()
  if (!data) return null
  if (kind === 'school') return String(data.name || 'Escuela')
  return data.roles?.coach || data.isCoach ? publicNameFromUser(data, 'Entrenador') : null
}

// Firestore `in` accepts at most 30 values.
function chunks<T>(items: T[], size = 30) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size)
  )
}

// Most-bought active plans of the athlete's current coaches and schools, for the
// "Buscar" view in Pagos. Inside a school (schoolId) only that school's plans.
export async function GET(request: Request) {
  try {
    const caller = await getSchoolCaller(request)
    if (!caller)
      return NextResponse.json({ error: 'Tu sesión no está disponible.' }, { status: 401 })
    const schoolId = new URL(request.url).searchParams.get('schoolId') || ''
    if (/[/]/.test(schoolId) || schoolId.length > 128)
      return NextResponse.json({ error: 'Revisa los datos e inténtalo de nuevo.' }, { status: 400 })
    if (schoolId) {
      const access = await requireSchoolAccess(request, schoolId, [
        'director',
        'teacher',
        'student',
      ])
      if (access.response) return NextResponse.json({ plans: [] })
    }
    let scopes = [`school:${schoolId}`]
    if (!schoolId) {
      const [memberships, bookings] = await Promise.all([
        adminDb.collection('schoolMemberships').where('userId', '==', caller.uid).get(),
        adminDb.collection('bookings').where('athleteId', '==', caller.uid).get(),
      ])
      scopes = [
        ...new Set([
          ...memberships.docs
            .map((doc) => doc.data())
            .filter((membership) => membership.status === 'active' && membership.schoolId)
            .map((membership) => `school:${membership.schoolId}`),
          ...bookings.docs
            .map((doc) => doc.data())
            .filter((booking) => !booking.schoolId && booking.coachId)
            .map((booking) => `coach:${booking.coachId}`),
        ]),
      ]
    }
    const [orderSnapshots, productSnapshots] = await Promise.all([
      Promise.all(
        chunks(scopes).map((group) =>
          adminDb.collection('paymentOrders').where('scope', 'in', group).get()
        )
      ),
      Promise.all(
        chunks(scopes).map((group) =>
          adminDb.collection('paymentProducts').where('scope', 'in', group).get()
        )
      ),
    ])
    const orders = orderSnapshots.flatMap((snapshot) => snapshot.docs)
    const products = productSnapshots.flatMap((snapshot) => snapshot.docs)
    const sales = new Map<string, number>()
    for (const doc of orders) {
      const order = doc.data() as PaymentOrder
      if (order.status !== 'approved') continue
      const key = `${order.scope}|${order.product?.id}`
      sales.set(key, (sales.get(key) || 0) + 1)
    }
    const ranked = products
      .map((doc) => ({ ...(doc.data() as PaymentProduct & { scope: string }), id: doc.id }))
      .filter((product) => product.active)
      .map((product) => ({ product, sold: sales.get(`${product.scope}|${product.id}`) || 0 }))
      .sort((a, b) => b.sold - a.sold || a.product.priceCents - b.product.priceCents)
    // Resolve owner names; skip plans whose owner no longer exists.
    const names = new Map<string, string | null>()
    const plans: Array<{ scope: PaymentScope; name: string; product: PaymentProduct }> = []
    for (const { product } of ranked) {
      if (plans.length >= LIMIT) break
      const [kind, id] = product.scope.split(':') as ['coach' | 'school', string]
      if (!names.has(product.scope)) names.set(product.scope, await scopeName(kind, id))
      const name = names.get(product.scope)
      if (!name) continue
      const { scope: _scope, ...plan } = product
      plans.push({ scope: { kind, id }, name, product: plan })
    }
    return NextResponse.json({ plans }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    reportServerError('PAYMENTS_POPULAR_READ', error, request)
    return NextResponse.json(
      { error: 'No pudimos cargar los planes. Inténtalo de nuevo.' },
      { status: 500 }
    )
  }
}
