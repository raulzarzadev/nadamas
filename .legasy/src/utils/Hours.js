export const formatTimeToObject = ({ time = '--:--:--.---' }) => {
  const res = {
    /* hours: Number,
    minutes: Number,
    seconds: Number,
    ms: Number */
  }
  const arr = time?.split(/[:.]/)

  arr[0] ? (res.hours = arr[0]) : '--'
  arr[1] ? (res.minutes = arr[1]) : '--'
  arr[2] ? (res.seconds = arr[2]) : '--'
  arr[3] ? (res.ms = arr[3]) : '---'

  return res
}

export const formatObjectTimeToString = ({ time }) => {
  /* 
time = {
  hours:0,
  minutes:0,
  seconds:0,
  ms:0,
} */

  if (typeof time === 'string') return time
  const hours = time.hours <= 9 ? `0${time.hours}` : time.hours
  let minutes = time.minutes <= 9 ? `0${time.minutes}` : time.minutes
  if(!time.minutes){
    minutes = '00'
  }
  let res = `${hours || '--'}:${minutes || '--'}`
  return res
}
