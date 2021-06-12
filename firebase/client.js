import { format } from '@/src/utils/Dates'
import firebase from 'firebase'
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

/* -------------------- */
/* ------attnendance------ */
/* -------------------- */

export const getAttendanceDate = async (date) => {
  const attendanceDate = new Date(format(date, 'dd-MMMM-yy'))
  return await db
    .collection('attendance')
    .where('date', '==', attendanceDate)
    .get()
    .then(({ docs }) => normalizeDoc(docs[0]))
    .catch((err) => console.log('err', err))
}
export const updateAttendanceList = async ({
  date = new Date(),
  attendance = []
}) => {
  const attendanceDate = new Date(format(date, 'dd-MMMM-yy'))

  const attendanceListDayExist = await db
    .collection('attendance')
    .where('date', '==', attendanceDate)
    .get()
  console.log('attendanceListDayExist', attendanceListDayExist)
  const attendanceRef = attendanceListDayExist?.docs[0]?.id
  if (attendanceListDayExist.empty) {
    // if exist create it
    return await _create_attendanceList({ date: attendanceDate, attendance })
  } else {
    // updated
    return await _update_attendanceList({ ref: attendanceRef, attendance })
  }
}

const _create_attendanceList = async (attendanceList) => {
  return await db
    .collection('attendance')
    .add({
      ...attendanceList,
      ...datesToFirebaseFromat(attendanceList)
    })
    .then((res) => {
      return { ok: true, type: 'ATTENDANCE_LIST_CREATED', res }
    })
    .catch((err) => console.log('err', err))
}

const _update_attendanceList = async ({ ref, attendance }) => {
  console.log('attendance', ref, attendance)

  return await db
    .collection('attendance')
    .doc(ref)
    .update({ attendance })
    .then((res) => console.log('res', res))
    .catch((err) => console.log('err', err))
}

/* -------------------- */
/* ------RECORDS------ */
/* -------------------- */

export const getRecords = async (athleteId) => {
  return await db
    .collection('records')
    .where('athleteId', '==', athleteId)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}
export const createRecord = async (record) => {
  return await _create_record(record)
}
export const removeRecord = async (recordId) => {
  return await _remove_record(recordId)
}

const _remove_record = async (recordId) => {
  return await db.collection('records').doc(recordId).delete()
}

const _create_record = async (record) => {
  return await db
    .collection('records')
    .add(record)
    .then((res) => {
      return { ok: true, type: 'RECORD_CREATED', res }
    })
    .catch((err) => console.log('err', err))
}

/* -------------------- */
/* ------FILES------ */
/* -------------------- */



export const uploadFile = ({ type = 'file', athleteId, file }) => {
  console.log('file', file)

  const storageRef = firebase.storage().ref()
  const task = storageRef.child(`${type}/${athleteId}`).put(file)
  return task.on(
    'state_changed',
    function (snapshot) {
      // Observe state change events such as progress, pause, and resume
      // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
      var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      console.log('Upload is ' + progress + '% done')
      switch (snapshot.state) {
        case firebase.storage.TaskState.PAUSED: // or 'paused'
          console.log('Upload is paused')
          break
        case firebase.storage.TaskState.RUNNING: // or 'running'
          console.log('Upload is running')
          break
      }
    },
    function (error) {
      // Handle unsuccessful uploads
    },
    function () {
      // Handle successful uploads on complete
      // For instance, get the download URL: https://firebasestorage.googleapis.com/...
      task.snapshot.ref.getDownloadURL().then(function (downloadURL) {
        console.log('File available at', downloadURL)
        _update_athlete({ id: athleteId, avatar: downloadURL })
      })
    }
  )
}
