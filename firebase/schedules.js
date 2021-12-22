import { db } from '.'
import { getDay } from 'date-fns'
import { formatResponse, normalizeDoc, normalizeDocs } from './firebase-helpers'

export const getSchedules = async (athleteId) => {
  return await db
    .collection('schedules')
    .where('athleteId', '==', athleteId)
    .get()
    .then(({ docs }) =>
      formatResponse(true, 'GET_SCHEDULES_SUCCESS', normalizeDocs(docs))
    )
    .catch((err) => formatResponse(true, 'GET_SCHEDULES_FAIL', err))
}

export const getCoachSchedule = async ({ coachId }) => {
  return await db
    .collection('schedules')
    .where('owner.id', '==', coachId)
    .get()
    .then(({ docs }) =>
      formatResponse(true, 'GET_SCHEDULE_SUCCESS', normalizeDoc(docs[0]))
    )
    .catch((err) => formatResponse(true, 'GET_SCHEDULES_FAIL', err))
}

export const updateSchedule = async ({
  schedule,
  coach,
  athleteId = null,
  owner = null
}) => {
  const ownerData = { id: owner.id || null, name: owner.name || null }
  console.log(
    `coach, schedule, athleteId,owner`,
    coach,
    schedule,
    athleteId,
    owner
  )
  return db
    .collection('schedules')
    .where('athleteId', '==', athleteId)
    .get()
    .then(({ docs }) => {
      const scheduleExists = !!docs[0]?.exists
      if (scheduleExists) {
        return _updateSchedule(docs[0].id, {
          schedule,
          coach: coach,
          athleteId,
          owner: ownerData
        })
      } else {
        return _createSchedule({
          schedule,
          coach,
          athleteId,
          owner: ownerData
        })
      }
    })
}

export const addSchedule = async ({
  owner,
  coach = null,
  athleteId = null,
  schedule = []
}) => {
  
  const ownerData = owner ? { id: owner?.id, name: owner?.name } : null
  const scheduleExist = await db
    .collection('schedules')
    .where('owner.id', '==', owner?.id)
    .get()
    .then((res) => (res.docs[0]?.exists ? res.docs[0].id : false))
    .catch((err) => console.log(`err`, err))
  if (scheduleExist) {
    _updateSchedule(scheduleExist, {
      schedule,
      athleteId,
      coach,
      owner: ownerData
    })
  } else {
    _createSchedule({
      schedule,
      athleteId,
      coach,
      owner: ownerData
    })
  }
}

const _updateSchedule = async (scheduleId = '', schedule) => {
  return db
    .collection('schedules')
    .doc(scheduleId)
    .update(schedule)
    .then((res) => formatResponse(true, 'SCHEDULE_UPDATED', res))
    .catch((err) => formatResponse(false, 'ERROR_UPDATING_SCHEDULE', res))
}

const _createSchedule = async (schedule) => {
  return db
    .collection('schedules')
    .add(schedule)
    .then((res) => formatResponse(true, 'SCHEDULE_CREATED', { id: res.id }))
    .catch((err) => formatResponse(false, 'ERROR_CREATING_SCHEDULE', err))
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
