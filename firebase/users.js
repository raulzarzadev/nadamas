/* -------------------- */
/* ---------USERS------ */
/* -------------------- */
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '.'
import {
  deepFormatDocumentDates,
  formatResponse,
  normalizeDoc
} from './firebase-helpers'

export const getUser = async (userId) => {
  // TODO transform to listenUser
  if (!userId) throw new Error('No userId provided')
  const docRef = doc(db, 'users', userId)
  const docSnap = await getDoc(docRef)
  return normalizeDoc(docSnap)
}

export const getTeamMember = async (userId) => {
  const docRef = doc(db, 'users', userId)
  const docSnap = await getDoc(docRef)
  const user = normalizeDoc(docSnap)
  // TODO set just the data that is necesary
  const member = {
    ...user
  }
  return member
}

export const loginUser = async (user) => {
  const userRef = doc(db, 'users', user.id)
  const userSnap = await getDoc(userRef)
  const normalizedUser = normalizeDoc(userSnap)
  if (!normalizedUser) {
    console.log('Creating user')
    return createNewUser(user)
  } else {
    console.log('Getting user')
    const u = getUser(user.id)
    return u
  }
  // cconsole.log(normalizedUser)
}

export const createNewUser = async (user) => {
  return await setDoc(doc(db, 'users', user.id), {
    ...user,
    createdAt: new Date()
  })
  /*  .then(async (res) => {
       // await createDefaultAthlete({ ...user })
       return formatResponse(true, 'USER_CREATED', res)
     })
     .catch((err) => formatResponse(false, 'USER_CREATED_ERROR', err)) */
  /*  const ref = doc(db, 'users', user.id)
  console.log(ref, user)
  const newUser = {
    ...user,
    id: user.id,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  return await setDoc(ref, { ...deepFormatDocumentDates(newUser) })
    .then(async (res) => {
      // await createDefaultAthlete({ ...user })
       formatResponse(true, 'USER_CREATED', res)
    })
     .catch((err) => formatResponse(false, 'USER_CREATED_ERROR', err))
  */
}

export const updateUser = async (user) => {
  const userFormat = deepFormatDocumentDates(user, { format: 'firebase' })
  updateDoc(doc(db, 'users', user.id), userFormat)
    .then((res) => console.log(`res`, res))
    .catch((err) => console.log(`err`, err))
}
