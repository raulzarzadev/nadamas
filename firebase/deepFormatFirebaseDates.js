import { format } from "@/utils/dates"
import { Timestamp } from "firebase/firestore"

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
const TARGETS = ['firebase', 'milliseconds', 'date','fieldDate']

export function deepFormatFirebaseDates(
  object,
  target = 'firebase',
) {
  if (!TARGETS.includes(target)) return console.error('target must be one of:', TARGETS)
  // target is firebase transform to Timestamp
  // target is milis transform to milis
  // target is date transofrm to Date
  // target is fieldDate transform to yyyy-mm-dd

  const transformAnyToDate = (date) => {
    if (!date) return null
    if (date instanceof Timestamp) {
      return date.toDate()
    } else if (date instanceof Date) {
      return date
    } else if (typeof date === 'number') {
      return new Date(date)
    } else if (typeof date === 'string') {
      let aux = new Date(date)
      if (isNaN(aux.getTime())) {
        return null
      } else {
        return aux
      }
    }
  }

  const objective = {
    firebase: (date) => Timestamp.fromDate(date),
    milliseconds: (date) => date.getTime(),
    date: (date) => date,
    fieldDate: (date) => format(date, 'yyyy-MM-dd')
  }

  let aux_obj = { ...object }

  Object.keys(aux_obj).forEach(key => {
    const objProperty = object[key]
    if (DATE_FIELDS.includes(key)) {
      const date = transformAnyToDate(objProperty)
      /* console.log('target', target) */
      const res = date ? (objective[target](date)) : null
      aux_obj[key] = res
      // console.log('res', res);

      // ***************************+RECURSIVO OBJECTS AND ARRAYS
      // if is object
    } else if (typeof objProperty === 'object') {
      deepFormatFirebaseDates(objProperty, target)
      // if is an array
    } else if (Array.isArray(objProperty)) {
      objProperty.map(item => deepFormatFirebaseDates(item, target))
    }
  })

  return { ...aux_obj }
}