import firebase from 'firebase'
import {
  datesToFirebaseFromat,
  mapUserFromFirebase,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'
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
      console.log('userA', userAlreadyExist)
      if (userAlreadyExist) return userAlreadyExist
      return createNewUser(mapUserFromFirebase(user))
    })
  return res
  // googleProvider.addScope('https://www.googleapis.com/auth/contacts.readonly');
}

export const firebaseLogout = () => {
  firebase.auth().signOut()
}

const db = firebase.firestore()

/* -------------------- */
/* ---------USERS------ */
/* -------------------- */

const getUser = async (userId) => {
  const res = await db.collection('users').doc(userId).get()
  console.log('USER_FINDED')
  return res.data()
}

const createNewUser = async (user) => {
  const res = await db
    .collection('users')
    .doc(user.id)
    .set({ ...user })
  console.log('USER_CREATED', user)
  return user
}

/* -------------------- */
/* ------athleteS------ */
/* -------------------- */
export const getAthlete = async (athleteId) => {
  return db
    .collection('athletes')
    .doc(athleteId)
    .get()
    .then((doc) => normalizeDoc(doc))
}

export const getAthletes = async (userId) => {
  return await db
    .collection('athletes')
    //.where('userId', '==', userId)
    .where('active', '==', true)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log(err))
}

export const updateAtlete = async (athlete = {}) => {
  // Look for the athlete
  const athleteExist = await (
    await db.collection('athletes').doc(athlete?.id).get()
  ).exists
  console.log('athleteExist', athleteExist)
  if (!athleteExist) {
    // if exist create it
    return await _create_athlete(athlete)
  } else {
    return await _update_athlete(athlete)
  }
}

const _update_athlete = async (athlete) => {
  const eventRef = db.collection('athletes').doc(athlete.id)
  const datesInFirebaseFormat = datesToFirebaseFromat(athlete)
  try {
    await eventRef.update({
      ...athlete,
      ...datesInFirebaseFormat
    })
    return { ok: true, type: 'ATHLETE_UPDATED' }
  } catch (err) {
    return console.log(err)
  }
}
const _create_athlete = async (athlete) => {
  return await db
    .collection('athletes')
    .add({
      ...athlete,
      ...datesToFirebaseFromat(athlete)
    })
    .then((res) => {
      return { ok: true, type: 'ATHLETE_CREATED', id: res.id }
    })
    .catch((err) => console.log('err', err))
}
