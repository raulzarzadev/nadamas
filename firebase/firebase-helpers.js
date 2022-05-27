import { dateFormat } from '@/utils/dates'
import { Timestamp } from 'firebase/firestore'
import { deepFormatFirebaseDates } from './deepFormatFirebaseDates.js'


export const formatResponse = (ok, type, res) => {
  if (!ok) throw new Error(type)
  const formatedType = type.toUpperCase().slice(0, -1)
  return { type: formatedType, ok, res }
}
export const normalizeDoc = (doc) => {
  if (!doc?.exists()) return null // The document  not exist
  const data = doc.data()
  const id = doc.id

  const res = deepFormatFirebaseDates(data, 'fieldDate')

  return {
    id,
    ...res
  }
}

export const unfierebazeDate = (date, from) => {
  return date ? date?.toMillis() : null
}

export const unfierebazeDates = (dates = {}) => {
  let aux = {}
  for (const date in dates) {
    if (dates[date]) {
      aux = {
        ...aux,
        [date]: dates[date] ? unfierebazeDate(dates[date], 'dates') : null
      }
    }
  }
  return aux
}



export const normalizeDocs = (docs = []) =>
  docs?.map((doc) => normalizeDoc(doc))

export const dateToFirebaseFormat = (date) => {
  return Timestamp.fromDate(new Date(date)) || null
}
export const mapUserFromFirebase = (user) => {
  if (!user) return null
  const { email, displayName, photoURL, phoneNumber } = user
  return {
    joinedAt: dateToFirebaseFormat(new Date()),
    email,
    displayName,
    name: displayName,
    contact: {
      email,
      phone: phoneNumber
    },
    image: photoURL,
    id: user.uid
  }
}
