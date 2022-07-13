/* -------------------- */
/* ---------USERS------ */
/* -------------------- */
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '.'

import { FirebaseCRUD } from './FirebaseCRUD'
import { Dates } from 'firebase-dates-util'

export const getUser = async (userId) => {
  // TODO transform to listenUser
  if (!userId) throw new Error('No userId provided')
  const docRef = doc(db, 'users', userId)
  const docSnap = await getDoc(docRef)
  // console.log(FirebaseCRUD.normalizeDoc(docSnap))

  return FirebaseCRUD.normalizeDoc(docSnap)
}

export const getTeamMember = async (userId) => {
  const docRef = doc(db, 'users', userId)
  const docSnap = await getDoc(docRef)
  const user = FirebaseCRUD.normalizeDoc(docSnap)
  // TODO set just the data that is necesary
  const member = {
    ...user
  }
  return member
}

export const loginUser = async (user) => {
  const userRef = doc(db, 'users', user.id)
  const userSnap = await getDoc(userRef)
  const normalizedUser = FirebaseCRUD.normalizeDoc(userSnap)
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
  const userFormat = Dates.deepFormatObjectDates({ ...user, createdAt: new Date() }, 'number')
  return await setDoc(doc(db, 'users', user.id), {
    ...userFormat,
  })

}

export const updateUser = async (user) => {
  const userFormat = Dates.deepFormatObjectDates(user, 'number')
  return updateDoc(doc(db, 'users', user.id), userFormat)
    .catch((err) => console.log(`err`, err))
}
