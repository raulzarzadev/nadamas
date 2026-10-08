// Dry-run by default. Explicit --apply assigns IDs without modifying profile data.
// Uses the same transaction implementation as the credential API.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import ts from 'typescript'

const apply = process.argv.includes('--apply')
const raw = process.env.FIREBASE_SERVICE_ACCOUNT
if (!raw && !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Configure FIREBASE_SERVICE_ACCOUNT or FIRESTORE_EMULATOR_HOST first.')
}
const app =
  getApps()[0] ||
  initializeApp(
    raw
      ? { credential: cert(JSON.parse(raw)) }
      : { projectId: process.env.GCLOUD_PROJECT || 'nadamas-b1ecf' }
  )
const adminDb = getFirestore(app)
const modulePath = fileURLToPath(new URL('../lib/server/athlete-identities.ts', import.meta.url))
const source = ts.transpileModule(readFileSync(modulePath, 'utf8'), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
  },
}).outputText
const localRequire = createRequire(import.meta.url)
const module = { exports: {} }
new Function('require', 'module', 'exports', source)(
  (id) => (id === 'server-only' ? {} : id === './firebase-admin' ? { adminDb } : localRequire(id)),
  module,
  module.exports
)
const registry = adminDb.collection('athleteIdentityRegistry').doc('v1').collection('profiles')
let missing = 0
let existing = 0
for (const [profileType, collection] of [
  ['user', 'users'],
  ['additional', 'additionalProfiles'],
]) {
  // Paginate so large installations do not load their whole directory into memory.
  let cursor
  for (;;) {
    let query = adminDb.collection(collection).orderBy('__name__').limit(200)
    if (cursor) query = query.startAfter(cursor)
    const page = await query.get()
    if (page.empty) break
    for (const doc of page.docs) {
      if ((await registry.doc(`${profileType}_${doc.id}`).get()).exists) {
        existing++
        continue
      }
      missing++
      if (apply) await module.exports.ensureAthleteIdentity(profileType, doc.id)
    }
    cursor = page.docs.at(-1)
  }
}
console.log(
  JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    existing,
    [apply ? 'assigned' : 'missing']: missing,
  })
)
