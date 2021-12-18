import { TEST_AWARDS } from '@/src/constants/AWARDS'
import 'firebase/firestore'
import { db } from './client'
import {
  datesToFirebaseFromat,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

export const getEventResults = async (eventId) => {
  return await db
    .collection('results')
    .where('event.id', '==', eventId)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log(`err`, err))
}
export const addEventResult = async ({
  eventData,
  athleteData,
  test,
  ...rest
}) => {
  return await db
    .collection('results')
    .add({
      event: { ...eventData },
      athlete: {
        ...athleteData
      },
      test,
      ...datesToFirebaseFromat(rest)
    })
    .then((res) => formatResponse(true, ' RESULT_CREATED', res))
    .catch((err) => formatResponse(false, 'ERROR_CREATING_RESULT', err))
}
export const removeEventResult = async (id) => {
  return await db
    .collection('results')
    .doc(id)
    .delete()
    .then((res) => formatResponse(true, ' RESULT_DELETED', res))
    .catch((err) => formatResponse(false, 'ERROR_DELETE_RESULT', err))
}

export const deleteResult = async (id) => {
  return await db
    .collection('results')
    .doc(id)
    .delete()
    .then((res) => formatResponse(true, ' RESULT_DELETED', res))
    .catch((err) => formatResponse(false, 'ERROR_DELETE_RESULT', err))
}



export const deleteUserResult = async (id) => {
  return await db
    .collection('results')
    .doc(id)
    .update({ deleted: true })
    .then((res) => formatResponse(true, ' RESULT_DELETED', res))
    .catch((err) => formatResponse(true, ' RESULT_DELETE_ERROR', res))
}


export const updateResult = async (id, result) => {
  return await db
    .collection('results')
    .doc(id)
    .update(result)
    .then((res) => formatResponse(true, ' RESULT_UPDATED', res))
    .catch((err) => formatResponse(false, 'ERROR_UPDATE_RESULT', err))
}

export const updateAwardsEventResult = async (resultId, awards) => {
  return await db
    .collection('results')
    .doc(resultId)
    .update({ 'test.awards': awards })
    .then((res) => formatResponse(true, ' AWARD_ADDED', res))
    .catch((err) => formatResponse(false, 'ERROR_AWARD', err))
}

export const getAthleteAwards = async (athleteId) => {
  const availableTestAwards = Object.keys(TEST_AWARDS)
  const resultsAwards = await db
    .collection('results')
    .where('athlete.id', '==', athleteId)
    .where('test.awards', 'array-contains-any', availableTestAwards)
    // .orderBy('date')
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log(err))
  return { resultsAwards }
}
export const getAthleteResults = async (athleteId, callback = () => {}) => {
  db.collection('results')
    .where('athlete.id', '==', athleteId)
    .onSnapshot((snapshot) => {
      let res = []

      snapshot.forEach((doc) => {
        res.push(normalizeDoc(doc))
      })
      // Filtramos los que tienen un campo delete por que así es como eliminamos las pruebas sin generar conflictos en los eventos
      callback(res.filter(({ deleted }) => deleted !== true))
    })
 
}