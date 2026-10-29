import 'server-only'
import type { Transaction } from 'firebase-admin/firestore'
import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { getBearerToken } from '@/lib/server/school-access'
import { SubscriptionError, subscriptionAccess } from '@/lib/subscriptions/engine'
import type { SchoolSubscription } from '@/lib/subscriptions/model'

export async function subscriptionCaller(request: Request) {
  const token = getBearerToken(request)
  if (!token) throw new SubscriptionError('unauthenticated', 'Vuelve a iniciar sesión.', 401)
  let uid: string
  try {
    uid = (await adminAuth.verifyIdToken(token, true)).uid
  } catch {
    throw new SubscriptionError('unauthenticated', 'Vuelve a iniciar sesión.', 401)
  }
  const user = (await adminDb.collection('users').doc(uid).get()).data()
  if (user?.accountDisabled) throw new SubscriptionError('forbidden', 'No autorizado.', 403)
  return { uid, admin: user?.roles?.admin === true }
}
export async function subscriptionSchoolAccess(request: Request, schoolId: string, manage = false) {
  const caller = await subscriptionCaller(request)
  const [school, membership] = await Promise.all([
    adminDb.collection('schools').doc(schoolId).get(),
    adminDb.collection('schoolMemberships').doc(`${schoolId}_${caller.uid}`).get(),
  ])
  if (!school.exists) throw new SubscriptionError('not_found', 'No encontramos la escuela.', 404)
  const data = school.data() || {}
  const ownerId = String(data.createdBy || data.directorId || '')
  const manager = caller.admin || ownerId === caller.uid
  if (!manager && (manage || membership.data()?.status !== 'active'))
    throw new SubscriptionError('forbidden', 'No autorizado.', 403)
  return { ...caller, manager, ownerId, schoolName: String(data.name || ''), schoolId }
}
export async function requireSubscriptionAdmin(request: Request) {
  const caller = await subscriptionCaller(request)
  if (!caller.admin) throw new SubscriptionError('forbidden', 'No autorizado.', 403)
  return caller
}
export async function assertSchoolSubscriptionAccess(schoolId: string, transaction?: Transaction) {
  const ref = adminDb.collection('schoolSubscriptions').doc(schoolId)
  const snapshot = transaction ? await transaction.get(ref) : await ref.get()
  if (!subscriptionAccess((snapshot.data() as SchoolSubscription) || null, Date.now()).fullAccess)
    throw new SubscriptionError('subscription_required')
}
export function subscriptionErrorResponse(error: unknown) {
  return error instanceof SubscriptionError
    ? NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    : null
}
