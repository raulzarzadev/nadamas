import { format as fnsFormat, utcToZonedTime } from 'date-fns-tz'
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
  console.log('FORMAT DATE', date.toString())
  
  const newDate = utcToZonedTime(date, 'America/Los_Angeles')
  return fnsFormat(newDate, formatStr, {
    locale: es // or global.__localeId__
  })
}
export function formatInputDate(date) {
  return format(date, 'yyy-MM-dd')
}
