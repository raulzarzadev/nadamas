import {  format, formatDistance } from 'date-fns'
import {  getTimezoneOffset, utcToZonedTime } from 'date-fns-tz'

import { es } from 'date-fns/locale'
import { Timestamp } from 'firebase/firestore'

export const dateFormat = (date = new Date(), output = 'yyyy-MM-dd') => {
  // *** the format have some strong dependencies for render properly the inputs and others formats ***
  let aux_date = null
  if (date instanceof Timestamp) {
    aux_date = new Date(date.toDate())
  } else {
    aux_date = new Date(date)
  }
  if (!aux_date) throw new Error('Invalid date')

  const time = utcToZonedTime(aux_date, getTimezoneOffset())
  return format(time, output, { locale: es })
}

export const dateDistance = (
  fromDate = new Date(),
  toDate = new Date(),
  { ...options }
) => {
  const date_formated = formatDistance(new Date(fromDate), new Date(toDate), {
    locale: es,
    ...options
  })
  return date_formated
}
