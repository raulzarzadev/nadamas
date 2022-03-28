/* -------------------- */
/* ---------USERS------ */
/* -------------------- */
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '.'
import {
  deepFormatDocumentDates,
  formatResponse,
  normalizeDoc
} from './firebase-helpers'

export const getUser = async (userId) => {
  // TODO transform to listenUser
  const docRef = doc(db, 'users', userId)
  const docSnap = await getDoc(docRef)
  return normalizeDoc(docSnap)
}

export const createNewUser = async (user) => {
  const ref = doc(db, 'users', user.id)
  const newUser = {...user, id:user.id, createdAt: new Date(), updatedAt: new Date()}
  setDoc(ref, {...deepFormatDocumentDates(newUser)})
   
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
 
}
