import { db } from '.'
import {
  datesToFirebaseFromat,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

export const getRecords = async () => {
  return await db
    .collection('records')
    .orderBy('date')
    .limit(20)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}

export const getRecord = async (id) => {
  return await db
    .collection('records')
    .doc(id)
    .get()
    .then(res=> normalizeDoc(res))
    .catch((err) => console.log('err', err))
}

export const getUserRecords = async (userId) => {
  return await db
    .collection('records')
    .where('userId', '==', userId)
    .orderBy('date')
    .limit(20)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}
export const getAthleteRecords = async (athleteId) => {
  return await db
    .collection('records')
    .where('athleteId', '==', athleteId)
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('get_records_err', err))
}
export const createOrUpdateRecord = async (record) => {
  // search
  const { id } = record

  if (id) {
    //update
    return _update_record(record)
  } else {
    //create
    return _create_record(record)
  }
  // console.log('record', record)

  //const recordRef =  db.collection('records').doc(record?.id).id
  //console.log('recordRef', recordRef)

  // if exist id update
  // else create
  // return await _create_record(record)
}
export const removeRecord = async (recordId) => {
  return await _remove_record(recordId)
}

export const updateRecord = async (record) => {
  return await _update_record(record)
}
const _update_record = async (record) => {
  return await db
    .collection('records')
    .doc(record.id)
    .update({ ...record, ...datesToFirebaseFromat(record) })
    .then((res) => formatResponse(true, 'RECORD_UPDATED', res))
    .catch((err) => console.log('err', err))
}

const _remove_record = async (recordId) => {
  return await db
    .collection('records')
    .doc(recordId)
    .delete()
    .then((res) => formatResponse(true, 'RECORD_DELETED', res))
    .catch((err) => console.log('err', err))
}

const _create_record = async (record) => {
  return await db
    .collection('records')
    .add({ ...record, ...datesToFirebaseFromat(record) })
    .then((res) => {
      return { ok: true, type: 'RECORD_CREATED', res }
    })
    .catch((err) => console.log('err', err))
}
