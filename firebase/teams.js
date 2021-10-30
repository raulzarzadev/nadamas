import firebase from 'firebase/app'
import 'firebase/firestore'
import { db } from './client'
import {
  datesToFirebaseFromat,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

export const getTeam = async (teamId) => {
  return db
    .collection('teams')
    .doc(teamId)
    .get()
    .then((doc) => normalizeDoc(doc))
    .catch((err) => null)
}

export const getTeams = async (userId, coachId) => {
  return await db
    .collection('teams')
    .where('userId', '==', userId)
    .where('coach.id', '==', coachId)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log(err))
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

export const acceptTeamRequest = async (teamId, requestId) => {
  const teamRef = db.collection('teams').doc(teamId)
  await teamRef.update({
    joinRequests: firebase.firestore.FieldValue.arrayRemove(requestId)
  })
  await teamRef.update({
    athletes: firebase.firestore.FieldValue.arrayUnion(requestId)
  })
  return { ok: true, type: 'REQUEST_ACCEPTED' }
}

const _update_team = async (team) => {
  const { joinRequests } = team
  const eventRef = db.collection('teams').doc(team.id)
  const datesInFirebaseFormat = datesToFirebaseFromat(team)
  try {
    await eventRef.update({
      joinRequests: firebase.firestore.FieldValue.arrayUnion(joinRequests),
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
