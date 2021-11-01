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
    .then((res) => console.log('USER_CREATED', user))
    .catch((err) => console.log('err', err))
  return user
}

export const updateUser = async (user) => {
  console.log('user', user)

  const eventRef = db.collection('users').doc(user.id)
  const datesInFirebaseFormat = datesToFirebaseFromat(user)
  try {
    await eventRef.update({
      ...user,
      ...datesInFirebaseFormat
    })
    return { ok: true, type: 'USER_UPDATED' }
  } catch (err) {
    return { ok: false, type: 'UPDATE_ERROR', err }
  }
}



/* .-°'*,.-°'*,.-°'*,.-°'*,.-°'*,.-°'*,.-°'*, */
/*           ATHLETES SCHEDULE            */
/* .-°'*,.-°'*,.-°'*,.-°'*,.-°'*,.-°'*,.-°'rz */

export const getAthleteSchedule = async (athleteId) => {
  return await db
    .collection('schedules')
    .doc(athleteId)
    .get()
    .then((res) => normalizeDoc(res))
    .catch((err) => console.log(err))
}
export const updateAthleteSchedule = async ({
  athleteId,
  schedule,
  isCoach = false,
  owner = null
}) => {
  const athlteSchedule = await db.collection('schedules').doc(athleteId).get()
  if (!athlteSchedule.exists) {
    // CREATE SCHEDULE
    return await db
      .collection('schedules')
      .doc(athleteId)
      .set({ schedule, isCoach, owner })
      .then((res) => formatResponse(true, 'CREATE_SCHEDULE', res))
      .catch((err) => formatResponse(false, 'ERROR_CREATING_SCHEDULE', err))
  } else {
    // UPDATE SCHEDULE
    const eventRef = db.collection('schedules').doc(athleteId)
    return await eventRef
      .update({ schedule, isCoach, owner })
      .then((res) => formatResponse(true, 'UPDATE_SCHEDULE', res))
      .catch((err) => formatResponse(false, 'ERROR_UPDATING_SCHEDULE', res))
  }
}
export const getAthletesBySchedule = async ({ schedule, day, userId }) => {
  return await db
    .collection('schedules')
    .where(`schedule.${day}`, 'array-contains', schedule)
    .where('isCoach', '!=', true)
    .get()
    .then(({ docs }) => docs.map((doc) => doc.id))
    .catch((err) => console.log('err', err))
}



/* -------------------- */
/* ------FILES------ */
/* -------------------- */

export const uploadFile = async ({ type = undefined, id, file }) => {
  if (type.undefined) return formatResponse(false, 'TYPE_UNDEFINED')
  const ref = firebase.storage().ref(`${type}/${id}`)
  const task = ref.put(file)
  return task
}

export const uploadImage = ({ storeRef = null, file }) => {
  if (!storeRef) return { ok: false, type: 'REF_NOT_INCLUDED' }
  const ref = firebase.storage().ref(storeRef)
  const task = ref.put(file)
  return task
}
