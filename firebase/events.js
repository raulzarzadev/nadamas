import { subDays } from 'date-fns'
import firebase from 'firebase/app'
import 'firebase/firestore'
import { db } from './client'
import {
  datesToFirebaseFromat,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

export const getEvents = async (ownerId) => {
  return await db
    .collection('events')
    .where('owner.id', '==', ownerId)
    .orderBy('date', 'asc')
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}
export const getPublicEvents = async () => {
  return await db
    .collection('events')
    .where('publicEvent', '==', true)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}

export const getUpcomingEvents = async () => {
  return await db
    .collection('events')
    .where('publicEvent', '==', true)
    .orderBy('date', 'asc')
    .startAt(new Date(subDays(new Date(), 1)))
    .limit(10)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}


export const getEvent = async (id, dispatch) => {
  return db
    .collection('events')
    .doc(id)
    .onSnapshot((snapshot) => {
      dispatch(normalizeDoc(snapshot))
    })
  /* .get()
    .then((res) => normalizeDoc(res))
    .catch((err) => console.log('err', err)) */
}

export const getUserEvents = async (userId) => {
  return await db
    .collection('events')
    .where('userId', '==', userId)
    .orderBy('date')
    .limit(20)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}

export const getAthleteEvents = async (athleteId) => {
  return await db
    .collection('events')
    .where('participantsList', 'array-contains', athleteId)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('get_events_err', err))
}

export const createOrUpdateEvent = async (event) => {
  // search
  const { id } = event
  if (id) {
    //update
    return _update_event(event)
  } else {
    //create
    return _create_event(event)
  }
}
export const removeEvent = async (eventId) => {
  return await _remove_event(eventId)
}

export const getEventResults = async (eventId) => {
  return await db
    .collection('results')
    .where('event.id', '==', eventId)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log(`err`, err))
}
export const addEventResult = async ({ eventData, athleteData, test }) => {
  return await db
    .collection('results')
    .add({
      event: { ...eventData },
      athlete: {
        ...athleteData
      },
      test
    })
    .then((res) => formatResponse(true, ' RESULT_CREATED', res))
    .catch((err) => formatResponse(false, 'ERROR_CREATING_RESULT', err))
}
export const removeEventResult = async (id) => {
  return await db
    .collection('results')
    .doc(id)
    .delete()
    .then((res) => formatResponse(true, ' RESULT_DELETED', res))
    .catch((err) => formatResponse(false, 'ERROR_DELETE_RESULT', err))
}
export const updateAwardsEventResult = async (resultId, awards) => {
   return await db
    .collection('results')
    .doc(resultId)
    .update({ 'test.awards':awards })
    .then((res) => formatResponse(true, ' AWARD_ADDED', res))
    .catch((err) => formatResponse(false, 'ERROR_AWARD', err)) 
}
export const updateEvent = async (event) => {
  return await _update_event(event)
}

export const athleteSendRequestEvent = async (eventId, athleteId) => {
  return await _update_event({
    id: eventId,
    requests: firebase.firestore.FieldValue.arrayUnion(athleteId)
  })
}

const getParticipantNumber = async (eventId) => {
  return await db
    .collection('events')
    .doc(eventId)
    .get()
    .then((res) => {
      const data = res.data()
      return data.currentNumber || 0
    })
    .catch((err) => console.log(`err`, err))
}
export const athleteAcceptRequestEvent = async (eventId, athleteId) => {
  const currentNumber = await getParticipantNumber(eventId)
  return await _update_event({
    id: eventId,
    currentNumber: currentNumber + 1,
    participantsList: firebase.firestore.FieldValue.arrayUnion(athleteId),
    requests: firebase.firestore.FieldValue.arrayRemove(athleteId),
    participants: firebase.firestore.FieldValue.arrayUnion({
      id: athleteId,
      number: currentNumber + 1
    })
  })
}
export const athleteUnjoinEvent = async (eventId, eventAthlete) => {
  await _update_event({
    id: eventId,
    participantsList: firebase.firestore.FieldValue.arrayRemove(athleteId),
    requests: firebase.firestore.FieldValue.arrayRemove(eventAthlete.id),
    participants: firebase.firestore.FieldValue.arrayRemove(eventAthlete)
  })
}
export const athleteCancelEventRequest = async (eventId, athleteId) => {
  await _update_event({
    id: eventId,
    requests: firebase.firestore.FieldValue.arrayRemove(athleteId)
  })
}

export const addEventTest = async ({ eventId, test }) => {
  return await _update_event({
    id: eventId,
    tests: firebase.firestore.FieldValue.arrayUnion(test)
  })
}
export const removeEventTest = async ({ eventId, test }) => {
  return await _update_event({
    id: eventId,
    tests: firebase.firestore.FieldValue.arrayRemove(test)
  })
}

const _update_event = async (event) => {
  return await db
    .collection('events')
    .doc(event.id)
    .update({ ...event, ...datesToFirebaseFromat(event) })
    .then((res) => formatResponse(true, 'EVENT_UPDATED', res))
    .catch((err) => formatResponse(false, 'ERROR_UPDATING_EVENT', err))
}

const _remove_event = async (eventId) => {
  return await db
    .collection('events')
    .doc(eventId)
    .delete()
    .then((res) => formatResponse(true, 'EVENT_DELETED', res))
    .catch((err) => formatResponse(false, 'ERROR_DELETING_EVENT', err))
}

const _create_event = async (event) => {
  return await db
    .collection('events')
    .add({ ...event, ...datesToFirebaseFromat(event) })
    .then((res) => formatResponse(true, 'EVENT_CREATED', res))
    .catch((err) => formatResponse(false, 'ERROR_CREATING_EVENT', err))
}
