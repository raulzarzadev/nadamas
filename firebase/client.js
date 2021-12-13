import firebase from 'firebase/app'
import 'firebase/storage'
import 'firebase/firestore'
import 'firebase/auth'

import {
  datesToFirebaseFromat,
  formatResponse,
  mapUserFromFirebase,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'
import { createDefaultAthlete } from './athletes'
const firebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

if (!firebase?.apps?.length) {
  firebase.initializeApp(JSON.parse(firebaseConfig))
}

export const onAuthStateChanged = (onChange) => {
  return firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      getUser(user?.uid).then(onChange)
    } else {
      onChange(null)
    }
  })
}

export const loginWithGoogle = async () => {
  const googleProvider = new firebase.auth.GoogleAuthProvider()
  const res = await firebase
    .auth()
    .signInWithPopup(googleProvider)
    .then(async ({ credential: { accessToken }, user }) => {
      // check if user exist in db
      const userAlreadyExist = await getUser(user?.uid)
      if (userAlreadyExist) return userAlreadyExist
      return createNewUser(mapUserFromFirebase(user))
    })
    .catch((err) => console.log(`err`, err))
  return res
  // googleProvider.addScope('https://www.googleapis.com/auth/contacts.readonly');
}

export const firebaseLogout = () => {
  firebase.auth().signOut()
}

export const db = firebase.firestore()

/* -------------------- */
/* ---------USERS------ */
/* -------------------- */

const getUser = async (userId) => {
  return await db
    .collection('users')
    .doc(userId)
    .get()
    .then(normalizeDoc)
    .catch((err) => {
      formatResponse(false, 'ERROR_USER', err)
    })

  // return res.data()
}

const createNewUser = async (user) => {
  const res = await db
    .collection('users')
    .doc(user.id)
    .set({ ...user })
    .then(async (res) => {
      await createDefaultAthlete({ ...user })
      return formatResponse(true, 'USER_CREATED', res)
    })
    .catch((err) => formatResponse(false, 'USER_CREATED_ERROR', err))
  return user
}

export const updateUser = async (user) => {
  const eventRef = db.collection('users').doc(user.id)
  const datesInFirebaseFormat = datesToFirebaseFromat(user)
  try {
    const res = await eventRef.update({
      ...user,
      ...datesInFirebaseFormat
    })
    return formatResponse(true, 'USER_UPDATED', res)
  } catch (err) {
    return formatResponse(false, 'UPDATE_ERROR', err)
  }
}
