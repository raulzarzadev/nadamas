import { initializeApp } from 'firebase/app'
import {
  browserSessionPersistence,
  connectAuthEmulator,
  GoogleAuthProvider,
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'
import { getUser } from './users'

const firebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

export const app = initializeApp(JSON.parse(firebaseConfig))
export const auth = getAuth(app)

export const db = getFirestore(app)
export const storage = getStorage(app)

// Local development: point the SDK at the Firebase emulators. Guarded by a
// module-level flag so hot-reload doesn't reconnect (which throws).
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1' && !globalThis.__nadamasEmulatorWired) {
  globalThis.__nadamasEmulatorWired = true
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}

export const authStateChanged = (cb = () => {}) => {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      cb(null)
      return
    }

    // Minimal identity from the auth session. Used as a fallback so a failed
    // or empty Firestore read never leaves the app hanging on a spinner.
    const fallbackUser = {
      id: user.uid,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }

    try {
      const userData = await getUser(user.uid)
      cb(userData || fallbackUser)
    } catch (err) {
      console.error('authStateChanged:getUser', err?.code || 'error')
      cb(fallbackUser)
    }
  })
}

// Prevents a second popup request while one is still pending, which would
// otherwise make Firebase cancel the first with auth/cancelled-popup-request.
let googleLoginInFlight = false

export const googleLogin = async () => {
  if (googleLoginInFlight) return null

  const provider = new GoogleAuthProvider()
  provider.addScope('profile')
  provider.addScope('email')

  googleLoginInFlight = true
  try {
    const result = await signInWithPopup(auth, provider)
    // This gives you a Google Access Token. You can use it to access the Google API.
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const token = credential.accessToken
    // The signed-in user info.
    const user = result.user
    // console.log(user)
    const { displayName, email, photoURL, providerId, uid } = user
    return {
      id: uid,
      displayName,
      email,
      photoURL,
      providerId,
    }

    // return await createNewUser(user)
  } catch (error) {
    // Benign popup outcomes (user closed it, or a duplicate request was
    // cancelled). Treat as a silent no-op, not a failure.
    if (
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-closed-by-user'
    ) {
      return null
    }
    throw new Error('Could not login with Google')
  } finally {
    googleLoginInFlight = false
  }
}

export const logOut = () =>
  signOut(auth)
    .then((res) => console.log(`signout`))
    .catch((err) => console.error(`err`, err))
