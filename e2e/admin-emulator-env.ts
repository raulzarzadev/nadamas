// Side-effect import: must load before `lib/server/firebase-admin` so the Admin SDK
// specs talk to the local emulators instead of a real project.
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'
process.env.GCLOUD_PROJECT ||= 'nadamas-b1ecf'
