import { Timestamp } from 'firebase/firestore'
import { format as fns_format } from 'date-fns'
import { dateFormat } from '@/utils/dates'

export const formatResponse = (ok, type, res) => {
  return { type, ok, res }
}
export const normalizeDoc = (doc) => {
  if (!doc?.exists()) return null // The document  not exist
  const data = doc.data()
  const id = doc.id
  const res = deepFormatDocumentDates(data, { format: 'millis' })
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

const DATE_FIELDS = [
  'birth',
  'date',
  'createdAt',
  'updatedAt',
  'finishAt',
  'joinedAt',
  'startAt',
  'registryDate',
  'publishEnds',
  'publishStart',
  'lastUpdate'
]
// TODO make sure that this wotks in both cases
export const deepFormatDocumentDates = (
  object,
  { format = 'firebase' } = {}
) => {
  const transformDateToMs = (date) => {
    if (typeof date === 'number') return date
    if (typeof date === 'string') return new Date(date).getTime()
    if (date instanceof Date) return date.getTime()
    return date?.toMillis()
  }

  const AUX_OBJ = { ...object }
  Object.keys(object).forEach((key) => {
    if (DATE_FIELDS.includes(key)) {
      const firebaseDate = object[key]

      format === 'millis' &&
        (AUX_OBJ[key] = dateFormat(transformDateToMs(firebaseDate)))

      format === 'firebase' &&
        (AUX_OBJ[key] = Timestamp.fromDate(new Date(object[key])))
    }
    if (typeof object[key] === 'object') {
      // ------------------------------ IF IS ARRAY ------------------------------
      if (Array.isArray(object[key])) {
        object[key].map((item) => {
          return deepFormatDocumentDates(item)
        })
      } else {
        deepFormatDocumentDates(object[key])
      }
      // ------------------------------ IF IS OBJECT ------------------------------
    }
  })
  return AUX_OBJ
}

export const normalizeDocs = (docs = []) =>
  docs?.map((doc) => normalizeDoc(doc))

export const dateToFirebaseFormat = (date) =>
  Timestamp.fromDate(new Date(date)) || null

export const mapUserFromFirebase = (user) => {
  console.log(user)
  if(!user) return null
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
