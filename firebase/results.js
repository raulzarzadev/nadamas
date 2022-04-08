import { TEST_AWARDS } from '@/CONSTANTS/AWARDS'
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore'
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
  // TODO delete result
  console.log('deleteResult', resultId)
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
