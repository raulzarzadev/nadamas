import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import {
  type MarketingRecipient,
  normalizeMarketingEmail,
  normalizeMarketingStatus,
  validMarketingEmail,
} from '@/lib/marketing'
import { adminAuth, adminDb } from '@/lib/server/firebase-admin'
import { getBearerToken } from '@/lib/server/school-access'

export async function marketingCaller(request: Request, admin = false) {
  const token = getBearerToken(request)
  if (!token) return null
  try {
    const caller = await adminAuth.verifyIdToken(token, true)
    const user = (await adminDb.collection('users').doc(caller.uid).get()).data()
    if (!user || user.accountDisabled === true || (admin && user.roles?.admin !== true)) return null
    return caller
  } catch {
    return null
  }
}
export function emailKey(email: string) {
  return createHash('sha256').update(normalizeMarketingEmail(email)).digest('hex')
}
export function marketingConfig() {
  const email = process.env.MARKETING_SENDER_EMAIL || ''
  const key = process.env.BREVO_MARKETING_API_KEY
  const secret = process.env.MARKETING_UNSUBSCRIBE_SECRET
  return {
    email,
    key,
    secret,
    ready: Boolean(
      key &&
        secret &&
        secret.length >= 32 &&
        validMarketingEmail(email) &&
        email.split('@')[1] === 'marketing.nadamas.app' &&
        process.env.MARKETING_DOMAIN_VERIFIED === 'true'
    ),
  }
}
export function unsubscribeToken(email: string) {
  const secret = marketingConfig().secret
  if (!secret) throw new Error('marketing_secret_missing')
  const payload = Buffer.from(normalizeMarketingEmail(email)).toString('base64url')
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`
}
export function readUnsubscribeToken(token: string) {
  if (token.length > 600) return null
  const [payload, signature, extra] = token.split('.')
  const secret = marketingConfig().secret
  if (!secret || !payload || !signature || extra) return null
  const expected = createHmac('sha256', secret).update(payload).digest()
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
  const email = Buffer.from(payload, 'base64url').toString()
  return validMarketingEmail(email) ? normalizeMarketingEmail(email) : null
}
export async function suppressEmail(email: string, source: string) {
  await adminDb
    .collection('marketingSuppressions')
    .doc(emailKey(email))
    .set({ unsubscribed: true, source, updatedAt: Date.now() }, { merge: true })
}
export async function recipient(id: string): Promise<MarketingRecipient> {
  const [profile, preference] = await Promise.all([
    adminDb.collection('users').doc(id).get(),
    adminDb.collection('marketingPreferences').doc(id).get(),
  ])
  const user = profile.data()
  const email = normalizeMarketingEmail(user?.email)
  const pref = preference.data()
  const blocked = email
    ? (await adminDb.collection('marketingSuppressions').doc(emailKey(email)).get()).data()
        ?.unsubscribed === true
    : false
  const status = blocked
    ? 'unsubscribed'
    : normalizeMarketingStatus(pref?.email === email ? pref?.status : undefined)
  return {
    id,
    name: user?.displayName || user?.name || 'Usuario sin nombre',
    email,
    status,
    eligible:
      profile.exists &&
      validMarketingEmail(email) &&
      user?.accountDisabled !== true &&
      status === 'subscribed',
  }
}
export async function listRecipients() {
  const [users, preferences, suppressions] = await Promise.all([
    adminDb.collection('users').get(),
    adminDb.collection('marketingPreferences').get(),
    adminDb.collection('marketingSuppressions').get(),
  ])
  const prefs = new Map(preferences.docs.map((doc) => [doc.id, doc.data()]))
  const blocked = new Set(
    suppressions.docs.filter((doc) => doc.data().unsubscribed === true).map((doc) => doc.id)
  )
  return users.docs.map((doc) => {
    const user = doc.data()
    const email = normalizeMarketingEmail(user.email)
    const pref = prefs.get(doc.id)
    const status = blocked.has(emailKey(email))
      ? 'unsubscribed'
      : normalizeMarketingStatus(pref?.email === email ? pref?.status : undefined)
    return {
      id: doc.id,
      name: user.displayName || user.name || 'Usuario sin nombre',
      email,
      status,
      eligible:
        validMarketingEmail(email) && user.accountDisabled !== true && status === 'subscribed',
    } satisfies MarketingRecipient
  })
}
