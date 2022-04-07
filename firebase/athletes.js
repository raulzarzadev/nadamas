import { async } from '@firebase/util'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '.'
import { normalizeDoc } from './firebase-helpers'

export const getOldAthlete = async (userId) => {
  if (!userId) throw new Error('userId is required')
  const res = []
  const q = query(collection(db, 'athletes'), where('userId', '==', userId))

  const querySnapshot = await getDocs(q)

  querySnapshot.forEach((doc) => {
    res.push({ ...normalizeDoc(doc) })
  })
  return res.length > 0 ? res[0] : null
}

export const getAthleteRecords = async (athleteId) => {
  const res = []
  const q = query(
    collection(db, 'records'),
    where('athlete.id', '==', athleteId)
  )

  const querySnapshot = await getDocs(q)

  querySnapshot.forEach((doc) => {
    res.push({ ...normalizeDoc(doc) })
  })
  return res
}
