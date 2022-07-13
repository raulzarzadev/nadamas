/* -------------------- */
/* ---------USERS------ */
/* -------------------- */
import { Dates } from 'firebase-dates-util'
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '.'
import {
  normalizeDoc
} from './firebase-helpers'
import { FirebaseCRUD } from './FirebaseCRUD'

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

}

export const updateUser = async (user) => {
  const userFormat = Dates.deepFormatObjectDates(user,'number')
  return updateDoc(doc(db, 'users', user.id), userFormat)
    .catch((err) => console.log(`err`, err))
}
