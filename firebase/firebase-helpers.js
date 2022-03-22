import { Timestamp } from 'firebase/firestore'

export const formatResponse = (ok = false, type = 'TYPE', res = {}) => {
  return { type, ok, res }
}
export const normalizeDoc = (doc) => {
  if (!doc?.exists) return null // The document  not exist
  const data = doc.data()
  const id = doc.id
  return {
    id,
    ...data
  }
}

export const normalizeSnapshot = (snapshot) => {
  if (snapshot.docs) {
    return snapshot.docs.map((doc) => {
      return { ...doc.data(), id: doc.id }
    })
  }
  return { ...snapshot.data(), id: snapshot.id }
}

export const unfierebazeDate = (date) => (date ? date?.toMillis() : null)
export const unfierebazeDates = (dates = {}) => {
  let aux = {}
  for (const date in dates) {
    if (dates[date]) {
      aux = {
        ...aux,
        [date]: dates[date] ? unfierebazeDate(dates[date]) : null
      }
    }
  }
  return aux
}

export const normalizeDocs = (docs = []) =>
  docs?.map((doc) => normalizeDoc(doc))

export const datesToFirebaseFromat = ({ document = null }) => {
  const AUX_DOCUMENT = {}
  const DATE_FIELDS = [
    'birth',
    'date',
    'createdAt',
    'updatedAt',
    'finishAt',
    'startAt',
    'registryDate',
    'publishEnds',
    'publishStart'
  ]
  if (!document) return 'no document'
  if (typeof document !== 'object') {
    return 'is not an object'
  }
  Object.keys(document).forEach((key) => {
    AUX_DOCUMENT[key] = document[key]

    if (DATE_FIELDS.includes(key)) {
      AUX_DOCUMENT[key] = new Date(AUX_DOCUMENT[key]).toString()
    }

    if (typeof document[key] === 'object') {
      // HAZLO RECURSIVO
      AUX_DOCUMENT[key] = datesToFirebaseFromat({
        document: document[key]
      })
    }
    if (DATE_FIELDS.includes(key)) {
      const aux = dateToFirebaseFormat(document[key])
      AUX_DOCUMENT[key] = aux
    }
  })
  return AUX_DOCUMENT
}

export const dateToFirebaseFormat = (date) =>
Timestamp.fromDate(new Date(date)) || null

export const mapUserFromFirebase = (user) => {
  const { email, displayName, photoURL } = user
  return {
    joinedAt: dateToFirebaseFormat(new Date()),
    email,
    name: displayName,
    image: photoURL,
    id: user.uid
  }
}
