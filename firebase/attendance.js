import { format } from '@/src/utils/Dates'
import { db } from './client'
import {
  datesToFirebaseFromat,
  formatResponse,
  normalizeDoc
} from './firebase-helpers'

export const getAttendanceDate = async (date) => {
  const attendanceDate = new Date(format(date, 'dd-MMMM-yy'))
  return await db
    .collection('attendance')
    .where('date', '==', attendanceDate)
    .get()
    .then(({ docs }) => normalizeDoc(docs[0]))
    .catch((err) => console.log('attendance_err', err))
}
export const updateAttendanceList = async ({
  date = new Date(),
  attendance = []
}) => {
  const attendanceDate = new Date(format(date, 'dd-MMMM-yy'))

  const attendanceListDayExist = await db
    .collection('attendance')
    .where('date', '==', attendanceDate)
    .get()
    .then((res) => formatResponse(true, 'ATTENDANCE_LIST_ALREADY_EXIST', res))
    .catch((err) => formatResponse(false, 'ATTENDANCE_LIST_ERROR', err))
  const attendanceRef = attendanceListDayExist?.docs[0]?.id
  if (attendanceListDayExist.empty) {
    // if exist create it
    return await _create_attendanceList({ date: attendanceDate, attendance })
  } else {
    // updated
    return await _update_attendanceList({ ref: attendanceRef, attendance })
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
