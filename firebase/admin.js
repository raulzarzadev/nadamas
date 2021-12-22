import { db } from '.'
import { formatResponse, normalizeDocs } from './firebase-helpers'

export const _getUsers = async ({ active = true }) => {
  return await db
    .collection('users')
    .where('active', '==', active)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => {
      formatResponse(false, 'ERROR_USER', err)
    })
}

export const _getAthletes = async () => {
  const actives = await db
    .collection('athletes')
    .where('active', '==', true)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => {
      formatResponse(false, 'ERROR_USER', err)
    })
  const notActives = await db
    .collection('athletes')
    .where('active', '==', false)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => {
      formatResponse(false, 'ERROR_USER', err)
    })

  return [...notActives, ...actives]
}

export const _deleteAthlete = async (athleteId) => {
  return await db.collection('athletes')
    .doc(athleteId)
    .delete()
    .then((res) => console.log(`res`, res))
    .catch((err) => console.log(`err`, err))
}

export const _deleteUser = async (userId) => {
  return await db.collection('users')
    .doc(userId)
    .delete()
    .then((res) => console.log(`res`, res))
    .catch((err) => console.log(`err`, err))
}