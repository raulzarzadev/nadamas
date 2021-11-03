import 'firebase/firestore'

import { db } from './client'
import {
  datesToFirebaseFromat,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

export const getSchedules = async (owner) => {
  console.log(`owner`, owner)
  return await db
    .collection('schedules')
    .where('owner.id', '==', owner)
    .get()
    .then(({ docs }) =>
      formatResponse(true, 'GET_SCHEDDULES_SUCCESS', normalizeDocs(docs))
    )
    .catch((err) => formatResponse(true, 'GET_SCHEDDULES_FAIL', err))
}

export const updateSchedule = async ({ id, owner, schedule }) => {
  return db
    .collection('schedules')
    .where('owner.id', '==', owner.id)
    .get()
    .then(({ docs }) => {
      console.log(`docs`, docs)
      const scheduleExists = !!docs[0]?.exists
      if (scheduleExists) {
        const scheduleRef = db.collection('schedules').doc(docs[0].id)
        return scheduleRef
          .update({ schedule })
          .then((res) => formatResponse(true, 'SCHEDULE_UPDATED', res))
          .catch((err) => formatResponse(false, 'ERROR_UPDATING_SCHEDULE', res))
      } else {
        return db
          .collection('schedules')
          .add({ schedule, owner })
          .then((res) =>
            formatResponse(true, 'SCHEDULE_CREATED', { id: res.id })
          )
          .catch((err) => formatResponse(false, 'ERROR_CREATING_SCHEDULE', err))
      }
    })
}
