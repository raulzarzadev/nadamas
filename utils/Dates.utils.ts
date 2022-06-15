import { format as fnsFormat, formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'

export class Dates {
  constructor(
  ) { }
  
  static format = (date: string | number | Date, stringFormat = 'dd/MM/yy'): string => {

    if (!date) {
      console.error('not a date')
      return 'NaD'
    }
    const objectDate = new Date(date)
    function isValidDate(d: string | number | Date): boolean {
      return d instanceof Date && !isNaN(d as any)
    }

    if (isValidDate(objectDate)) {
      return fnsFormat(new Date(objectDate.setMinutes(objectDate.getMinutes() + objectDate.getTimezoneOffset())), stringFormat, { locale: es })
    } else {
      console.error('date is not valid date')
      return 'NaD'
    }

  }

  static fromNow = (date: string | number | Date): string => {
    const objectDate = new Date(date)
    function isValidDate(d: string | number | Date): boolean {
      return d instanceof Date && !isNaN(d as any)
    }

    if (isValidDate(objectDate)) {
      return formatDistanceToNowStrict(objectDate, {
        locale: es,
        roundingMethod: 'floor',
        addSuffix: true,
      })
    } else {
      console.error('date is not valid date')
      return 'NaD'
    }
  }

}
