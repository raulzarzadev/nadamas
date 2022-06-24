import { Dates } from "firebase-dates-util"


export const deepFormatFirebaseDates = (
  object,
  target = 'firebase',
) => Dates.deepFormatObjectDates(object, target)
