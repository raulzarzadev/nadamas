// Dev-only: grant admin (and coach) role to a user by email in the EMULATOR.
// Usage: pnpm exec node scripts/grant-admin.mjs <email>  (with emulator host vars set)
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('✗ Emulator host vars not set.')
  process.exit(1)
}

const email = process.argv[2] || 'atleta.test@nadamas.test'
const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'nadamas-b1ecf' })
const auth = getAuth(app)
const db = getFirestore(app)

const user = await auth.getUserByEmail(email)
await db
  .collection('users')
  .doc(user.uid)
  .set({ roles: { athlete: true, coach: true, admin: true } }, { merge: true })
console.log(`✓ granted admin+coach to ${email} (uid ${user.uid})`)
