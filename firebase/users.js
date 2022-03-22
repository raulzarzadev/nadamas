/* -------------------- */
/* ---------USERS------ */
/* -------------------- */

import { db } from "."
import { formatResponse } from "./firebase-helpers"

export const getUser = async (userId) => {
  return await db
    .collection('users')
    .doc(userId)
    .get()
    .then(normalizeDoc)
    

  // return res.data()
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
  const eventRef = db.collection('users').doc(user?.id)
  const datesInFirebaseFormat = datesToFirebaseFromat(user)
  try {
    const res = await eventRef.update({
      ...user,
      ...datesInFirebaseFormat
    })
    return formatResponse(true, 'USER_UPDATED', res)
  } catch (err) {
    return formatResponse(false, 'UPDATE_ERROR', err)
  }
}
