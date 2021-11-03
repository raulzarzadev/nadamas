import 'firebase/firestore'

import { db } from './client'
import {
  datesToFirebaseFromat,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

export const getSchedules = async (owner) => {
  return await db
    .collection('schedules')
    .where('owner.id', '==', owner)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log(err))
}

export const updateSchedule = async ({ id, owner, schedule }) => {
  const scheduleRef = db.collection('schedules').doc(id)
  const scheduleExists = await scheduleRef.get().exists
  if(scheduleExists){
    return await scheduleRef
      .update({ schedule })
      .then((res) => formatResponse(true, 'UPDATE_SCHEDULE', res))
      .catch((err) => formatResponse(false, 'ERROR_UPDATING_SCHEDULE', res))
  }else {
    return await db
      .collection('schedules')
      .add({ schedule, owner })
      .then((res) => formatResponse(true, 'CREATE_SCHEDULE', res))
      .catch((err) => formatResponse(false, 'ERROR_CREATING_SCHEDULE', err))
  }
  
}
