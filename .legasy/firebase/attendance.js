import { db, mFirebase } from '.'

import { format, simpleDate } from '@/legasy/src/utils/Dates'
import {
  datesToFirebaseFromat,
  dateToFirebaseFormat,
  formatResponse,
  normalizeDoc,
  normalizeDocs
} from './firebase-helpers'
import { lastDayOfMonth, startOfMonth } from 'date-fns'

export const getAttendanceDate = async (date, schedule, dispatch) => {
  const attendanceDate = simpleDate(date)
  return db
    .collection('attendance')
    .where('date', '==', attendanceDate)
    .where('schedule', '==', schedule)
    .onSnapshot(
      (querySnapshot) => {
        querySnapshot.docChanges().forEach((change) => {
          dispatch(normalizeDoc(change.doc))
        })
      },
      (err) => {
        console.log(`Encountered error: ${err}`)
      }
    )
  /*. get()
    .then(({ docs }) => normalizeDoc(docs[0]))
    .catch((err) => console.log('attendance_err', err))  */
}

export const getMonthAttendance = (date = new Date(), dispatch) => {
  return db
    .collection('attendance')
    .orderBy('date')
    .startAfter(startOfMonth(date))
    .endAt(lastDayOfMonth(date))
    .get()
    .then(({ docs }) => normalizeDocs(docs))
    .catch((err) => console.log('err', err))
}

export const updateAttendanceList = async ({
  date = new Date(),
  schedule,
  notes = null,
  athleteId = null
}) => {
  const attendanceDate = simpleDate(date)

  const attendanceRef = await db
    .collection('attendance')
    .where('date', '==', attendanceDate)
    .where('schedule', '==', schedule)
    .limit(1)
    .get()
    .then(({ docs }) => {
      return docs.map((doc) => doc.id)?.[0]
    })

  if (attendanceRef) {
    // attendance schedule and date exist
    const attendanceList = db.collection('attendance').doc(attendanceRef)
    if (athleteId) {
      // if athlte id is passed, update the list
      const attendanceListIncludesThisAthlete = await attendanceList
        .get()
        .then((res) => {
          const doc = res.data()
          return doc.attendance.includes(athleteId)
        })
        .catch((err) => console.log('err', err))
      if (attendanceListIncludesThisAthlete) {
        // borrar si lo incluye
        return await attendanceList
          .update({
            attendance: mFirebase.firestore.FieldValue.arrayRemove(athleteId)
          })
          .then((res) => formatResponse(true, 'ATTENDANCE_LIST_UPDATED', res))
          .catch((err) => console.log(err))
      } else {
        return await attendanceList
          .update({
            attendance: mFirebase.firestore.FieldValue.arrayUnion(athleteId)
          })
          .then((res) => formatResponse(true, 'ATTENDANCE_LIST_UPDATED', res))
          .catch((err) => console.log('err', err))
        //  escribir si no
      }
    }
    // how ever if notes is pased update notes
    if (notes) {
      attendanceList
        .update({ notes })
        .then((res) => console.log('res', res))
        .catch((err) => console.log('err', err))
    }
  } else {
    return await db
      .collection('attendance')
      .add({
        attendance: [athleteId],
        schedule,
        date: dateToFirebaseFormat(attendanceDate)
      })
      .then((res) => formatResponse(true, 'ATTENDANCE_LIST_CREATED', res))
      .catch((err) => console.log('err', err))
  }
}
