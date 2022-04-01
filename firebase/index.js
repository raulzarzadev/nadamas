import { initializeApp } from 'firebase/app'
import {
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { mapUserFromFirebase } from './firebase-helpers'
import { createNewUser } from './users'

const firebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

export const app = initializeApp(JSON.parse(firebaseConfig))
export const auth = getAuth()

export const db = getFirestore(app)

export const authStateChanged = (cb) => {
  return onAuthStateChanged(auth, (user) => cb(mapUserFromFirebase(user)))
}
export const googleLogin = async () => {
  const provider = new GoogleAuthProvider()
  provider.addScope('profile')
  provider.addScope('email')
  provider.addScope('image')
  try {
    const result = await signInWithPopup(auth, provider)
    // This gives you a Google Access Token. You can use it to access the Google API.
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const token = credential.accessToken
    // The signed-in user info.
    const user = result.user
    await createNewUser(user)
    console.log(user)
  } catch (error) {
    console.log(error)
    // Handle Errors here.
    const errorCode = error.code
    const errorMessage = error.message
    // The email of the user's account used.
    const email = error.email
    // The AuthCredential type that was used.
    const credential_1 = GoogleAuthProvider.credentialFromError(error)
  }
}

export const logOut = () =>
  signOut(auth)
    .then((res) => console.log(`res`, res))
    .catch((err) => console.log(`err`, err))
