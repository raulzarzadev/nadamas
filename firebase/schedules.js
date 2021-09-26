import firebase from 'firebase/app'
import 'firebase/firestore'

import { db } from './client'
import {
  datesToFirebaseFromat,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

export const getSchedule = async (id) => {
  return await db
    .collection('schedules')
    .doc(id)
    .get()
    .then((res) => normalizeDoc(res))
    .catch((err) => console.log(err))
}