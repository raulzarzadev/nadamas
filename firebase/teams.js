import firebase from 'firebase/app'
import 'firebase/firestore'
import { db } from './client'
import {
  datesToFirebaseFromat,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

export const getTeam = async (teamId, dispatch) => {
  return db
    .collection('teams')
    .doc(teamId)
    .onSnapshot((snapshot) => {
      dispatch(normalizeDoc(snapshot))
    })
}

export const getTeams = async (userId, coachId, dispatch) => {
  return db
    .collection('teams')
    .where('userId', '==', userId)
    .where('coach.id', '==', coachId)
    .onSnapshot(
      (querySnapshot) => {
        const teams = querySnapshot
          .docChanges()
          .map((change) => normalizeDoc(change.doc))
        dispatch(teams)
      },
      (err) => {
        console.log(`Encountered error: ${err}`)
      }
    )
  /* .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log(err)) */
}

export const getPublicTeams = async () => {
  return await db
    .collection('teams')
    .where('publicTeam', '==', true)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log(err))
}

export const updateTeam = async (team = {}) => {
  // Look for the team
  const teamExist = (await db.collection('teams').doc(team?.id).get()).exists
  if (!teamExist) {
    // if exist create it
    return await _create_team(team)
  } else {
    return await _update_team({ ...team })
  }
}

export const acceptTeamRequest = async (
  teamId,
  athleteId,
  addedByCoach = false
) => {
  const teamRef = db.collection('teams').doc(teamId)
  const teamData = (await teamRef.get()).data()
  const athleteStillWating = teamData?.joinRequests?.includes(athleteId)
  if (athleteStillWating || addedByCoach) {
    await teamRef.update({
      joinRequests: firebase.firestore.FieldValue.arrayRemove(athleteId)
    })
    await teamRef.update({
      athletes: firebase.firestore.FieldValue.arrayUnion(athleteId)
    })
    return formatResponse(true, 'REQUEST_ACCEPTED', { athleteId })
  } else {
    return formatResponse(false, 'REQUEST_RETIRED', { athleteId })
  }
}

export const rejectTeamRequest = async (teamId, athleteId) => {
  const teamRef = db.collection('teams').doc(teamId)

  await teamRef.update({
    joinRequests: firebase.firestore.FieldValue.arrayRemove(athleteId)
  })
  return formatResponse(true, 'REQUEST_REJECTED', { athleteId })
}

export const addJoinRequests = async (teamId, athleteId) => {
  return db
    .collection('teams')
    .doc(teamId)
    .update({
      joinRequests: firebase.firestore.FieldValue.arrayUnion(athleteId)
    })
    .then((res) => formatResponse(true, 'REQUEST_ADDED', res))
    .catch((err) => formatResponse(false, 'ADD_REQUEST_FAIL', err))
}
export const cancelRequest = async (teamId, athleteId) => {
  const teamRef = db.collection('teams').doc(teamId)
  try {
    const res = await teamRef.update({
      joinRequests: firebase.firestore.FieldValue.arrayRemove(athleteId)
    })
    return formatResponse(true, 'REQUEST_CANCEL_SUCCESS', res)
  } catch (err) {
    return formatResponse(false, 'REQUEST_CANCEL_FAIL', err)
  }
}

export const removeTeam = async (teamId) => {
  const eventRef = db.collection('teams').doc(teamId)
  return eventRef
    .delete()
    .then((res) => formatResponse(true, 'TEAM_DELETED', res))
    .catch((err) => formatResponse(false, 'DELETE_ERROR', err))
}

export const unjoinTeam = async (teamId, athleteId) => {
  const teamRef = db.collection('teams').doc(teamId)
  try {
    const res = await teamRef.update({
      athletes: firebase.firestore.FieldValue.arrayRemove(athleteId)
    })
    return formatResponse(true, 'SUCCESSFUL_UNJOIN', res)
  } catch (err) {
    return formatResponse(false, 'UNJOIN_FAIL', err)
  }
}

const _update_team = async (team) => {
  const eventRef = db.collection('teams').doc(team.id)
  const datesInFirebaseFormat = datesToFirebaseFromat(team)
  try {
    await eventRef.update({
      ...team,
      ...datesInFirebaseFormat
    })
    return { ok: true, type: 'TEAM_UPDATED', id: team.id }
  } catch (err) {
    return console.log(err)
  }
}
const _create_team = async (team) => {
  return await db
    .collection('teams')
    .add({
      ...team,
      ...datesToFirebaseFromat(team)
    })
    .then((res) => {
      return { ok: true, type: 'TEAM_CREATED', id: res.id }
    })
    .catch((err) => console.log('err', err))
}
