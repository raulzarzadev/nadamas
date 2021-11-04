import { getDay } from 'date-fns'
import 'firebase/firestore'

import { db } from './client'
import { formatResponse, normalizeDocs } from './firebase-helpers'

export const getSchedules = async (owner) => {
  return await db
    .collection('schedules')
    .where('owner.id', '==', owner)
    .get()
    .then(({ docs }) =>
      formatResponse(true, 'GET_SCHEDDULES_SUCCESS', normalizeDocs(docs))
    )
    .catch((err) => formatResponse(true, 'GET_SCHEDDULES_FAIL', err))
}

export const updateSchedule = async ({ owner, schedule, coach }) => {
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
          .update({ schedule, coach })
          .then((res) => formatResponse(true, 'SCHEDULE_UPDATED', res))
          .catch((err) => formatResponse(false, 'ERROR_UPDATING_SCHEDULE', res))
      } else {
        return db
          .collection('schedules')
          .add({ schedule, owner, coach })
          .then((res) =>
            formatResponse(true, 'SCHEDULE_CREATED', { id: res.id })
          )
          .catch((err) => formatResponse(false, 'ERROR_CREATING_SCHEDULE', err))
      }
    })
}

export const getAthletesBySchedule = async (coachId, schedule, date) => {
  const day = getDay(date)
  return db
    .collection('schedules')
    .where('coach.id', '==', coachId)
    .where(`schedule.${day}`, 'array-contains', schedule)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log(`err`, err))
}
