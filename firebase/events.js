import firebase from 'firebase/app'
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
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}
export const getPublicEvents = async () => {
  return await db
    .collection('events')
    .where('publicEvent', '==', true)
    .orderBy('date', 'desc')
    /* 
    .limit(10) */
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}

export const getEvent = async (id) => {
  return await db
    .collection('events')
    .doc(id)
    .get()
    .then((res) => normalizeDoc(res))
    .catch((err) => console.log('err', err))
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
    .where('participants', 'array-contains', athleteId)
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

export const updateEvent = async (event) => {
  return await _update_event(event)
}

export const athleteRequestJoinEvent = async (eventId, athleteId) => {
  return await _update_event({
    id: eventId,
    requests: firebase.firestore.FieldValue.arrayUnion(athleteId)
  })
}
export const athleteJoinEvent = async (eventId, athleteId) => {
  await _update_event({
    id: eventId,
    requests: firebase.firestore.FieldValue.arrayRemove(athleteId),
    participants: firebase.firestore.FieldValue.arrayUnion(athleteId)
  })
}
export const athleteUnjoinEvent = async (eventId, athleteId) => {
  await _update_event({
    id: eventId,
    requests: firebase.firestore.FieldValue.arrayRemove(athleteId),
    participants: firebase.firestore.FieldValue.arrayRemove(athleteId)
  })
}
export const athleteCancelEventRequest = async (eventId, athleteId) => {
  await _update_event({
    id: eventId,
    requests: firebase.firestore.FieldValue.arrayRemove(athleteId)
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
