import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return undefined

  const jsonStart = raw.indexOf('{')
  const normalizedRaw = jsonStart > 0 ? raw.slice(jsonStart) : raw
  const parsed = JSON.parse(normalizedRaw)
  return {
    ...parsed,
    private_key: parsed.private_key?.replace(/\\n/g, '\n'),
  }
}

const app =
  getApps()[0] ||
  initializeApp(
    process.env.FIREBASE_SERVICE_ACCOUNT
      ? { credential: cert(getServiceAccount()) }
      : undefined
  )

export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)
