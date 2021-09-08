import firebase from 'firebase/app'
import 'firebase/firestore'

import { db } from './client'
import { datesToFirebaseFromat, normalizeDoc, normalizeDocs } from './firebase-helpers'



export const getAthlete = async (athleteId) => {
  return db
    .collection('athletes')
    .doc(athleteId)
    .get()
    .then((doc) => normalizeDoc(doc))
    .catch((err) => null)
}


export const getAthletes = async (userId) => {
  return await db
    .collection('athletes')
    .where('userId', '==', userId)
    .where('active', '==', true)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log(err))
}

export const updateAtlete = async (athlete = {}) => {
  // Look for the athlete
  const athleteExist = (await db.collection('athletes').doc(athlete?.id).get())
    .exists
  if (!athleteExist) {
    // if exist create it
    return await _create_athlete(athlete)
  } else {
    return await _update_athlete({ ...athlete })
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
