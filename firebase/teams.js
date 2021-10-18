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
    .where('coach', '==', coachId)
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
