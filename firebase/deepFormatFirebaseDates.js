import { Dates } from "firebase-dates-util"


export const deepFormatFirebaseDates = (
  object,
  target = 'number',
) => Dates.deepFormatObjectDates(object, target)
