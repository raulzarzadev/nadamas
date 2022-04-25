import { TEST_AWARDS } from '@/CONSTANTS/AWARDS'
import { async } from '@firebase/util'
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { db } from '.'
import {
  deepFormatDocumentDates,
  formatResponse,
  normalizeDoc
} from './firebase-helpers'
/* import { db } from '.'
import {
  datesToFirebaseFromat,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers' */

export const newAtheleteResult = async (athlete, result, { userId = null }) => {
  const newResult = {
    ...deepFormatDocumentDates({
      createdBy: userId,
      createdAt: new Date(),
      athlete,
      ...result
    })
  }
  // console.log(newResult)

  return await addDoc(collection(db, 'results'), newResult).catch((err) =>
    formatResponse(false, 'TEAM_CREATED_ERROR', err)
  )
}

export const deleteResult = async (resultId) => {
  console.log('deleteResult', resultId)
  try {
    await deleteDoc(doc(db, 'results', resultId))
    return formatResponse(true, 'RESULT_DELETED', resultId)
  } catch (error) {
    throw new Error(error)
  }

}

export const updateResutl = async (result) => {
  const docRef = doc(db, 'results', result.id)
  try {
    const res = await updateDoc(docRef, {
      ...deepFormatDocumentDates({ ...result, updatedAt: new Date() })
    })
    return formatResponse(true, 'RESULT_UPDATED', res)
  } catch (err) {
    return formatResponse(false, 'RESULT_UPDATED_ERROR', err)
  }

}

export const getAthleteResults = async (athleteId) => {
  const res = []
  const q = query(
    collection(db, 'results'),
    where('athlete.id', '==', athleteId)
  )

  const querySnapshot = await getDocs(q)

  querySnapshot.forEach((doc) => {
    res.push({ ...normalizeDoc(doc) })
  })
  return res
}

export const listenAthleteResults = async (athleteId, callback) => {
  const q = query(
    collection(db, 'results'),
    where('athlete.id', '==', athleteId)
  )

  onSnapshot(q, (querySnapshot) => {
    const res = []
    querySnapshot.forEach((doc) => {
      res.push(normalizeDoc(doc))
    })
    callback(res)
  })


}