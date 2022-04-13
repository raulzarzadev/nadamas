import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where
} from 'firebase/firestore'
import { db } from '.'
import {
  deepFormatDocumentDates,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

const createTeam = async (team, user) => {
  return await addDoc(collection(db, 'teams'), {
    ...deepFormatDocumentDates({
      ...team,
      createdAt: new Date(),
      userId: user.id
    })
  })
    .then((res) => formatResponse(true, 'TEAM_CREATED', res))
    .catch((err) => formatResponse(false, 'TEAM_CREATED_ERROR', err))
}
const updateTeam = async (team) => {
  try {
    const res = await updateDoc(doc(db, 'teams', team.id), {
      ...deepFormatDocumentDates({ ...team, updatedAt: new Date() })
    })
    return formatResponse(true, 'TEAM_UPDATED', res)
  } catch (err) {
    return formatResponse(false, 'TEAM_UPDATED_ERROR', err)
  }
}
const getUserTeams = async (userId) => {
  const res = []
  const q = query(collection(db, 'teams'), where('userId', '==', userId))

  const querySnapshot = await getDocs(q)

  querySnapshot.forEach((doc) => {
    res.push({ ...normalizeDoc(doc) })
  })
  return res
}

const listenPublicTeams = async (cb) => {
  const q = query(
    collection(db, 'teams'),
    where('isPublic', '==', true),
    limit(4)
    //orderBy('updatedAt')
  )
  onSnapshot(q, (querySnapshot) => {
    const res = []
    querySnapshot.forEach((doc) => {
      res.push(normalizeDoc(doc))
    })
    cb(res)
  })
}

const getPublicTeams = async () => {
  const res = []
  const q = query(collection(db, 'teams'), where('isPublic', '==', true))

  const querySnapshot = await getDocs(q)

  querySnapshot.forEach((doc) => {
    console.log(doc.id, '=>', doc.data())
    res.push({ ...normalizeDoc(doc) })
  })
  return res
}
const listenTeam = (teamId, cb) => {
  onSnapshot(doc(db, 'teams', teamId), (doc) => {
    cb(normalizeDoc(doc))
  })
}
const getTeam = async (teamId) => {
  const ref = doc(db, 'teams', teamId)
  const docSnap = await getDoc(ref)
  return normalizeDoc(docSnap)
}
const deleteTeam = async (teamId) => {
  try {
    await deleteDoc(doc(db, 'teams', teamId))
    return formatResponse(true, 'TEAM_DELETED')
  } catch (err) {
    return formatResponse(false, 'TEAM_DELETED_ERROR', err)
  }
}

// *** *** *** *** *** *** *** *** *** *** *** *** *** ***
//                                             MEMBERS REQUESTS
// *** *** *** *** *** *** *** *** *** *** *** *** *** ***

const sendRequest = async (teamId, userId) => {
  const ref = doc(db, 'teams', teamId)
  return await updateDoc(ref, {
    joinRequests: arrayUnion(userId)
  })
    .then((res) => formatResponse(true, 'REQUESTS_UPDATED', res))
    .catch((err) => formatResponse(false, 'REQUESTS_UPDATED_ERROR', err))
}

const acceptRequest = async (teamId, userId) => {
  console.log('team, userId', teamId, userId)
  const ref = doc(db, 'teams', teamId)
  return await updateDoc(ref, {
    members: arrayUnion(userId),
    joinRequests: arrayRemove(userId)
  })
    .then((res) => formatResponse(true, 'REQUESTS_ACCEPTED', res))
    .catch((err) => formatResponse(false, 'REQUESTS_ACCEPTED_ERROR', err))
}

const removeRequest = async (teamId, userId) => {
  const ref = doc(db, 'teams', teamId)
  return await updateDoc(ref, {
    joinRequests: arrayRemove(userId)
  })
    .then((res) => formatResponse(true, 'REQUESTS_UPDATED', res))
    .catch((err) => formatResponse(false, 'REQUESTS_UPDATED_ERROR', err))
}



// *** *** *** *** *** *** *** *** *** *** *** *** *** ***
//                                             MEMBERS CRUD
// *** *** *** *** *** *** *** *** *** *** *** *** *** ***

const listenAthleteTeams = (athelteId, cb) => {
  const q = query(
    collection(db, 'teams'),
    where('members', 'array-contains', athelteId),
    limit(4)
    //orderBy('updatedAt')
  )
  onSnapshot(q, (querySnapshot) => {
    const res = []
    querySnapshot.forEach((doc) => {
      res.push(normalizeDoc(doc))
    })
    cb(res)
  })
}
const removeMember = async (teamId, userId) => {
  const ref = doc(db, 'teams', teamId)
  return await updateDoc(ref, {
    members: arrayRemove(userId)
  })
    .then((res) => formatResponse(true, 'MEMBER_REMOVED', res))
    .catch((err) => formatResponse(false, 'MEMBER_REMOVED_ERROR', err))
}


// *** *** *** *** *** *** *** *** *** *** *** *** *** ***
//                                             TEAM FUNTIONS
// *** *** *** *** *** *** *** *** *** *** *** *** *** ***

export {
  createTeam,
  updateTeam,
  getUserTeams,
  deleteTeam,
  getTeam,
  getPublicTeams,
  listenPublicTeams,
  listenTeam,
  listenAthleteTeams
}


// *** *** *** *** *** *** *** *** *** *** *** *** *** ***
//                                             MEMBER FUNTIONS
// *** *** *** *** *** *** *** *** *** *** *** *** *** ***


export { sendRequest, acceptRequest, removeRequest, removeMember }
