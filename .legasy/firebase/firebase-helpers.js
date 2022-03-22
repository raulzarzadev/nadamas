import { mFirebase } from '.'

export const formatResponse = (ok, type, res) => {
  return { type, ok, res }
}
export const normalizeDoc = (doc) => {
  if (!doc?.exists) return null // The document  not exist
  const data = doc.data()
  const id = doc.id

  const { updatedAt, registryDate, createdAt, date, birth, joinedAt } = data
  const dates = unfierebazeDates({
    updatedAt,
    registryDate,
    joinedAt,
    createdAt,
    birth,
    date
  })
  return {
    id,
    ...data,
    ...dates
  }
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

export const datesToFirebaseFromat = ({
  birth,
  registryDate,
  createdAt,
  date,
  updatedAt
}) => {
  const foramtedDates = {}
  if (birth) foramtedDates.birth = dateToFirebaseFormat(birth)
  if (date) foramtedDates.date = dateToFirebaseFormat(date)
  if (createdAt) foramtedDates.createdAt = dateToFirebaseFormat(createdAt)
  if (updatedAt) foramtedDates.updatedAt = dateToFirebaseFormat(updatedAt)
  if (registryDate)
    foramtedDates.registryDate = dateToFirebaseFormat(registryDate)
  return foramtedDates
}

export const dateToFirebaseFormat = (date) =>
  mFirebase.firestore.Timestamp.fromDate(new Date(date)) || null

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
