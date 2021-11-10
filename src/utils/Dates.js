import {
  addDays,
  addHours,
  format as fnsFormat,
  formatDistanceStrict,
  formatDistanceToNowStrict,
  toDate
} from 'date-fns'
import { es } from 'date-fns/locale'

export const dayLabels = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sabado'
]
export const format = (date = new Date(), formatStr = 'PP') => {
  return fnsFormat(new Date(date), formatStr, { locale: es })
  /*   const newDate = zonedTimeToUtc(date, 'America/Los_Angeles')
  return fnsFormat(newDate, formatStr, {
    locale: es // or global.__localeId__
  }) */
}
export function formatInputDate(date = new Date(), format = 'yyy-MM-dd') {
  return fnsFormat(addHours(new Date(date), 7), format, { locale: es })
}

export function getAge(date = null) {
  if(!date) return 'sin'
  return formatDistanceToNowStrict(date, { locale: es })
}

export function simpleDate(date = new Date()) {
  const dateDay = date.getDate()
  const dateMonth = date.getMonth()
  const dateYear = date.getFullYear()
  return new Date(dateYear, dateMonth, dateDay)
}
