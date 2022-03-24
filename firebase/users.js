/* -------------------- */
/* ---------USERS------ */
/* -------------------- */
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '.'
import {
  deepFormatDocumentDates,
  formatResponse,
  normalizeDoc
} from './firebase-helpers'

export const getUser = async (userId) => {
  const docRef = doc(db, 'users', userId)
  const docSnap = await getDoc(docRef)
  return normalizeDoc(docSnap)
}

export const createNewUser = async (user) => {
  const res = await db
    .collection('users')
    .doc(user.id)
    .set({ ...user })
    .then(async (res) => {
      // await createDefaultAthlete({ ...user })
      return formatResponse(true, 'USER_CREATED', res)
    })
    .catch((err) => formatResponse(false, 'USER_CREATED_ERROR', err))
  return user
}

export const updateUser = async (user) => {
  const userFormat = deepFormatDocumentDates(user, { format: 'firebase' })
  updateDoc(doc(db, 'users', user.id), userFormat)
    .then((res) => console.log(`res`, res))
    .catch((err) => console.log(`err`, err))
  /*  try {
    const res = await eventRef.update({
      ...user,
      ...datesInFirebaseFormat
    })
    return formatResponse(true, 'USER_UPDATED', res)
  } catch (err) {
    return formatResponse(false, 'UPDATE_ERROR', err)
  } */
}
