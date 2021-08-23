import firebase from 'firebase/app'
import 'firebase/firestore'

import { db } from './client'
import { format } from '@/src/utils/Dates'
import {
  datesToFirebaseFromat,
  dateToFirebaseFormat,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'

export const getAttendanceDate = async (date) => {
  const attendanceDate = new Date(format(date, 'MM-dd-yy'))
  return await db
    .collection('attendance')
    .where('date', '==', attendanceDate)
    .get()
    .then(({ docs }) => normalizeDoc(docs[0]))
    .catch((err) => console.log('attendance_err', err))
}
export const updateAttendanceList = async ({
  date = new Date(),
  attendance = [],
  athleteId = ''
}) => {
  const attendanceDate = new Date(format(date, 'MM-dd-yy'))

  const attendanceRef = await db
    .collection('attendance')
    .where('date', '==', attendanceDate)
    .limit(1)
    .get()
    .then(({ docs }) => {
      return docs.map((doc) => doc.id)?.[0]
    })

  if (attendanceRef) {
    const attendanceList = db.collection('attendance').doc(attendanceRef)
    const attendanceListIncludesThisAthlete = await attendanceList
      .get()
      .then((res) => {
        const doc = res.data()
        return doc.attendance.includes(athleteId)
      })
      .catch((err) => console.log('err', err))

    if (attendanceListIncludesThisAthlete) {
      // borrar si lo incluye
      console.log('borrar')
      return await attendanceList
        .update({
          attendance: firebase.firestore.FieldValue.arrayRemove(athleteId)
        })
        .then((res) => formatResponse(true, 'ATTENDANCE_LIST_UPDATED', res))
        .catch((err) => console.log(err))
    } else {
      console.log('agregar')
      return await attendanceList
        .update({
          attendance: firebase.firestore.FieldValue.arrayUnion(athleteId)
        })
        .then((res) => formatResponse(true, 'ATTENDANCE_LIST_UPDATED', res))
        .catch((err) => console.log('err', err))
      //  escribir si no
    }
  } else {
    console.log('not exist')
    return await db
      .collection('attendance')
      .add({
        attendance: [athleteId],
        date: dateToFirebaseFormat(attendanceDate)
      })
      .then((res) => formatResponse(true, 'ATTENDANCE_LIST_CREATED', res))
      .catch((err) => console.log('err', err))
  }
}



const _create_attendanceList = async (attendanceList) => {
  return await db
    .collection('attendance')
    .add({
      ...attendanceList,
      ...datesToFirebaseFromat(attendanceList)
    })
    .then((res) => {
      return { ok: true, type: 'ATTENDANCE_LIST_CREATED', res }
    })
    .catch((err) => console.log('err', err))
}

const _update_attendanceList = async ({ ref, attendance }) => {
  return await db
    .collection('attendance')
    .doc(ref)
    .update({ attendance })
    .then((res) => console.log('res', res))
    .catch((err) => console.log('err', err))
}
