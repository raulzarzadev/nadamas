//@ts-check
import { addMinutes, format as fnsFormat, formatDistance, subMinutes } from 'date-fns'
import { getTimezoneOffset, utcToZonedTime } from 'date-fns-tz'

import { es } from 'date-fns/locale'
import { Timestamp } from 'firebase/firestore'

/* export const dateFormat = (date, output = 'yyyy-MM-dd') => {
  if (!date) throw new Error('date is required')
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
} */


export const format = (date, stringFormat = 'dd/MM/yy') => {
  const objectDate = new Date(date)
  function isValidDate(d) {
    return d instanceof Date && !isNaN(d)
  }

  if (isValidDate(objectDate)) {
    return fnsFormat(new Date(objectDate.setMinutes(objectDate.getMinutes() + objectDate.getTimezoneOffset())), stringFormat)
  } else {
    return console.error('date is not valid date')
  }

}



export const dateFormat = (date, output = 'yyyy-MM-dd') => {
 //  console.log(date);
  // @ts-ignore
  Date.prototype.isValid = function () {
    // An invalid date object returns NaN for getTime() and NaN is the only
    // object not strictly equal to itself.
    return this.getTime() === this.getTime();
  };
  let time
  if (!date) return fnsFormat(new Date(), output, { locale: es })

  if (date instanceof Timestamp) {
    time = date.toDate()
    // @ts-ignore
  } else if (new Date(date).isValid()) {
    time = new Date(date)
  } else {
    console.log('no paso a nada ', date);
    time = new Date()
  }

  const COMPENZATION_TIME_ZONE_IN_MINUTES = new Date().getTimezoneOffset() + 60

  // console.log(getTimezoneOffset('America/Mazatlan', time));
  const timezoneAdded = addMinutes(time, COMPENZATION_TIME_ZONE_IN_MINUTES)

  const formated = time && fnsFormat(timezoneAdded, output, { locale: es })
  return formated

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
