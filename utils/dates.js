import { format, formatDistance } from 'date-fns'
import { es } from 'date-fns/locale'

export const dateFormat = (date = new Date(), output = 'yyyy-MM-dd') => {
  // *** the format have some strong dependencies for render properly the inputs and others formats ***
  const aux_date = new Date(date)
  const day = aux_date.getUTCDate()
  const month = aux_date.getUTCMonth() + 1
  const year = aux_date.getUTCFullYear()
  const date_string = `${year}-${month}-${day}`

  const date_formated = format(new Date(date_string), output, { locale: es })
  return date_formated
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
