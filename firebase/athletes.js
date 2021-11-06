import 'firebase/firestore'

import { db, updateUser } from './client'
import {
  datesToFirebaseFromat,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

export const getAthlete = async (athleteId) => {
  return await db
    .collection('athletes')
    .where('id', '==', athleteId)
    .where('active', '==', true)
    .get()
    .then(({ docs }) => normalizeDocs(docs)?.[0])
    .catch((err) => console.log(`err`, err))
}

export const getAthleteId = async (athleteId) => {
  return await db
    .collection('athletes')
    .doc(athleteId)
    .get()
    .then(normalizeDoc)
    .catch((err) => console.log(`err`, err))
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

export const createDefaultAthlete = async ({ id, image, email, name }) => {
  const newAthlete = await _create_athlete({
    userId: id,
    avatar: image,
    email,
    name
  })
  const userUpdated = await updateUser({
    id,
    athleteId: newAthlete?.res?.id
  })

  return formatResponse(ok, 'DEFAULT_ATHLETE_CREATED', {
    athlete: newAthlete,
    user: userUpdated
  })

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

export const removeAthlete = async (athleteId = '') => {
  // Look for the athlete
  console.log(`athleteId`, athleteId)
  const athleteRef = db.collection('athletes').doc(athleteId)
  try {
    const updateAthlete = await athleteRef
      .update({ active: false })
      .catch((err) => console.log(`err`, err))

    const updateUsers = await db
      .collection('users')
      .where('athleteId', '==', athleteId)
      .get()
      .then((res) => {
        return res.docs.map(async (doc) => {
          const userRef = db.collection('users').doc(doc.id)
          console.log(`doc`, userRef)
          try {
            const res = await userRef.update({ athleteId: null })
            return console.log(`res`, res)
          } catch (err) {
            return console.log(`err`, err)
          }
        })
      })
      .catch((err) => console.log(`err`, err))

    console.log(`updateAthlete, updateUsers`, updateAthlete, updateUsers)
  } catch (error) {
    console.log(`error`, error)
  }
}

const _update_athlete = async (athlete) => {
  const eventRef = db.collection('athletes').doc(athlete.id)
  const datesInFirebaseFormat = datesToFirebaseFromat(athlete)
  return await eventRef
    .update({
      ...athlete,
      ...datesInFirebaseFormat
    })
    .then((res) => formatResponse(true, 'ATHLETE_UPDATED', res))
    .catch((err) => formatResponse(false, 'ERROR_UPDATE_ATHLETE', err))
}
const _create_athlete = async (athlete) => {
  return await db
    .collection('athletes')
    .add({
      ...athlete,
      ...datesToFirebaseFromat(athlete)
    })
    .then((res) => formatResponse(true, 'ATHLETE_CREATED', res))
    .catch((err) => formatResponse(false, 'ERROR_CREATE_ATHLETE', err))
}
