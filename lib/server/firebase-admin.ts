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

// When running against the emulators there is no service account; the Admin SDK
// just needs a projectId and reads FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST.
const emulatorProjectId =
  process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'nadamas-b1ecf'

const app =
  getApps()[0] ||
  initializeApp(
    process.env.FIREBASE_SERVICE_ACCOUNT
      ? { credential: cert(getServiceAccount()) }
      : { projectId: emulatorProjectId }
  )

export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)

// Drop `undefined` fields on every write instead of throwing. Firestore rejects
// undefined values by default, which turns optional fields (e.g. a booking with
// no phone) into 500s. settings() must run before the first use and only once,
// so guard against hot-reload re-evaluation.
try {
  adminDb.settings({ ignoreUndefinedProperties: true })
} catch {
  // Already configured on a previous import; safe to ignore.
}
